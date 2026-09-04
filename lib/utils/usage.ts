import type { GenerationUsage, ResponseUsage } from '@/types/openrouter';

export function parseUsage(raw: ResponseUsage): GenerationUsage {
  return {
    tokens: {
      inputTokens:     raw.prompt_tokens,
      outputTokens:    raw.completion_tokens,
      totalTokens:     raw.total_tokens,
      reasoningTokens: raw.completion_tokens_details?.reasoning_tokens ?? 0,
      cachedTokens:    raw.prompt_tokens_details?.cached_tokens        ?? 0,
    },
    cost:          raw.cost          ?? 0,
    cacheDiscount: raw.cache_discount ?? 0,
  };
}
