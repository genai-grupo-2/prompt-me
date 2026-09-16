import Image from "next/image";

export default function ChatAvatar({
  size = "small",
}: {
  size?: "small" | "brand" | "hero";
}) {
  return (
    <span className={`penguin-avatar penguin-avatar--${size}`}>
      <Image
        src="/penguin.jpg"
        alt="Pingüino de Prompt Me saludando"
        width={626}
        height={626}
        className="penguin-image"
        loading="eager"
      />
    </span>
  );
}
