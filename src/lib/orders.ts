import type { OrderStatus } from "@/lib/database.types";

export const orderStatuses: OrderStatus[] = [
  "pending",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const orderStatusClasses: Record<OrderStatus, string> = {
  pending: "bg-saffron-100 text-saffron-700 border-saffron-500/20",
  in_progress: "bg-accent-soft text-accent border-accent/20",
  ready: "bg-leaf-100 text-leaf-700 border-leaf-500/20",
  delivered: "bg-clay-100 text-clay-700 border-clay-500/20",
  cancelled: "bg-stone-100 text-stone-600 border-stone-300",
};

export function nextOrderStatus(status: OrderStatus) {
  const index = orderStatuses.indexOf(status);

  return orderStatuses[(index + 1) % orderStatuses.length];
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
