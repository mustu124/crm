import type { OrderStatus } from "@/lib/database.types";
import { orderStatusClasses, orderStatusLabels } from "@/lib/orders";

export function StatusBadge({
  status,
  onClick,
}: {
  status: OrderStatus;
  onClick?: () => void;
}) {
  const content = (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${orderStatusClasses[status]}`}
    >
      {orderStatusLabels[status]}
    </span>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full outline-none transition hover:scale-[1.02] focus:ring-2 focus:ring-accent/35"
      title="Tap to move to the next status"
    >
      {content}
    </button>
  );
}
