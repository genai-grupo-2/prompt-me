import { z } from 'zod';
import Ajv from 'ajv';
import { MODELS } from './models';
import type { ChatRequest, ChatRequestOptions } from '@/types/openrouter';

export class ChatError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export const idSchema = z.uuid();
export const modelSchema = z.enum([
  'openai/gpt-5.6-luna', 'anthropic/claude-haiku-4.5',
  'google/gemini-3.7-flash', 'deepseek/deepseek-v4-flash-0731',
]);

export const optionsSchema = z.object({
  model: modelSchema,
  max_tokens: z.number().int().min(1).max(64000).default(8192),
  temperature: z.number().min(0).max(2).optional(),
  reasoning: z.object({
    effort: z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']).optional(),
    max_tokens: z.number().int().min(1024).max(32000).optional(),
    enabled: z.boolean().optional(),
    exclude: z.boolean().optional(),
  }).strict().optional(),
  cache: z.boolean().optional(),
  staticContext: z.string().max(180000).optional(),
  jsonSchema: z.object({
    name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    schema: z.record(z.string(), z.unknown()),
  }).strict().optional(),
}).strict();

const requestSchema = z.object({
  message: z.string().min(1).max(180000).refine(s => s.trim().length > 0),
  options: optionsSchema,
  conversationId: idSchema.optional(),
  expectedMessageCount: z.number().int().min(1).optional(),
}).strict();

export function compileOutputSchema(options: ChatRequestOptions) {
  if (!options.jsonSchema) return undefined;
  try {
    if (options.jsonSchema.schema.$async) throw new Error('Async schemas are not supported');
    return new Ajv({ strict: true, allErrors: false }).compile(options.jsonSchema.schema);
  } catch {
    throw new ChatError('El JSON Schema no es válido o usa características no admitidas (draft-07).');
  }
}

export function validateRequest(value: unknown): ChatRequest {
  const parsed = requestSchema.safeParse(value);
  if (!parsed.success) throw new ChatError('Solicitud inválida: revisá mensaje, identificador y opciones.');
  const request = parsed.data;
  const { options } = request;
  const model = MODELS[options.model];
  const reasoning = options.reasoning;
  if (request.conversationId && request.expectedMessageCount === undefined) {
    throw new ChatError('Falta expectedMessageCount para continuar la conversación.');
  }
  if (!model.temperature && options.temperature !== undefined) {
    throw new ChatError('Este modelo no admite temperature.');
  }
  if (reasoning?.effort && !model.efforts.includes(reasoning.effort)) {
    throw new ChatError('El esfuerzo de razonamiento no es compatible con el modelo.');
  }
  if (model.mandatoryReasoning && reasoning?.enabled === false) {
    throw new ChatError('Este modelo requiere razonamiento activado.');
  }
  if (reasoning?.max_tokens !== undefined &&
      (options.model !== 'anthropic/claude-haiku-4.5' || reasoning.effort || reasoning.max_tokens >= options.max_tokens)) {
    throw new ChatError('El presupuesto de pensamiento es exclusivo de Claude y debe ser menor que max_tokens, sin effort.');
  }
  if (reasoning?.enabled === false && (reasoning.max_tokens || (reasoning.effort && reasoning.effort !== 'none'))) {
    throw new ChatError('Las opciones de razonamiento son contradictorias.');
  }
  if (reasoning?.enabled === true && reasoning.effort === 'none') {
    throw new ChatError('Las opciones de razonamiento son contradictorias.');
  }
  if (options.cache && options.model !== 'anthropic/claude-haiku-4.5') {
    throw new ChatError('El control de caché explícito de esta interfaz es para Claude.');
  }
  if (options.cache && !options.staticContext?.trim()) {
    throw new ChatError('Agregá un contexto estático para la prueba de caché (al menos 4.096 tokens cacheables).');
  }
  if (options.jsonSchema && options.model !== 'google/gemini-3.7-flash') {
    throw new ChatError('La prueba de JSON Schema de esta interfaz es para Gemini.');
  }
  compileOutputSchema(options);
  return request;
}

export async function readRequest(req: Request): Promise<ChatRequest> {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    throw new ChatError('Se requiere Content-Type: application/json.', 415);
  }
  if (!req.body) throw new ChatError('Falta el cuerpo de la solicitud.');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) {
        await reader.cancel();
        throw new ChatError('La solicitud supera 256 KiB.', 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ChatError('El cuerpo no contiene JSON válido.'); }
    return validateRequest(body);
  } finally { reader.releaseLock(); }
}

export function errorResponse(error: unknown): Response {
  return Response.json({ error: error instanceof ChatError ? error.message : 'No se pudo acceder al historial de conversaciones.' }, {
    status: error instanceof ChatError ? error.status : 500,
    headers: { 'Cache-Control': 'no-store' },
  });
}
