export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ReasoningConfig {
  effort: 'high' | 'medium' | 'low';
  exclude?: boolean;
}

export interface ChatRequest {
  model: string;           
  messages: Message[];      
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  reasoning?: ReasoningConfig;
}

export type ChatRequestOptions = Omit<ChatRequest, 'messages'>;

export interface PromptTokensDetails {
  cached_tokens: number;
}

export interface CompletionTokensDetails {
  reasoning_tokens: number;
}

export interface ResponseUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  cache_discount?: number | null;
  prompt_tokens_details?: PromptTokensDetails;
  completion_tokens_details?: CompletionTokensDetails;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

export interface GenerationUsage {
  tokens: TokenUsage;
  cost: number;
  cacheDiscount: number;   
}
