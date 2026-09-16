import type { GenerationUsage, Message, ReasoningConfig } from "./openrouter";
import type { ModelId } from "@/lib/chat/ui-models";

export interface ChatMessage extends Pick<Message, "role" | "content"> {
  id: string;
  usage?: GenerationUsage;
  status?: "streaming" | "complete" | "error" | "stopped";
}

/**
 * Capabilities are fixed when the conversation starts: the server rejects a
 * change of model or of static context inside an existing conversation.
 */
export interface Capabilities {
  effort: ReasoningConfig["effort"];
  /** Output budget for the response; a reasoner spends it on thinking too. */
  maxTokens?: number;
  cache?: boolean;
  staticContext?: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface Conversation extends Capabilities {
  id: string;
  title: string;
  model: ModelId;
  createdAt: string;
  messages: ChatMessage[];
  serverId?: string;
  serverMessageCount?: number;
  /** A summary read from logs/ whose messages have not been fetched yet. */
  stub?: boolean;
}
