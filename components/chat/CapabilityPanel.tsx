"use client";

import { useState } from "react";
import { DEFAULT_JSON_SCHEMA } from "@/lib/prompts/capabilities";
import type { Capabilities } from "@/types/chat";

const APPROXIMATE_CHARACTERS_PER_TOKEN = 4;
export const DEFAULT_MAX_TOKENS = 8192;
const MAX_TOKEN_CHOICES = [4096, 8192, 16384, 32000, 64000];

export default function CapabilityPanel({
  model,
  value,
  locked,
  onChange,
}: {
  model: string;
  value: Capabilities;
  /** Once a conversation has messages the server refuses to change these. */
  locked: boolean;
  onChange: (patch: Partial<Capabilities>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [schemaText, setSchemaText] = useState(() =>
    JSON.stringify(
      value.jsonSchema?.schema ?? DEFAULT_JSON_SCHEMA.schema,
      null,
      2,
    ),
  );
  const [problem, setProblem] = useState<string | null>(null);

  async function loadReference() {
    setLoading(true);
    try {
      const response = await fetch("/api/static-context");
      if (!response.ok) throw new Error("Request failed");
      const payload = await response.json();
      if (typeof payload?.text !== "string" || !payload.text) {
        throw new Error("Malformed response");
      }
      setProblem(null);
      onChange({ staticContext: payload.text, cache: true });
    } catch {
      setProblem(
        "No pudimos cargar la documentación de referencia. Pegá un contexto estático a mano.",
      );
    } finally {
      setLoading(false);
    }
  }

  function parseSchema(text: string): Record<string, unknown> | null {
    try {
      const schema: unknown = JSON.parse(text);
      if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
        return null;
      }
      return schema as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  function applySchema(text: string) {
    setSchemaText(text);
    if (!value.jsonSchema) return;
    const schema = parseSchema(text);
    if (!schema) {
      setProblem("El esquema no es JSON válido. No se va a enviar así.");
      return;
    }
    setProblem(null);
    onChange({ jsonSchema: { name: DEFAULT_JSON_SCHEMA.name, schema } });
  }

  // A reasoning model charges its thinking against this same budget, so a
  // long answer with a high effort needs room for both.
  const budget = (
    <fieldset className="capability-panel" disabled={locked}>
      <legend>Presupuesto de salida</legend>
      <div className="capability-row">
        <label>
          <select
            aria-label="Tokens máximos de salida"
            value={value.maxTokens ?? DEFAULT_MAX_TOKENS}
            onChange={(event) =>
              onChange({ maxTokens: Number(event.target.value) })
            }
          >
            {MAX_TOKEN_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice.toLocaleString("es-AR")} tokens
              </option>
            ))}
          </select>
        </label>
        <span>
          Incluye los tokens de razonamiento. Si se agota, la respuesta queda
          incompleta y no cuenta como evidencia.
        </span>
      </div>
    </fieldset>
  );

  if (model === "anthropic/claude-haiku-4.5") {
    const characters = value.staticContext?.length ?? 0;
    return (
      <>
        {budget}
        <fieldset className="capability-panel" disabled={locked}>
          <legend>Caché explícito de Anthropic</legend>
          <label className="capability-toggle">
            <input
              type="checkbox"
              checked={Boolean(value.cache)}
              onChange={(event) => onChange({ cache: event.target.checked })}
            />
            Marcar el contexto estático con{" "}
            <code>cache_control: ephemeral</code>
          </label>
          <div className="capability-row">
            <button type="button" onClick={loadReference} disabled={loading}>
              {loading ? "Cargando…" : "Cargar documentación del proyecto"}
            </button>
            <span>
              {characters
                ? `${characters.toLocaleString("es-AR")} caracteres · ~${Math.round(
                    characters / APPROXIMATE_CHARACTERS_PER_TOKEN,
                  ).toLocaleString("es-AR")} tokens`
                : "Sin contexto estático"}
            </span>
          </div>
          <textarea
            aria-label="Contexto estático"
            placeholder="Pegá acá el bloque estático que querés cachear. Anthropic necesita al menos ~2.048 tokens para guardarlo."
            value={value.staticContext ?? ""}
            onChange={(event) =>
              onChange({ staticContext: event.target.value })
            }
            rows={4}
          />
          {problem && <p className="capability-error">{problem}</p>}
          <p className="capability-note">
            El bloque va al principio del prompt, idéntico en cada mensaje. En
            la segunda respuesta de la conversación tiene que aparecer{" "}
            <b>caché &gt; 0</b>.
          </p>
        </fieldset>
      </>
    );
  }

  if (model === "google/gemini-3.7-flash") {
    return (
      <>
        {budget}
        <fieldset className="capability-panel" disabled={locked}>
          <legend>Salida estructurada de Gemini</legend>
          <label className="capability-toggle">
            <input
              type="checkbox"
              checked={Boolean(value.jsonSchema)}
              onChange={(event) => {
                if (!event.target.checked) {
                  setProblem(null);
                  onChange({ jsonSchema: undefined });
                  return;
                }
                const schema = parseSchema(schemaText);
                if (!schema) {
                  setProblem(
                    "El esquema no es JSON válido. Corregilo y volvé a activarlo.",
                  );
                  return;
                }
                setProblem(null);
                onChange({
                  jsonSchema: { name: DEFAULT_JSON_SCHEMA.name, schema },
                });
              }}
            />
            Exigir una respuesta que valide contra un JSON Schema
          </label>
          <textarea
            aria-label="JSON Schema"
            value={schemaText}
            onChange={(event) => applySchema(event.target.value)}
            rows={8}
            spellCheck={false}
          />
          {problem && <p className="capability-error">{problem}</p>}
          <p className="capability-note">
            La respuesta se valida contra el esquema antes de darse por buena.
          </p>
        </fieldset>
      </>
    );
  }
  return budget;
}
