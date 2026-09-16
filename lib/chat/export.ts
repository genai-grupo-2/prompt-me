import type { Conversation } from "@/types/chat";
import { getModel } from "./ui-models";

export function conversationMarkdown(conversation: Conversation): string {
  const sections = [
    "# " + conversation.title,
    `Modelo: ${getModel(conversation.model).name} (${conversation.model})`,
    `Fecha: ${conversation.createdAt}`,
    `Esfuerzo: ${conversation.effort}`,
  ];
  for (const message of conversation.messages) {
    sections.push(
      `## ${message.role === "user" ? "Usuario" : "Asistente"}`,
      message.content,
    );
    if (message.status && message.status !== "complete")
      sections.push(`Estado: ${message.status}`);
    if (message.usage) {
      const { tokens, cost, cacheDiscount } = message.usage;
      sections.push(
        `Uso: entrada ${tokens.inputTokens ?? "no disponible"} · salida ${tokens.outputTokens ?? "no disponible"} · razonamiento ${tokens.reasoningTokens ?? "no disponible"} · caché ${tokens.cachedTokens ?? "no disponible"} · total ${tokens.totalTokens ?? "no disponible"}`,
        `Costo USD: ${cost ?? "no disponible"} · descuento de caché: ${cacheDiscount ?? "no disponible"}`,
      );
    } else if (message.role === "assistant")
      sections.push("Uso: no disponible");
  }
  return sections.join("\n\n") + "\n";
}
