import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGenerator } from '../lib/chat/generate';
import { createChatHandler } from '../lib/chat/handler';
import { ConversationStore } from '../lib/chat/store';
import { validateRequest } from '../lib/chat/validation';
import type { ChatEvent, ChatRequestOptions, Conversation } from '../types/openrouter';

const options: ChatRequestOptions = {
  model: 'deepseek/deepseek-v4-flash-0731', max_tokens: 2048,
  reasoning: { effort: 'high' },
};
const rawUsage = {
  prompt_tokens: 100, completion_tokens: 50, total_tokens: 150,
  prompt_tokens_details: { cached_tokens: 20, cache_write_tokens: 0 },
  completion_tokens_details: { reasoning_tokens: 30 },
  cost: 0.0000123, cache_discount: -0.000001,
};
const encoder = new TextEncoder();
const frame = (data: unknown) => encoder.encode('data: ' + JSON.stringify(data) + '\n\n');

interface FixtureOptions {
  text?: string;
  finishReason?: string;
  usage?: Record<string, unknown> | null;
  hold?: Promise<void>;
  status?: number;
}

async function setup(t: TestContext, config: FixtureOptions = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'prompt-me-test-'));
  t.after(async () => {
    // Only remove the exact task-created temporary directory.
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('prompt-me-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const requests: Record<string, unknown>[] = [];
  const store = new ConversationStore(directory);
  let aborted = false;
  const provider = createOpenRouter({
    apiKey: 'test-key-not-a-real-secret',
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (config.status) return Response.json({ error: { message: 'sensitive upstream error', code: config.status } }, { status: config.status });
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          let ended = false;
          const abort = () => {
            if (!ended) {
              ended = true;
              aborted = true;
              controller.error(new DOMException('Aborted', 'AbortError'));
            }
          };
          init?.signal?.addEventListener('abort', abort, { once: true });
          if (init?.signal?.aborted) abort();
          if (ended) return;
          controller.enqueue(frame({
            id: 'gen-test', model: options.model,
            choices: [{ index: 0, delta: { role: 'assistant', content: config.text ?? 'Hola 🐧' }, finish_reason: null }],
          }));
          if (config.hold) await config.hold;
          if (ended) return;
          controller.enqueue(frame({
            id: 'gen-test',
            choices: [{ index: 0, delta: {}, finish_reason: config.finishReason ?? 'stop' }],
            ...(config.usage === null ? {} : { usage: config.usage ?? rawUsage }),
          }));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          ended = true;
          init?.signal?.removeEventListener('abort', abort);
          controller.close();
        },
      });
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
    },
  });
  const handler = createChatHandler({ store, generate: createGenerator(provider), configured: () => true });
  return { directory, store, requests, handler, provider, wasAborted: () => aborted };
}

function request(body: unknown, signal?: AbortSignal) {
  return new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
}
async function events(response: Response): Promise<ChatEvent[]> {
  assert.equal(response.status, 200, await (response.status !== 200 ? response.text() : Promise.resolve('')));
  return (await response.text()).trim().split('\n').map(line => JSON.parse(line));
}
function finalEvent(result: ChatEvent[]) {
  const event = result.at(-1)!;
  assert.ok(event.type === 'finish' || event.type === 'error');
  return event;
}

test('text arrives before the final usage, which is preserved in the Markdown log', async t => {
  let finish!: () => void;
  const hold = new Promise<void>(resolve => { finish = resolve; });
  const f = await setup(t, { hold });
  const response = await f.handler(request({ message: 'Hola', options }));
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let received = '';
  while (!received.includes('"type":"text"')) {
    const part = await reader.read();
    assert.equal(part.done, false);
    received += decoder.decode(part.value, { stream: true });
  }
  assert.equal(received.includes('"type":"finish"'), false);
  finish();
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    received += decoder.decode(part.value, { stream: true });
  }
  const result: ChatEvent[] = received.trim().split('\n').map(line => JSON.parse(line));
  const last = finalEvent(result);
  assert.equal(last.type, 'finish');
  assert.deepEqual(last.message.usage, {
    tokens: { inputTokens: 100, outputTokens: 50, totalTokens: 150, reasoningTokens: 30, cachedTokens: 20, cacheWriteTokens: 0 },
    cost: 0.0000123, cacheDiscount: -0.000001,
  });
  assert.equal(last.message.generationId, 'gen-test');
  const restored = await new ConversationStore(f.directory).read(last.conversationId);
  assert.equal(restored.messages[0].role, 'system');
  assert.equal(restored.messages.at(-1)?.content, 'Hola 🐧');
  const markdown = await readFile(path.join(f.directory, last.conversationId + '.md'), 'utf8');
  assert.ok(markdown.includes('0.0000123'));
  assert.ok(!markdown.includes('test-key-not-a-real-secret'));
  assert.equal(f.requests[0].max_tokens, 2048);
  assert.deepEqual(f.requests[0].reasoning, { effort: 'high' });
});

test('missing usage details stay null; a confirmed zero stays zero', async t => {
  const f = await setup(t, { usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost: 0 } });
  const last = finalEvent(await events(await f.handler(request({ message: 'Hola', options }))));
  assert.equal(last.message.usage?.tokens.reasoningTokens, null);
  assert.equal(last.message.usage?.tokens.cachedTokens, null);
  assert.equal(last.message.usage?.cost, 0);
  assert.equal(last.message.usage?.cacheDiscount, null);
});

test('a response without usage never invents accounting', async t => {
  const f = await setup(t, { usage: null });
  const last = finalEvent(await events(await f.handler(request({ message: 'Hola', options }))));
  assert.equal(last.message.usage?.tokens.inputTokens, null);
  assert.equal(last.message.usage?.cost, null);
});

test('restores server history, rejects stale turns and model changes', async t => {
  const f = await setup(t);
  const first = finalEvent(await events(await f.handler(request({ message: 'Primero', options }))));
  const body = { conversationId: first.conversationId, expectedMessageCount: 3, message: 'Segundo', options };
  const second = finalEvent(await events(await f.handler(request(body))));
  assert.equal(second.type, 'finish');
  const sentMessages = f.requests[1].messages as { role: string; content: string }[];
  assert.deepEqual(sentMessages.map(m => m.role), ['system', 'user', 'assistant', 'user']);
  assert.equal(sentMessages[1].content, 'Primero');
  assert.equal((await f.handler(request(body))).status, 409);
  assert.equal((await f.handler(request({
    ...body, expectedMessageCount: 5, options: { model: 'openai/gpt-5.6-luna' },
  }))).status, 409);
  assert.equal(f.requests.length, 2);
  assert.equal((await f.store.list())[0].messageCount, 5);
});

test('preserves Markdown fences, Unicode and metadata-like content verbatim', async t => {
  const text = 'á 🐧\n' + '`'.repeat(4) + 'python\nprint(1)\n' + '`'.repeat(4) + '\n<!-- prompt-me:v1\n-->\n';
  const f = await setup(t, { text });
  const last = finalEvent(await events(await f.handler(request({ message: text, options }))));
  const restored = await new ConversationStore(f.directory).read(last.conversationId);
  assert.equal(restored.messages[1].content, text);
  assert.equal(restored.messages[2].content, text);
  await assert.rejects(() => f.store.read('../.env.local'), /inválido/);
  await assert.rejects(() => f.store.save(restored, true), { code: 'EEXIST' });
});

test('refuses invalid parameters, malformed JSON and missing API key before generation', async t => {
  const f = await setup(t);
  for (const body of [
    { message: ' ', options },
    { message: 'Hola', options: { model: 'unapproved/model' } },
    { message: 'Hola', options: { model: 'openai/gpt-5.6-luna', temperature: 1 } },
    { message: 'Hola', options: { ...options, reasoning: { effort: 'medium' } } },
    { message: 'Hola', options: { model: 'google/gemini-3.7-flash', reasoning: { enabled: false } } },
    { message: 'Hola', options: { model: 'google/gemini-3.7-flash', jsonSchema: { name: 'test', schema: { $async: true, type: 'object' } } } },
  ]) assert.equal((await f.handler(request(body))).status, 400);
  const malformed = await f.handler(new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  }));
  assert.equal(malformed.status, 400);
  const noKey = createChatHandler({ store: f.store, generate: createGenerator(f.provider), configured: () => false });
  assert.equal((await noKey(request({ message: 'Hola', options }))).status, 503);
  assert.equal(f.requests.length, 0);
  assert.deepEqual(await f.store.list(), []);
});

test('a failed initial save prevents any upstream request', async t => {
  const f = await setup(t);
  const invalidDirectory = path.join(f.directory, 'file');
  await writeFile(invalidDirectory, 'not a directory');
  const handler = createChatHandler({
    store: new ConversationStore(invalidDirectory), generate: createGenerator(f.provider), configured: () => true,
  });
  const response = await handler(request({ message: 'Hola', options }));
  assert.equal(response.status, 500);
  assert.match(await response.text(), /No se llamó al modelo/);
  assert.equal(f.requests.length, 0);
});

test('a failed final save emits an error and never reports success', async t => {
  const f = await setup(t);
  class FailingStore extends ConversationStore {
    override async save(conversation: Conversation, create = false) {
      if (!create) throw new Error('disk full');
      return super.save(conversation, create);
    }
  }
  const handler = createChatHandler({
    store: new FailingStore(f.directory), generate: createGenerator(f.provider), configured: () => true,
  });
  const last = finalEvent(await events(await handler(request({ message: 'Hola', options }))));
  assert.equal(last.type, 'error');
  assert.equal(last.saved, false);
  assert.equal(last.message.status, 'error');
  assert.equal((await new ConversationStore(f.directory).read(last.conversationId)).messages.at(-1)?.status, 'interrupted');
});

test('token exhaustion keeps partial output and usage, marked as failed', async t => {
  const f = await setup(t, { text: 'partial', finishReason: 'length' });
  const last = finalEvent(await events(await f.handler(request({ message: 'Hola', options }))));
  assert.equal(last.type, 'error');
  assert.equal(last.message.content, 'partial');
  assert.equal(last.message.usage?.cost, rawUsage.cost);
  assert.equal((await f.store.read(last.conversationId)).messages.at(-1)?.status, 'error');
});

test('provider errors are sanitized and persisted without automatic paid retries', async t => {
  const f = await setup(t, { status: 402 });
  const response = await f.handler(request({ message: 'Hola', options }));
  const result = await events(response);
  const last = finalEvent(result);
  assert.equal(last.type, 'error');
  assert.match(last.message.error!, /crédito/);
  assert.equal(f.requests.length, 1);
  assert.equal(JSON.stringify(result).includes('sensitive upstream error'), false);
  assert.equal(last.message.usage, undefined);
});

test('Claude sends an explicit cache breakpoint on the complete static system context', async t => {
  const f = await setup(t);
  const claude = { model: 'anthropic/claude-haiku-4.5', cache: true, staticContext: 'Contexto fijo '.repeat(5000) };
  const last = finalEvent(await events(await f.handler(request({ message: 'Pregunta variable', options: claude }))));
  assert.equal(last.type, 'finish');
  const messages = f.requests[0].messages as { content: { text: string; cache_control: unknown }[] }[];
  assert.deepEqual(messages[0].content[0].cache_control, { type: 'ephemeral' });
  assert.ok(messages[0].content[0].text.endsWith(claude.staticContext));
});

test('Gemini sends JSON Schema and rejects a response that violates it', async t => {
  const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
  for (const [text, status] of [['{"answer":"ok"}', 'finish'], ['{"answer":42}', 'error'], ['not JSON', 'error']]) {
    const f = await setup(t, { text });
    const last = finalEvent(await events(await f.handler(request({
      message: 'Respondé usando el esquema.',
      options: { model: 'google/gemini-3.7-flash', jsonSchema: { name: 'answer', schema } },
    }))));
    assert.equal(last.type, status);
    assert.deepEqual(f.requests[0].response_format, {
      type: 'json_schema', json_schema: { name: 'answer', schema, strict: true },
    });
    assert.deepEqual(f.requests[0].provider, { require_parameters: true });
  }
});

test('cancellation aborts upstream, saves partial output and releases the conversation lease', async t => {
  let finish!: () => void;
  const hold = new Promise<void>(resolve => { finish = resolve; });
  const f = await setup(t, { hold });
  const abort = new AbortController();
  const response = await f.handler(request({ message: 'Hola', options }, abort.signal));
  const reader = response.body!.getReader();
  let text = '';
  while (!text.includes('"type":"text"')) text += new TextDecoder().decode((await reader.read()).value);
  const start = JSON.parse(text.split('\n')[0]) as Extract<ChatEvent, { type: 'start' }>;
  const concurrent = await f.handler(request({
    conversationId: start.conversationId, expectedMessageCount: 3, message: 'duplicado', options,
  }));
  assert.equal(concurrent.status, 409);
  abort.abort();
  finish();
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    text += new TextDecoder().decode(part.value);
  }
  const last = finalEvent(text.trim().split('\n').map(line => JSON.parse(line)));
  assert.equal(last.type, 'error');
  assert.equal(last.message.status, 'interrupted');
  assert.equal(last.message.content, 'Hola 🐧');
  assert.equal(f.wasAborted(), true);
  const release = f.store.acquire(start.conversationId);
  release();
});

test('invalid stored logs are reported instead of silently dropping evidence', async t => {
  const f = await setup(t);
  const id = randomUUID();
  await writeFile(path.join(f.directory, id + '.md'), '# damaged log');
  await assert.rejects(() => f.store.list(), /dañado/);
  assert.throws(() => validateRequest({ message: 'Hola', options: { ...options, max_tokens: 0 } }));
});