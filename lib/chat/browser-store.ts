"use client";

import { useSyncExternalStore } from "react";
import { CHAT_MODELS } from "./ui-models";
import type { Conversation } from "@/types/chat";

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
};
const serverSnapshot: Snapshot = {
  conversations: [EMPTY_CONVERSATION],
  ready: false,
  storageError: null,
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

export function setConversations(
  update: (items: Conversation[]) => Conversation[],
) {
  const conversations = update(snapshot.conversations);
  snapshot = { ...snapshot, conversations };
  if (
    !conversations.some((c) => c.messages.some((m) => m.status === "streaming"))
  ) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(conversations.filter((c) => c.messages.length)),
      );
    } catch {
      snapshot = {
        ...snapshot,
        storageError:
          "El historial no se pudo guardar en este navegador. Descargá la conversación para conservarla.",
      };
    }
  }
  emit();
}

export function dismissStorageError() {
  snapshot = { ...snapshot, storageError: null };
  emit();
}

export function useConversations() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
}
