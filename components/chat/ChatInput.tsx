"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/button/Icon";
import type { ReasoningConfig } from "@/types/openrouter";

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  effort,
  onEffortChange,
  supportsEffort,
  effortOptions,
  capabilities,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  effort: ReasoningConfig["effort"];
  onEffortChange: (value: ReasoningConfig["effort"]) => void;
  supportsEffort: boolean;
  effortOptions: NonNullable<ReasoningConfig["effort"]>[];
  /** Model-specific controls: explicit caching, structured output. */
  capabilities?: ReactNode;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [settings, setSettings] = useState(false);
  const effortLabels = {
    none: "Ninguno",
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    xhigh: "Muy alto",
    max: "Máximo",
  };
  useLayoutEffect(() => {
    const el = textarea.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }, [value]);
  return (
    <div className="composer-area">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && value.trim()) onSend();
        }}
      >
        <textarea
          ref={textarea}
          id="chat-input"
          aria-label="Tu mensaje"
          placeholder="Escribí una idea. Hagamos que pase."
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!busy && value.trim()) onSend();
            }
          }}
        />
        <div className="composer-bottom">
          <div className="composer-tools">
            {supportsEffort || capabilities ? (
              <button
                type="button"
                className={`effort-button ${settings ? "selected" : ""}`}
                onClick={() => setSettings(!settings)}
                aria-expanded={settings}
                aria-controls="model-options-panel"
                disabled={busy}
              >
                <Icon name="sliders" size={16} />
                <span>{supportsEffort ? "Razonamiento" : "Capacidad"}</span>
                {supportsEffort && (
                  <span className="effort-value">
                    {effort ? effortLabels[effort] : "Automático"}
                  </span>
                )}
              </button>
            ) : (
              <span className="composer-hint">
                <Icon name="spark" size={15} /> Dale forma a tu próxima idea
              </span>
            )}
          </div>
          <div className="composer-send">
            <span className="enter-hint">Enter para enviar</span>
            {busy ? (
              <button
                type="button"
                className="send-button"
                aria-label="Detener respuesta"
                onClick={onStop}
              >
                <Icon name="stop" size={18} />
              </button>
            ) : (
              <button
                type="submit"
                className="send-button"
                aria-label="Enviar mensaje"
                disabled={!value.trim()}
              >
                <Icon name="arrow" size={21} />
              </button>
            )}
          </div>
        </div>
        {settings && (supportsEffort || capabilities) && (
          <div className="model-options-panel" id="model-options-panel">
            {supportsEffort && (
              <fieldset className="reasoning-options" disabled={busy}>
                <legend>Esfuerzo de razonamiento</legend>
                {effortOptions.map((level) => (
                  <label key={level}>
                    <input
                      type="radio"
                      name="effort"
                      checked={effort === level}
                      onChange={() => onEffortChange(level)}
                    />
                    {effortLabels[level]}
                  </label>
                ))}
              </fieldset>
            )}
            {capabilities}
          </div>
        )}
      </form>
      <p className="composer-footnote">
        La IA puede equivocarse. Revisá las respuestas importantes.
      </p>
    </div>
  );
}
