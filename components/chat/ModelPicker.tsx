"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_MODELS, getModel, type ModelId } from "@/lib/chat/ui-models";
import Icon from "@/components/button/Icon";

export default function ModelPicker({
  value,
  disabled,
  onChange,
}: {
  value: ModelId;
  disabled: boolean;
  onChange: (model: ModelId) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const model = getModel(value);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="model-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="model-trigger"
        aria-expanded={open}
        aria-controls="model-options"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className={`model-mark ${model.color}`}>{model.initial}</span>
        <span>{model.name}</span>
        <Icon name="down" size={15} />
      </button>
      {open && (
        <div className="model-popover" id="model-options">
          <p>ELEGÍ TU MODELO</p>
          {CHAT_MODELS.map((item) => (
            <button
              key={item.id}
              className="model-option"
              aria-pressed={value === item.id}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span className={`model-mark ${item.color}`}>{item.initial}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>
              {value === item.id && <Icon name="check" size={17} />}
            </button>
          ))}
          <span className="model-note">
            Cambiar de modelo inicia una conversación nueva.
          </span>
        </div>
      )}
    </div>
  );
}
