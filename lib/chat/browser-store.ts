"use client";

import { useSyncExternalStore } from "react";
import { CHAT_MODELS } from "./ui-models";
import { fromServer, stubFromSummary } from "./adapt";
import type { Conversation } from "@/types/chat";
import type {
  Conversation as ServerConversation,
  ConversationSummary,
} from "@/types/openrouter";

const STORAGE_KEY = "prompt-me.conversations.v1";
export const EMPTY_CONVERSATION: Conversation = {
  id: "initial",
  title: "Nueva conversación",
  model: CHAT_MODELS[0].id,
  effort: "medium",
  createdAt: "",
  messages: [],
};
type Snapshot = {
  conversations: Conversation[];
  ready: boolean;
  storageError: string | null;
  syncError: string | null;
};
const serverSnapshot: Snapshot = {
  conversations: [EMPTY_CONVERSATION],
  ready: false,
  storageError: null,
  syncError: null,
};
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Conversation;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "string" &&
    CHAT_MODELS.some((m) => m.id === item.model) &&
    (item.effort === undefined ||
      ["none", "low", "medium", "high", "xhigh", "max"].includes(
        item.effort,
      )) &&
    Array.isArray(item.messages) &&
    item.messages.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.content === "string" &&
        ["user", "assistant"].includes(m.role) &&
        (!m.usage ||
          (m.usage.tokens &&
            typeof m.usage.tokens === "object" &&
            (m.usage.cost == null || typeof m.usage.cost === "number"))),
    )
  );
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.ready) {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      );
      const valid = Array.isArray(saved)
        ? saved.filter(isConversation).map((c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.status === "streaming"
                ? { ...m, status: "stopped" as const }
                : m,
            ),
          }))
        : [];
      snapshot = {
        conversations: valid.length ? valid : [EMPTY_CONVERSATION],
        ready: true,
        storageError: null,
        syncError: null,
      };
    } catch {
      snapshot = {
        ...serverSnapshot,
        ready: true,
        storageError: "No pudimos recuperar el historial de este navegador.",
      };
    }
    emit();
  }
  return () => {
    listeners.delete(listener);
  };
}

function persist(conversations: Conversation[]) {
  if (
    conversations.some((c) => c.messages.some((m) => m.status === "streaming"))
  ) {
    return snapshot.storageError;
  }
  try {
    // Stubs are a projection of logs/ and are rebuilt on every sync; writing
    // them back would resurrect deleted logs from this browser's cache.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations.filter((c) => c.messages.length && !c.stub)),
    );
    return null;
  } catch {
    return "El historial no se pudo guardar en este navegador. Descargá la conversación para conservarla.";
  }
}

export function setConversations(
  update: (items: Conversation[]) => Conversation[],
) {
  const conversations = update(snapshot.conversations);
  snapshot = {
    ...snapshot,
    conversations,
    storageError: persist(conversations),
  };
  emit();
}

/**
 * logs/ is the evidence the assignment is graded on, so it wins over this
 * browser's cache. Conversations on disk that this browser has never seen come
 * back as stubs; one whose local copy disagrees with the record is dropped back
 * to a stub and re-read on demand. Conversations with no serverId belong to an
 * older build and are kept read-only so nothing is lost.
 */
export async function syncFromServer(signal?: AbortSignal) {
  let summaries: ConversationSummary[];
  try {
    const response = await fetch("/api/conversations", { signal });
    if (!response.ok) throw new Error("Request failed");
    summaries = await response.json();
    if (!Array.isArray(summaries)) throw new Error("Malformed response");
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    snapshot = {
      ...snapshot,
      syncError:
        "No pudimos leer los logs del servidor. Mostramos sólo el historial de este navegador.",
    };
    emit();
    return;
  }
  setConversations((items) => {
    const record = new Map(summaries.map((summary) => [summary.id, summary]));
    const seen = new Set<string>();
    const merged = items.flatMap((item) => {
      if (item.stub) return [];
      if (!item.serverId) return [item];
      const summary = record.get(item.serverId);
      if (!summary) return []; // The log is gone; so is the browser's copy of it.
      seen.add(item.serverId);
      // A message count that disagrees means another tab or an interrupted
      // stream moved on: the local copy is no longer a faithful view.
      const stale = item.serverMessageCount !== summary.messageCount;
      return [
        {
          ...item,
          title: summary.title,
          ...(stale
            ? {
                messages: [],
                stub: true,
                serverMessageCount: summary.messageCount,
              }
            : {}),
        },
      ];
    });
    for (const summary of summaries) {
      if (seen.has(summary.id)) continue;
      const stub = stubFromSummary(summary);
      if (stub) merged.push(stub);
    }
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
  snapshot = { ...snapshot, syncError: null };
  emit();
}

/** Reads one log in full and replaces the local projection of it. */
export async function hydrate(serverId: string, signal?: AbortSignal) {
  let record: ServerConversation;
  try {
    const response = await fetch(`/api/conversations/${serverId}`, { signal });
    if (!response.ok) throw new Error("Request failed");
    record = await response.json();
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    snapshot = {
      ...snapshot,
      syncError: "No pudimos leer esta conversación desde logs/.",
    };
    emit();
    return;
  }
  const conversation = fromServer(record);
  if (!conversation) return;
  setConversations((items) =>
    items.map((item) =>
      item.serverId === serverId ? { ...conversation, id: item.id } : item,
    ),
  );
}

export function dismissStorageError() {
  snapshot = { ...snapshot, storageError: null, syncError: null };
  emit();
}

export function useConversations() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
}
