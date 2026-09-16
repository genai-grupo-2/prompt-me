import type { ChatMessage, Conversation } from "@/types/chat";
import type {
  Conversation as ServerConversation,
  ConversationSummary,
  MessageStatus,
} from "@/types/openrouter";
import { CHAT_MODELS, type ModelId } from "./ui-models";

const isKnownModel = (model: string): model is ModelId =>
  CHAT_MODELS.some((item) => item.id === model);

// The client vocabulary has no "interrupted": a generation that never finished
// is shown as stopped, the same as one the user cancelled from this browser.
const statusOf = (status: MessageStatus): ChatMessage["status"] =>
  status === "interrupted" || status === "streaming" ? "stopped" : status;

/**
 * A log entry we know exists on disk but whose messages have not been read yet.
 * Returns null for a log written by a model this build no longer serves.
 */
export function stubFromSummary(summary: ConversationSummary): Conversation | null {
  if (!isKnownModel(summary.model)) return null;
  return {
    id: summary.id,
    title: summary.title,
    model: summary.model,
    effort: undefined,
    createdAt: summary.createdAt,
    messages: [],
    serverId: summary.id,
    serverMessageCount: summary.messageCount,
    stub: true,
  };
}

/** Rebuilds the client conversation from the authoritative record in logs/. */
export function fromServer(conversation: ServerConversation): Conversation | null {
  if (!isKnownModel(conversation.model)) return null;
  const options = conversation.messages.find((message) => message.options)?.options;
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.createdAt,
    effort: options?.reasoning?.effort,
    cache: options?.cache,
    staticContext: options?.staticContext,
    jsonSchema: options?.jsonSchema,
    serverId: conversation.id,
    serverMessageCount: conversation.messages.length,
    messages: conversation.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        id: message.id,
        role: message.role as ChatMessage["role"],
        content: message.content,
        usage: message.usage,
        status: statusOf(message.status),
      })),
  };
}
