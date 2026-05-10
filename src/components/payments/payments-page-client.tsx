"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, MessageCircle, WalletCards } from "lucide-react";
import type { Client, Order } from "@/lib/database.types";
import { formatCurrency, orderStatusLabels } from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type PaymentOrder = Order & {
  client: Client;
  remaining: number;
};

export function PaymentsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [clientsResult, ordersResult] = await Promise.all([
      supabase.from("clients").select("*"),
      supabase
        .from("orders")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false }),
    ]);

    if (clientsResult.error || ordersResult.error) {
      setError(
        clientsResult.error?.message ??
          ordersResult.error?.message ??
          "Could not load payments.",
      );
    } else {
      setClients(clientsResult.data ?? []);
      setOrders(ordersResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const paymentOrders = useMemo(() => {
    return orders
      .map((order) => {
        const client = clients.find((item) => item.id === order.client_id);
        const remaining = Math.max(
          Number(order.total_value) - Number(order.advance_paid),
          0,
        );

        if (
          !client ||
          remaining <= 0 ||
          order.status === "delivered" ||
          order.status === "cancelled"
        ) {
          return null;
        }

        return { ...order, client, remaining };
      })
      .filter(Boolean) as PaymentOrder[];
  }, [clients, orders]);

  const totals = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return {
      overdue: paymentOrders.reduce((sum, order) => {
        if (order.due_date && new Date(order.due_date) < now) {
          return sum + order.remaining;
        }

        return sum;
      }, 0),
      pending: paymentOrders.reduce((sum, order) => sum + order.remaining, 0),
      weekCollected: orders.reduce((sum, order) => {
        if (new Date(order.created_at) >= weekStart) {
          return sum + Number(order.advance_paid);
        }

        return sum;
      }, 0),
    };
  }, [orders, paymentOrders]);

  async function markReceived(order: PaymentOrder) {
    setUpdatingOrderId(order.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ advance_paid: Number(order.total_value) })
      .eq("id", order.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, advance_paid: Number(order.total_value) }
            : currentOrder,
        ),
      );
    }

    setUpdatingOrderId(null);
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Payments
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            Money still to collect.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            See outstanding balances, nudge customers, and close dues when the
            payment lands.
          </p>
        </div>
        <div className="mt-5 rounded-2xl bg-accent px-4 py-3 text-accent-foreground lg:mt-0">
          <p className="text-sm font-semibold opacity-85">Total pending</p>
          <p className="mt-1 text-2xl font-black">
            {formatCurrency(totals.pending)}
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <PaymentMetric
          label="This Week Collected"
          value={formatCurrency(totals.weekCollected)}
          icon={<WalletCards className="h-5 w-5" aria-hidden />}
        />
        <PaymentMetric
          label="Total Pending"
          value={formatCurrency(totals.pending)}
          icon={<Clock3 className="h-5 w-5" aria-hidden />}
        />
        <PaymentMetric
          label="Overdue"
          value={formatCurrency(totals.overdue)}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
        />
      </section>

      {error ? <SetupNotice message={error} /> : null}

      {loading ? (
        <PaymentSkeleton />
      ) : paymentOrders.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {paymentOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {order.client.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {order.title} · {orderStatusLabels[order.status]}
                  </p>
                </div>
                <p className="rounded-full bg-saffron-100 px-3 py-1 text-sm font-black text-saffron-700">
                  {formatCurrency(order.remaining)}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniAmount
                  label="Total"
                  value={formatCurrency(Number(order.total_value))}
                />
                <MiniAmount
                  label="Paid"
                  value={formatCurrency(Number(order.advance_paid))}
                />
                <MiniAmount
                  label="Due"
                  value={order.due_date ?? "No date"}
                />
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={updatingOrderId === order.id}
                  onClick={() => markReceived(order)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-accent-foreground disabled:opacity-60"
                >
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  {updatingOrderId === order.id
                    ? "Updating..."
                    : "Mark received"}
                </button>
                <a
                  href={buildWhatsAppUrl(
                    order.client.phone,
                    `Hi ${order.client.name}, a quick reminder for "${order.title}". Pending balance: ${formatCurrency(order.remaining)}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-muted px-4 text-sm font-black text-foreground"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  WhatsApp
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-2xl font-black">No outstanding balances</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
            Orders with pending payment will appear here.
          </p>
        </section>
      )}
    </div>
  );
}

function PaymentMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="text-accent">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function MiniAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
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

function PaymentSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-card"
        />
      ))}
    </section>
  );
}
