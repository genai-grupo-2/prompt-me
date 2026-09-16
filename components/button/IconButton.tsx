import type { ButtonHTMLAttributes } from "react";
import Icon, { type IconName } from "./Icon";

export default function IconButton({
  label,
  icon,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: IconName;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
