import { streamText, type ModelMessage } from 'ai';
import { openrouter } from '@/lib/api/openrouter';
import type { ChatRequestOptions, Conversation } from '@/types/openrouter';

export function buildModelMessages(conversation: Conversation, options: ChatRequestOptions): ModelMessage[] {
  return conversation.messages
    .filter(message => message.role !== 'assistant' || message.status === 'complete')
    .map(message => {
      if (message.role === 'system') return {
        role: 'system' as const,
        content: message.content,
        ...(options.cache ? { providerOptions: { openrouter: { cacheControl: { type: 'ephemeral' } } } } : {}),
      };
      return { role: message.role, content: message.content };
    });
}

export function createGenerator(provider = openrouter) {
  return function generate(conversation: Conversation, options: ChatRequestOptions, signal: AbortSignal) {
    return streamText({
      model: provider(options.model, {
        extraBody: {
          ...(options.reasoning ? { reasoning: options.reasoning } : {}),
          ...(options.jsonSchema ? {
            response_format: { type: 'json_schema', json_schema: { ...options.jsonSchema, strict: true } },
          } : {}),
          provider: { require_parameters: true },
        },
      }),
      messages: buildModelMessages(conversation, options),
      allowSystemInMessages: true,
      maxOutputTokens: options.max_tokens,
      temperature: options.temperature,
      abortSignal: signal,
      timeout: { totalMs: 180000 },
      maxRetries: 0,
      onError: () => {}, // Errors are sanitized and recorded by the HTTP handler.
    });
  };
}

export const generate = createGenerator();
