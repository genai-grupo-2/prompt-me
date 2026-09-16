import { mkdir, readFile, readdir, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ChatError, idSchema, modelSchema, optionsSchema } from './validation';
import type { Conversation, ConversationSummary } from '@/types/openrouter';

const metric = z.number().finite().nullable();
const conversationSchema = z.object({
  version: z.literal(1), id: idSchema, title: z.string(), model: modelSchema,
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  messages: z.array(z.object({
    id: idSchema, role: z.enum(['system', 'user', 'assistant']), content: z.string(),
    createdAt: z.iso.datetime(), status: z.enum(['streaming', 'complete', 'error', 'interrupted']),
    options: optionsSchema.optional(), finishReason: z.string().optional(),
    error: z.string().optional(), generationId: z.string().optional(),
    usage: z.object({
      tokens: z.object({ inputTokens: metric, outputTokens: metric, totalTokens: metric,
        cachedTokens: metric, cacheWriteTokens: metric, reasoningTokens: metric }),
      cost: metric, cacheDiscount: metric,
    }).optional(),
  })).min(1),
});

function fenced(content: string, language = 'text') {
  const runs = content.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return `${fence}${language}\n${content}\n${fence}`;
}

export function toMarkdown(conversation: Conversation): string {
  // Escaping angle brackets prevents message content from terminating the marker.
  // This metadata is the authoritative, lossless record used to restore the UI.
  const data = JSON.stringify(conversation).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const lines = [
    `<!-- prompt-me:v1\n${data}\n-->`,
    `# Conversación ${conversation.id}`,
    `Modelo: ${conversation.model}  \nCreada: ${conversation.createdAt}  \nActualizada: ${conversation.updatedAt}`,
  ];
  for (const message of conversation.messages) {
    lines.push(`## ${message.role} · ${message.createdAt}`, `Estado: ${message.status}`, fenced(message.content));
    if (message.options) lines.push('### Parámetros', fenced(JSON.stringify(message.options, null, 2), 'json'));
    if (message.usage) lines.push('### Consumo (USD; null = no disponible)', fenced(JSON.stringify(message.usage, null, 2), 'json'));
    if (message.generationId) lines.push(`Generación: ${message.generationId}`);
    if (message.finishReason) lines.push(`Finalización: ${message.finishReason}`);
    if (message.error) lines.push(`Error: ${message.error}`);
  }
  return lines.join('\n\n') + '\n';
}

export class ConversationStore {
  private readonly active = new Set<string>();
  constructor(private readonly directory = path.join(process.cwd(), 'logs')) {}

  private filename(id: string) {
    if (!idSchema.safeParse(id).success) throw new ChatError('Identificador de conversación inválido.');
    return path.join(this.directory, `${id}.md`);
  }

  acquire(id: string) {
    this.filename(id);
    if (this.active.has(id)) throw new ChatError('Ya hay una respuesta en curso para esta conversación.', 409);
    this.active.add(id);
    return () => { this.active.delete(id); };
  }

  async save(conversation: Conversation, create = false) {
    const filename = this.filename(conversation.id);
    conversationSchema.parse(conversation);
    await mkdir(this.directory, { recursive: true });
    const text = toMarkdown(conversation);
    if (create) {
      // Exclusive create: even an ID collision cannot overwrite another log.
      await writeFile(filename, text, { encoding: 'utf8', flag: 'wx' });
      return;
    }
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, filename);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }

  async read(id: string, recover = !this.active.has(id)): Promise<Conversation> {
    let text: string;
    try { text = await readFile(this.filename(id), 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ChatError('Conversación no encontrada.', 404);
      throw error;
    }
    const match = /^<!-- prompt-me:v1\r?\n([^\n]+)\r?\n-->/.exec(text);
    let conversation: Conversation;
    try {
      conversation = conversationSchema.parse(JSON.parse(match?.[1] ?? ''));
      if (conversation.id !== id) throw new Error('Mismatched ID');
    } catch { throw new ChatError('El log está dañado o tiene un formato incompatible.', 500); }
    // A process restart cannot turn an unfinished answer into a success.
    // The original on-disk record is kept; the recovered state is saved on continuation.
    if (recover) for (const message of conversation.messages) {
      if (message.status === 'streaming') {
        message.status = 'interrupted';
        message.error = 'La generación quedó interrumpida antes de registrar su finalización.';
      }
    }
    return conversation;
  }

  async list(): Promise<ConversationSummary[]> {
    let filenames: string[];
    try { filenames = await readdir(this.directory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const summaries: ConversationSummary[] = [];
    for (const filename of filenames) {
      if (!filename.endsWith('.md') || !idSchema.safeParse(filename.slice(0, -3)).success) continue;
      const conversation = await this.read(filename.slice(0, -3));
      const { id, title, model, createdAt, updatedAt, messages } = conversation;
      summaries.push({ id, title, model, createdAt, updatedAt, messageCount: messages.length, status: messages.at(-1)!.status });
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

// Keep the single-process write lease across Next.js development reloads.
const shared = globalThis as typeof globalThis & { promptMeStore?: ConversationStore };
export const conversationStore = shared.promptMeStore ??= new ConversationStore();
