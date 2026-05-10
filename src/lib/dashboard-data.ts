import {
  AlertTriangle,
  Banknote,
  Clock3,
  PackageCheck,
  PackageSearch,
  Sparkles,
  UsersRound,
} from "lucide-react";

export const metrics = [
  {
    label: "Active Clients",
    value: "128",
    helper: "18 messaged this week",
    tone: "leaf",
    icon: UsersRound,
  },
  {
    label: "Pending Payments",
    value: "₹82,450",
    helper: "Across 21 invoices",
    tone: "saffron",
    icon: Banknote,
  },
  {
    label: "Low Stock Alerts",
    value: "9",
    helper: "Wax, clay, thread, labels",
    tone: "clay",
    icon: AlertTriangle,
  },
] as const;

export const orderStatuses = [
  {
    label: "Pending",
    count: 16,
    color: "bg-saffron-500",
    icon: Clock3,
  },
  {
    label: "In Progress",
    count: 24,
    color: "bg-accent",
    icon: Sparkles,
  },
  {
    label: "Ready",
    count: 11,
    color: "bg-leaf-500",
    icon: PackageCheck,
  },
  {
    label: "Delivered",
    count: 76,
    color: "bg-clay-500",
    icon: PackageSearch,
  },
  {
    label: "Cancelled",
    count: 3,
    color: "bg-stone-400",
    icon: AlertTriangle,
  },
] as const;

export const recentActivity = [
  "Asha Tailors paid ₹12,000",
  "4 soy wax jars moved to low stock",
  "Riya Studio order marked ready",
];
