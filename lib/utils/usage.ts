import type { LanguageModelUsage, ProviderMetadata } from 'ai';
import type { GenerationUsage } from '@/types/openrouter';

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (...values: unknown[]): number | null => {
  for (const value of values) if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
};

// Provider 3.x exposes camelCase under openrouter.usage; SDK 7 also keeps
// the original snake_case payload in usage.raw (including cache_discount).
export function parseUsage(usage: LanguageModelUsage, metadata?: ProviderMetadata): GenerationUsage {
  const raw = record(usage.raw);
  const accounting = record(record(metadata?.openrouter).usage);
  // OpenRouter's adapter fills missing detail counters with zero. Only use
  // normalized SDK counters when no OpenRouter/raw payload is available.
  const fallback = usage.raw || metadata?.openrouter ? undefined : usage;
  return {
    tokens: {
      inputTokens: number(raw.prompt_tokens, accounting.promptTokens, fallback?.inputTokens),
      outputTokens: number(raw.completion_tokens, accounting.completionTokens, fallback?.outputTokens),
      totalTokens: number(raw.total_tokens, accounting.totalTokens, fallback?.totalTokens),
      reasoningTokens: number(record(raw.completion_tokens_details).reasoning_tokens,
        record(accounting.completionTokensDetails).reasoningTokens, fallback?.outputTokenDetails.reasoningTokens),
      cachedTokens: number(record(raw.prompt_tokens_details).cached_tokens,
        record(accounting.promptTokensDetails).cachedTokens, fallback?.inputTokenDetails.cacheReadTokens),
      cacheWriteTokens: number(record(raw.prompt_tokens_details).cache_write_tokens, fallback?.inputTokenDetails.cacheWriteTokens),
    },
    cost: number(raw.cost, accounting.cost),
    cacheDiscount: number(raw.cache_discount, accounting.cacheDiscount),
  };
}
