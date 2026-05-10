"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Clock3,
  PackageCheck,
  PackageSearch,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OrdersByStatus } from "@/components/dashboard/orders-by-status";
import type { Client, InventoryItem, Order, OrderStatus } from "@/lib/database.types";
import {
  formatCurrency,
  orderStatusLabels,
  orderStatuses,
} from "@/lib/orders";
import { supabase } from "@/lib/supabase";

const statusMeta: Record<
  OrderStatus,
  { color: string; icon: typeof Clock3 }
> = {
  pending: { color: "bg-saffron-500", icon: Clock3 },
  in_progress: { color: "bg-accent", icon: Sparkles },
  ready: { color: "bg-leaf-500", icon: PackageCheck },
  delivered: { color: "bg-clay-500", icon: PackageSearch },
  cancelled: { color: "bg-stone-400", icon: AlertTriangle },
};

export function DashboardPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [clientsResult, ordersResult, inventoryResult] = await Promise.all([
      supabase.from("clients").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("inventory_items").select("*"),
    ]);

    if (clientsResult.error || ordersResult.error || inventoryResult.error) {
      setError(
        clientsResult.error?.message ??
          ordersResult.error?.message ??
          inventoryResult.error?.message ??
          "Could not load dashboard.",
      );
    } else {
      setClients(clientsResult.data ?? []);
      setOrders(ordersResult.data ?? []);
      setInventoryItems(inventoryResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboard = useMemo(() => {
    const pendingPayments = orders.reduce((sum, order) => {
      if (order.status === "delivered" || order.status === "cancelled") {
        return sum;
      }

      return (
        sum +
        Math.max(Number(order.total_value) - Number(order.advance_paid), 0)
      );
    }, 0);
    const lowStockAlerts = inventoryItems.filter(
      (item) =>
        Number(item.low_stock_threshold) > 0 &&
        Number(item.quantity) <= Number(item.low_stock_threshold),
    ).length;
    const statuses = orderStatuses.map((status) => ({
      count: orders.filter((order) => order.status === status).length,
      label: orderStatusLabels[status],
      ...statusMeta[status],
    }));
    const recentActivity = [
      orders[0]
        ? `${orders[0].title} is ${orderStatusLabels[orders[0].status]}`
        : "No order movement yet",
      inventoryItems.find(
        (item) =>
          Number(item.low_stock_threshold) > 0 &&
          Number(item.quantity) <= Number(item.low_stock_threshold),
      )
        ? `${inventoryItems.find((item) => Number(item.low_stock_threshold) > 0 && Number(item.quantity) <= Number(item.low_stock_threshold))?.name} is low on stock`
        : "Inventory levels look steady",
      pendingPayments > 0
        ? `${formatCurrency(pendingPayments)} pending collection`
        : "No pending payment balance",
    ];

    return {
      lowStockAlerts,
      pendingPayments,
      recentActivity,
      statuses,
    };
  }, [inventoryItems, orders]);

  const metrics = [
    {
      helper: loading ? "Checking Supabase" : "Clients in your book",
      icon: UsersRound,
      label: "Active Clients",
      tone: "leaf" as const,
      value: loading ? "..." : clients.length.toString(),
    },
    {
      helper: "Undelivered, uncancelled orders",
      icon: Banknote,
      label: "Pending Payments",
      tone: "saffron" as const,
      value: loading ? "..." : formatCurrency(dashboard.pendingPayments),
    },
    {
      helper: "Items at or below threshold",
      icon: AlertTriangle,
      label: "Low Stock Alerts",
      tone: "clay" as const,
      value: loading ? "..." : dashboard.lowStockAlerts.toString(),
    },
  ];

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-base font-black text-accent-foreground">
              A
            </div>
            <div>
              <p className="font-black leading-tight">AppName</p>
              <p className="text-xs font-semibold text-muted-foreground">
                Maker OS
              </p>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Live dashboard
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-5xl">
            Your shop, today.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Real-time counts for clients, cash, stock, and order movement.
          </p>
        </div>
        <div className="mt-5 rounded-2xl bg-accent px-4 py-3 text-accent-foreground lg:mt-0 lg:min-w-52">
          <p className="text-sm font-semibold opacity-85">Next action</p>
          <p className="mt-1 text-lg font-black">
            {dashboard.lowStockAlerts > 0
              ? "Restock low items"
              : "Review pending orders"}
          </p>
        </div>
      </header>

      {error ? <SetupNotice message={error} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <OrdersByStatus statuses={dashboard.statuses} />

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <p className="text-sm font-semibold text-muted-foreground">
            Recent activity
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Latest updates
          </h2>
          <div className="mt-5 space-y-3">
            {dashboard.recentActivity.map((activity) => (
              <div
                key={activity}
                className="flex gap-3 rounded-2xl border border-border/80 bg-background/60 p-3"
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                <p className="text-sm font-semibold leading-5">{activity}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-saffron-500/25 bg-saffron-100 p-4 text-saffron-700">
      <p className="text-sm font-black">Supabase needs attention</p>
      <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
      <p className="mt-2 text-sm font-semibold leading-6">
        Run the latest SQL in <span className="font-black">supabase/schema.sql</span>,
        then refresh this page.
      </p>
    </section>
  );
}
