import type { ReactNode } from "react";
import ChatAvatar from "./ChatAvatar";
import MessageList from "./MessageList";
import Icon, { type IconName } from "@/components/button/Icon";
import type { ChatMessage } from "@/types/chat";

const suggestions: {
  icon: IconName;
  label: string;
  text: string;
  prompt: string;
}[] = [
  {
    icon: "code",
    label: "Creá algo nuevo",
    text: "De una idea a tu primer código",
    prompt:
      "Quiero crear un proyecto de programación. Ayudame a convertir mi idea en pasos concretos: ",
  },
  {
    icon: "spark",
    label: "Mejorá tu prompt",
    text: "Encontrá las palabras indicadas",
    prompt:
      "Ayudame a mejorar este prompt para que sea claro, preciso y tenga todas las restricciones necesarias: ",
  },
  {
    icon: "book",
    label: "Entendé un concepto",
    text: "Lo complejo, un poco más simple",
    prompt:
      "Explicame este concepto de programación paso a paso, con un ejemplo sencillo: ",
  },
];

export default function ChatWindow({
  messages,
  modelName,
  composer,
  error,
  onSuggestion,
}: {
  messages: ChatMessage[];
  modelName: string;
  composer: ReactNode;
  error: ReactNode;
  onSuggestion: (prompt: string) => void;
}) {
  const empty = messages.length === 0;
  return (
    <section
      className={`chat-surface ${empty ? "chat-surface--empty" : ""}`}
      aria-label="Chat con el asistente"
    >
      {empty ? (
        <div className="welcome">
          <div className="welcome-avatar">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <ChatAvatar size="hero" />
            <span className="welcome-spark spark-one">✦</span>
            <span className="welcome-spark spark-two">✧</span>
          </div>
          <span className="welcome-eyebrow">
            UN PEQUEÑO PROMPT, MUCHAS POSIBILIDADES
          </span>
          <h1>
            ¿Qué vamos a <span>crear hoy?</span>
          </h1>
          <p>
            Soy tu compañero para pensar, programar y explorar.
            <br />
            Vos traé la idea. La descubrimos juntos.
          </p>
        </div>
      ) : (
        <MessageList messages={messages} modelName={modelName} />
      )}
      <div className="chat-bottom">
        {empty && (
          <div className="suggestions">
            <div className="suggestions-heading">
              <span>Un poco de inspiración para empezar</span>
              <Icon name="spark" size={14} />
            </div>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <button
                  className="suggestion-card"
                  key={suggestion.label}
                  onClick={() => onSuggestion(suggestion.prompt)}
                >
                  <span className="suggestion-icon">
                    <Icon name={suggestion.icon} size={20} />
                  </span>
                  <strong>{suggestion.label}</strong>
                  <span>{suggestion.text}</span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
          </div>
        )}
        {error}
        {composer}
      </div>
    </section>
  );
}
