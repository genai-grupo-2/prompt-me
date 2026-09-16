import Icon from "@/components/button/Icon";
import IconButton from "@/components/button/IconButton";

export default function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <Icon name="info" />
      <span>{message}</span>
      <IconButton icon="close" label="Cerrar aviso" onClick={onDismiss} />
    </div>
  );
}
