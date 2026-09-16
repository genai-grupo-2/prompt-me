import { randomUUID } from 'node:crypto';
import { SYSTEM_PROMPT } from '@/lib/prompts/system';
import { parseUsage } from '@/lib/utils/usage';
import type { ChatEvent, Conversation, Message } from '@/types/openrouter';
import { generate } from './generate';
import { conversationStore, type ConversationStore } from './store';
import { ChatError, compileOutputSchema, errorResponse, readRequest } from './validation';

interface Dependencies {
  store: ConversationStore;
  generate: typeof generate;
  configured: () => boolean;
}

function providerError(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined;
  if (status === 401 || status === 403) return 'OpenRouter rechazó la clave o los permisos de la cuenta.';
  if (status === 402) return 'La cuenta de OpenRouter no tiene crédito suficiente.';
  if (status === 429) return 'OpenRouter alcanzó el límite de solicitudes. Intentá más tarde.';
  return 'No se pudo completar la respuesta de OpenRouter. Revisá la conexión y la disponibilidad del modelo.';
}

export function createChatHandler(deps: Dependencies) {
  return async function POST(req: Request): Promise<Response> {
    let release: (() => void) | undefined;
    try {
      const input = await readRequest(req);
      if (!deps.configured()) throw new ChatError('Falta OPENROUTER_API_KEY en .env.local. Reiniciá el servidor después de configurarla.', 503);
      if (req.signal.aborted) throw new ChatError('La solicitud fue cancelada.', 408);
      const { options } = input;
      const validateOutput = compileOutputSchema(options);
      const id = input.conversationId ?? randomUUID();
      release = deps.store.acquire(id);
      const now = new Date().toISOString();
      let conversation: Conversation;
      if (input.conversationId) {
        conversation = await deps.store.read(id, true);
        if (conversation.model !== options.model) throw new ChatError('Cambiar el modelo requiere una conversación nueva.', 409);
        if (conversation.messages.length !== input.expectedMessageCount) {
          throw new ChatError('El historial cambió. Recargá la conversación antes de enviar otro mensaje.', 409);
        }
        if (conversation.messages.at(-1)?.status !== 'complete') {
          throw new ChatError('El intento anterior quedó incompleto. Iniciá una conversación nueva; el log anterior se conserva.', 409);
        }
        const firstOptions = conversation.messages.find(m => m.options)?.options;
        if ((firstOptions?.staticContext ?? '') !== (options.staticContext ?? '')) {
          throw new ChatError('Cambiar el contexto estático requiere una conversación nueva.', 409);
        }
      } else {
        conversation = {
          version: 1, id, model: options.model, title: input.message.replace(/\s+/g, ' ').slice(0, 80),
          createdAt: now, updatedAt: now,
          messages: [{
            id: randomUUID(), role: 'system', status: 'complete', createdAt: now,
            content: SYSTEM_PROMPT.trim() + (options.staticContext ? `\n\n${options.staticContext}` : ''),
          }],
        };
      }
      const assistant: Message = {
        id: randomUUID(), role: 'assistant', content: '', createdAt: now, status: 'streaming', options,
      };
      conversation.messages.push({ id: randomUUID(), role: 'user', content: input.message, createdAt: now, status: 'complete' }, assistant);
      conversation.updatedAt = now;
      try { await deps.store.save(conversation, !input.conversationId); }
      catch { throw new ChatError('No se pudo guardar el intento en logs/. No se llamó al modelo.', 500); }

      const upstream = new AbortController();
      const onAbort = () => upstream.abort();
      req.signal.addEventListener('abort', onAbort, { once: true });
      if (req.signal.aborted) upstream.abort();
      const unlock = release;
      release = undefined; // The stream now owns the write lease.
      let connected = true;
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: ChatEvent) => {
            if (connected) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          };
          let failure: string | undefined;
          let persistenceFailed = false;
          let lastCheckpoint = Date.now();
          try {
            send({ type: 'start', conversationId: id, messageId: assistant.id });
            upstream.signal.throwIfAborted();
            const result = deps.generate(conversation, options, upstream.signal);
            for await (const part of result.fullStream) {
              if (part.type === 'text-delta') {
                assistant.content += part.text;
                send({ type: 'text', text: part.text });
                if (Date.now() - lastCheckpoint >= 1000) {
                  conversation.updatedAt = new Date().toISOString();
                  try { await deps.store.save(conversation); }
                  catch {
                    persistenceFailed = true;
                    upstream.abort();
                    throw new Error('Checkpoint failed');
                  }
                  lastCheckpoint = Date.now();
                }
              } else if (part.type === 'finish-step') {
                assistant.usage = parseUsage(part.usage, part.providerMetadata);
                assistant.finishReason = part.finishReason;
                assistant.generationId = part.response.id;
              } else if (part.type === 'error') {
                failure = providerError(part.error);
              } else if (part.type === 'abort') {
                failure = 'La generación fue cancelada o superó el tiempo máximo.';
                assistant.status = 'interrupted';
              }
            }
            if (failure) throw new Error('Provider stream failed');
            upstream.signal.throwIfAborted();
            if (assistant.finishReason !== 'stop' || !assistant.content.trim()) {
              failure = assistant.finishReason === 'length'
                ? 'Se alcanzó el límite de tokens. La respuesta está incompleta.'
                : 'El modelo terminó sin una respuesta completa.';
              throw new Error('Incomplete response');
            }
            if (validateOutput) {
              let output: unknown;
              try { output = JSON.parse(assistant.content); }
              catch { failure = 'El modelo devolvió un JSON inválido.'; }
              if (failure || !validateOutput(output)) {
                failure ??= 'La respuesta no cumple el JSON Schema solicitado.';
                throw new Error('Schema validation failed');
              }
            }
            assistant.status = 'complete';
          } catch (error) {
            assistant.status = upstream.signal.aborted || assistant.status === 'interrupted' ? 'interrupted' : 'error';
            assistant.error = persistenceFailed ? 'Falló el guardado durante la generación; el intento no es evidencia válida.'
              : failure ?? (upstream.signal.aborted ? 'La generación fue cancelada.' : providerError(error));
          } finally {
            conversation.updatedAt = new Date().toISOString();
            let saved = false;
            try { await deps.store.save(conversation); saved = true; }
            catch {
              assistant.status = 'error';
              assistant.error = 'No se pudo guardar el resultado en logs/. Este intento no es evidencia válida.';
            }
            try {
              if (assistant.status === 'complete' && saved) send({ type: 'finish', conversationId: id, message: assistant, saved: true });
              else send({ type: 'error', conversationId: id, message: assistant, error: assistant.error!, saved });
              if (connected) controller.close();
            } finally {
              req.signal.removeEventListener('abort', onAbort);
              unlock();
            }
          }
        },
        cancel() { connected = false; upstream.abort(); },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
      });
    } catch (error) {
      release?.();
      return errorResponse(error);
    }
  };
}

export const handleChat = createChatHandler({
  store: conversationStore, generate,
  configured: () => Boolean(process.env.OPENROUTER_API_KEY?.trim()),
});
