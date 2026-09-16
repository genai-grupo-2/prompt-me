import type { GenerationUsage, Message, ReasoningConfig } from "./openrouter";
import type { ModelId } from "@/lib/chat/ui-models";

export interface ChatMessage extends Pick<Message, "role" | "content"> {
  id: string;
  usage?: GenerationUsage;
  status?: "streaming" | "complete" | "error" | "stopped";
}

export interface Conversation {
  id: string;
  title: string;
  model: ModelId;
  effort: ReasoningConfig["effort"];
  createdAt: string;
  messages: ChatMessage[];
  serverId?: string;
  serverMessageCount?: number;
}
