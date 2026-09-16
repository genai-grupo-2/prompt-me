"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "@/types/chat";

export default function MessageList({
  messages,
  modelName,
}: {
  messages: ChatMessage[];
  modelName: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = viewport.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  return (
    <div
      className="message-scroll"
      ref={viewport}
      onScroll={() => {
        const el = viewport.current;
        if (el)
          pinned.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      }}
    >
      <div className="message-list">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            modelName={modelName}
          />
        ))}
      </div>
    </div>
  );
}
