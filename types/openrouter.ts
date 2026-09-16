export type ModelId =
  | 'openai/gpt-5.6-luna'
  | 'anthropic/claude-haiku-4.5'
  | 'google/gemini-3.7-flash'
  | 'deepseek/deepseek-v4-flash-0731';

export interface ReasoningConfig {
  effort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  max_tokens?: number;
  enabled?: boolean;
  exclude?: boolean;
}

export interface ChatRequestOptions {
  model: ModelId;
  max_tokens: number;
  temperature?: number;
  reasoning?: ReasoningConfig;
  cache?: boolean;
  staticContext?: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface ChatRequest {
  message: string;
  options: ChatRequestOptions;
  conversationId?: string;
  expectedMessageCount?: number;
}

export interface GenerationUsage {
  tokens: {
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    cachedTokens: number | null;
    cacheWriteTokens: number | null;
    totalTokens: number | null;
  };
  cost: number | null;
  cacheDiscount: number | null;
}

export type MessageStatus = 'streaming' | 'complete' | 'error' | 'interrupted';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  status: MessageStatus;
  options?: ChatRequestOptions;
  usage?: GenerationUsage;
  finishReason?: string;
  error?: string;
  generationId?: string;
}

export interface Conversation {
  version: 1;
  id: string;
  title: string;
  model: ModelId;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export type ConversationSummary = Omit<Conversation, 'messages' | 'version'> & {
  messageCount: number;
  status: MessageStatus;
};

export type ChatEvent =
  | { type: 'start'; conversationId: string; messageId: string }
  | { type: 'text'; text: string }
  | { type: 'finish'; conversationId: string; message: Message; saved: true }
  | { type: 'error'; conversationId: string; message: Message; error: string; saved: boolean };