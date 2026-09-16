"use client";

import { useState } from "react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import Icon from "@/components/button/Icon";
import IconButton from "@/components/button/IconButton";
import SideBarItem from "./SideBarItem";
import type { Conversation } from "@/types/chat";

export default function SideBar({
  conversations,
  activeId,
  busy,
  onNew,
  onSelect,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string;
  busy: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // A stub is a log read from the server whose messages have not been fetched
  // yet: it belongs in the list even though it carries no messages here.
  const saved = conversations.filter((c) => c.messages.length || c.stub);
  const visible = saved.filter((c) =>
    c.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="sidebar-brand">
        <ChatAvatar size="brand" />
        <span>
          prompt<span className="brand-light">me</span>
          <span className="brand-dot">.</span>
        </span>
        <IconButton
          className="mobile-close"
          icon="close"
          label="Cerrar conversaciones"
          onClick={onClose}
        />
      </div>
      <button className="new-chat-button" onClick={onNew} disabled={busy}>
        <Icon name="plus" size={19} /> Nueva conversación <span>↗</span>
      </button>
      <label className="history-search">
        <Icon name="search" size={17} />
        <input
          aria-label="Buscar conversaciones"
          placeholder="Buscar conversaciones"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="sidebar-section-label">
        TUS CONVERSACIONES{" "}
        <span>{saved.length}</span>
      </div>
      <nav className="conversation-list" aria-label="Conversaciones">
        {visible.map((conversation) => (
          <SideBarItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === activeId}
            disabled={busy}
            onSelect={() => onSelect(conversation.id)}
          />
        ))}
        {!visible.length && (
          <div className="history-empty">
            <span className="empty-chat-icon">
              <Icon name="chat" size={23} />
            </span>
            <p>
              {query
                ? "No encontramos esa conversación"
                : "Todo empieza con una idea"}
            </p>
            <span>
              {query
                ? "Probá con otra palabra."
                : "Tus conversaciones aparecerán acá."}
            </span>
          </div>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="mission-note">
          <span className="mission-icon">
            <Icon name="spark" size={19} />
          </span>
          <div>
            <strong>Una idea. Un buen prompt.</strong>
            <p>Explorá modelos y hacé que cada token cuente.</p>
          </div>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>Mi espacio de trabajo</strong>
            <span>Historial en este navegador</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <a
          className="asset-credit"
          href="https://www.magnific.com/es/vector-gratis/lindo-pinguino-agitando-mano-logotipo-dibujos-animados-icono-vectorial-ilustracion-icono-naturaleza-animal-icono-aislado-plano_282571352.htm"
          target="_blank"
          rel="noreferrer"
        >
          Pingüino por catalyststuff · Magnific
        </a>
      </div>
    </>
  );
}
