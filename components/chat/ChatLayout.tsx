"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function ChatLayout({
  sidebar,
  open,
  onClose,
  children,
}: {
  sidebar: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = sidebarRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, a[href]",
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
    const focusFrame = requestAnimationFrame(() => focusable()[0]?.focus());
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);
  return (
    <div className={`app-shell ${open ? "sidebar-open" : ""}`}>
      <a className="skip-link" href="#chat-input">
        Ir al mensaje
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={onClose}
          tabIndex={-1}
        />
      )}
      <aside
        ref={sidebarRef}
        id="conversation-sidebar"
        className="sidebar"
        aria-label="Barra lateral"
      >
        {sidebar}
      </aside>
      <main className="chat-main" inert={open}>{children}</main>
    </div>
  );
}
