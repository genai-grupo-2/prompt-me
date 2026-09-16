import type { ModelId, ReasoningConfig } from '@/types/openrouter';

// Verified against the catalog snapshot in docs/research (2026-09-15).
export const MODELS: Record<ModelId, {
  name: string;
  temperature: boolean;
  efforts: NonNullable<ReasoningConfig['effort']>[];
  mandatoryReasoning: boolean;
}> = {
  'openai/gpt-5.6-luna': {
    name: 'GPT-5.6 Luna', temperature: false,
    efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'], mandatoryReasoning: false,
  },
  'anthropic/claude-haiku-4.5': {
    name: 'Claude Haiku 4.5', temperature: true,
    efforts: [], mandatoryReasoning: false,
  },
  'google/gemini-3.7-flash': {
    name: 'Gemini 3.7 Flash', temperature: true,
    efforts: ['low', 'medium', 'high'], mandatoryReasoning: true,
  },
  'deepseek/deepseek-v4-flash-0731': {
    name: 'DeepSeek V4 Flash 0731', temperature: true,
    efforts: ['low', 'high', 'max'], mandatoryReasoning: false,
  },
};
