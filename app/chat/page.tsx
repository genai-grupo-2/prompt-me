"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatLayout from "@/components/chat/ChatLayout";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import ModelPicker from "@/components/chat/ModelPicker";
import SideBar from "@/components/sidebar/SideBar";
import Icon from "@/components/button/Icon";
import IconButton from "@/components/button/IconButton";
import ErrorBanner from "@/components/banner/ErrorBanner";
import { getModel, type ModelId } from "@/lib/chat/ui-models";
import { MODELS } from "@/lib/chat/models";
import {
  EMPTY_CONVERSATION,
  dismissStorageError,
  setConversations,
  useConversations,
} from "@/lib/chat/browser-store";
import { conversationMarkdown } from "@/lib/chat/export";
import type { Conversation } from "@/types/chat";
import type { ChatEvent } from "@/types/openrouter";

export default function ChatPage() {
  const { conversations, ready, storageError } = useConversations();
  const [activeId, setActiveId] = useState(EMPTY_CONVERSATION.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const conversation =
    conversations.find((c) => c.id === activeId) ?? conversations[0];
  const displayedError = error ?? storageError;
  const model = getModel(conversation.model);

  useEffect(() => () => abort.current?.abort(), []);

  function updateConversation(
    id: string,
    update: (c: Conversation) => Conversation,
  ) {
    setConversations((items) =>
      items.map((c) => (c.id === id ? update(c) : c)),
    );
  }

  function newConversation(modelId: ModelId = conversation.model) {
    if (abort.current) return;
    const next: Conversation = {
      ...EMPTY_CONVERSATION,
      id: crypto.randomUUID(),
      model: modelId,
      effort: MODELS[modelId].efforts.includes("medium") ? "medium" : "high",
      createdAt: new Date().toISOString(),
    };
    setConversations((items) => [
      next,
      ...items.filter((c) => c.messages.length),
    ]);
    setActiveId(next.id);
    setDraft("");
    setError(null);
    closeSidebar();
  }

  async function send() {
    if (!draft.trim() || abort.current || !ready) return;
    if (conversation.messages.length && !conversation.serverId) {
      setError(
        "Este chat pertenece a la versión anterior. Iniciá una conversación nueva para usar el backend actualizado; el historial anterior se conserva.",
      );
      return;
    }
    if (
      conversation.messages.at(-1)?.status &&
      conversation.messages.at(-1)?.status !== "complete"
    ) {
      setError(
        "El intento anterior quedó incompleto. Iniciá una conversación nueva; el historial se conserva.",
      );
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const id = conversation.id;
    const assistantId = crypto.randomUUID();
    const content = draft.trim();
    const history = [
      ...conversation.messages.filter(
        (m) => m.status !== "error" && m.status !== "stopped",
      ),
      { id: crypto.randomUUID(), role: "user" as const, content },
    ];
    updateConversation(id, (c) => ({
      ...c,
      title: c.messages.length ? c.title : content.slice(0, 55),
      createdAt: c.createdAt || new Date().toISOString(),
      messages: [
        ...c.messages,
        history[history.length - 1],
        {
          id: assistantId,
          role: "assistant",
          content: "",
          status: "streaming",
        },
      ],
    }));
    setDraft("");
    setBusy(true);
    setError(null);
    const updateResponse = (patch: Partial<Conversation["messages"][number]>) =>
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantId ? { ...m, ...patch } : m,
        ),
      }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: content,
          ...(conversation.serverId
            ? {
                conversationId: conversation.serverId,
                expectedMessageCount: conversation.serverMessageCount,
              }
            : {}),
          options: {
            model: conversation.model,
            max_tokens: 8192,
            ...(MODELS[conversation.model].efforts.length
              ? { reasoning: { effort: conversation.effort } }
              : {}),
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ||
            "No pudimos conectar con el modelo. Intentá de nuevo.",
        );
      }
      if (!response.body)
        throw new Error("El modelo no devolvió una respuesta.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let pending = "";
      let complete = false;
      function consume(line: string) {
        if (!line.trim()) return;
        const event = JSON.parse(line) as ChatEvent;
        if (event.type === "start") {
          updateConversation(id, (c) => ({
            ...c,
            serverId: event.conversationId,
            serverMessageCount: (conversation.serverMessageCount ?? 1) + 2,
          }));
        }
        if (event.type === "text") {
          text += event.text ?? "";
          updateResponse({ content: text });
        }
        if (event.type === "finish") {
          complete = true;
          updateResponse({
            content: event.message.content,
            usage: event.message.usage,
            status: "complete",
          });
        }
        if (event.type === "error") {
          updateResponse({
            content: event.message.content,
            usage: event.message.usage,
            status:
              event.message.status === "interrupted" ? "stopped" : "error",
          });
          throw new Error(event.error || "Se interrumpió la respuesta.");
        }
      }
      try {
        while (true) {
          const { value, done } = await reader.read();
          pending += decoder.decode(value, { stream: !done });
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          lines.forEach(consume);
          if (done) break;
        }
        if (pending.trim()) consume(pending);
        if (!complete)
          throw new Error(
            "La conexión se cortó antes de completar la respuesta.",
          );
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (cause) {
      const stopped = controller.signal.aborted;
      updateResponse({ status: stopped ? "stopped" : "error" });
      if (!stopped)
        setError(
          cause instanceof Error
            ? cause.message
            : "Ocurrió un error al enviar el mensaje.",
        );
    } finally {
      abort.current = null;
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([conversationMarkdown(conversation)], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompt-me-${conversation.id}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <ChatLayout
      open={sidebarOpen}
      onClose={closeSidebar}
      sidebar={
        <SideBar
          conversations={conversations}
          activeId={conversation.id}
          busy={busy || !ready}
          onNew={() => newConversation()}
          onSelect={(id) => {
            setActiveId(id);
            setDraft("");
            setError(null);
            closeSidebar();
          }}
          onClose={closeSidebar}
        />
      }
    >
      <header className="chat-header">
        <div className="header-left">
          <IconButton
            className="mobile-menu"
            icon="panel"
            label="Abrir conversaciones"
            aria-expanded={sidebarOpen}
            aria-controls="conversation-sidebar"
            onClick={() => setSidebarOpen(true)}
          />
          <span className="header-title">Tu espacio para crear</span>
          <span className="header-divider" />
          <ModelPicker
            value={conversation.model}
            disabled={busy || !ready}
            onChange={(id) => {
              if (id !== conversation.model) newConversation(id);
            }}
          />
        </div>
        <div className="header-right">
          <span className="provider-label">
            <span /> Vía OpenRouter
          </span>
          <button
            className="export-button"
            onClick={download}
            disabled={busy || !conversation.messages.length}
            title="Descargar esta conversación en Markdown"
          >
            <Icon name="download" size={17} />
            <span>Exportar chat</span>
          </button>
        </div>
      </header>
      <ChatWindow
        messages={conversation.messages}
        modelName={model.name}
        onSuggestion={(prompt) => {
          setDraft(prompt);
          document.getElementById("chat-input")?.focus();
        }}
        error={
          displayedError && (
            <ErrorBanner
              message={displayedError}
              onDismiss={() => {
                setError(null);
                dismissStorageError();
              }}
            />
          )
        }
        composer={
          <ChatInput
            value={draft}
            onChange={setDraft}
            busy={busy}
            onSend={send}
            onStop={() => abort.current?.abort()}
            effort={conversation.effort}
            onEffortChange={(effort) =>
              updateConversation(conversation.id, (c) => ({ ...c, effort }))
            }
            supportsEffort={MODELS[conversation.model].efforts.length > 0}
            effortOptions={MODELS[conversation.model].efforts}
          />
        }
      />
    </ChatLayout>
  );
}
