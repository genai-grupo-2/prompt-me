"use client";

import { useState } from "react";
import ChatAvatar from "./ChatAvatar";
import StreamingCursor from "./StreamingCursor";
import IconButton from "@/components/button/IconButton";
import type { ChatMessage } from "@/types/chat";

function MessageContent({ content }: { content: string }) {
  return (
    <div className="message-content">
      {content
        .split(/(```[\s\S]*?(?:```|$))/g)
        .filter(Boolean)
        .map((part, index) => {
          if (!part.startsWith("```"))
            return (
              <div className="message-prose" key={index}>
                {part}
              </div>
            );
          const body = part.slice(3).replace(/```$/, "");
          const newline = body.indexOf("\n");
          const language = newline >= 0 ? body.slice(0, newline).trim() : "";
          return (
            <div className="code-block" key={index}>
              <div className="code-language">{language || "Código"}</div>
              <pre>
                <code>{newline >= 0 ? body.slice(newline + 1) : body}</code>
              </pre>
            </div>
          );
        })}
    </div>
  );
}

export default function MessageBubble({
  message,
  modelName,
}: {
  message: ChatMessage;
  modelName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const user = message.role === "user";
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <article
      className={`message ${user ? "message--user" : ""}`}
      aria-label={user ? "Tu mensaje" : `Respuesta de ${modelName}`}
    >
      {!user && <ChatAvatar />}
      <div className="message-body">
        <div className="message-author">
          {user ? "Vos" : "Prompt Me"}
          {!user && <span>{modelName}</span>}
        </div>
        <div className="message-text">
          <MessageContent content={message.content} />
          {message.status === "streaming" && <StreamingCursor />}
          {message.status === "error" && (
            <p className="message-status">La respuesta no se pudo completar.</p>
          )}
          {message.status === "stopped" && (
            <p className="message-status">Respuesta detenida.</p>
          )}
        </div>
        {!user && message.status !== "streaming" && (
          <div className="message-footer">
            {message.usage ? (
              <div className="usage-chips">
                <span>
                  Entrada <b>{message.usage.tokens.inputTokens ?? "—"}</b>
                </span>
                <span>
                  Salida <b>{message.usage.tokens.outputTokens ?? "—"}</b>
                </span>
                <span>
                  Razonamiento{" "}
                  <b>{message.usage.tokens.reasoningTokens ?? "—"}</b>
                </span>
                <span>
                  Caché <b>{message.usage.tokens.cachedTokens ?? "—"}</b>
                </span>
                <span className="usage-cost">
                  {message.usage.cost == null
                    ? "Costo no disponible"
                    : `$${message.usage.cost.toFixed(6)} USD`}
                </span>
              </div>
            ) : (
              <span className="usage-unavailable">Métricas no disponibles</span>
            )}
            {message.content && (
              <IconButton
                label={copied ? "Respuesta copiada" : "Copiar respuesta"}
                icon={copied ? "check" : "copy"}
                onClick={copy}
              />
            )}
          </div>
        )}
        {copyError && (
          <p role="status" className="message-status">
            No se pudo copiar. Podés seleccionar el texto.
          </p>
        )}
      </div>
    </article>
  );
}
