import Icon from "@/components/button/Icon";
import type { Conversation } from "@/types/chat";
import { getModel } from "@/lib/chat/ui-models";

export default function SideBarItem({
  conversation,
  active,
  disabled,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`conversation-item ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
      disabled={disabled}
    >
      <Icon name="chat" size={17} />
      <span>
        <span className="conversation-title">{conversation.title}</span>
        <span className="conversation-model">
          {getModel(conversation.model).name}
        </span>
      </span>
    </button>
  );
}
