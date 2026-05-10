"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  MessageCircle,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/clients/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/components/ui/toast";
import type { Client, Order, OrderStatus } from "@/lib/database.types";
import { getCurrentUserId } from "@/lib/auth";
import {
  formatCurrency,
  nextOrderStatus,
  orderStatusLabels,
  orderStatuses,
} from "@/lib/orders";
import { buildReportData, getLastProjectDate } from "@/lib/report-utils";
import { supabase } from "@/lib/supabase";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function ClientProfileClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [clientResult, ordersResult] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("orders")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ]);

    if (clientResult.error || ordersResult.error) {
      setError(
        clientResult.error?.message ??
          ordersResult.error?.message ??
          "Could not load this client.",
      );
    } else {
      setClient(clientResult.data);
      setOrders(ordersResult.data ?? []);
    }

    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const paymentSummary = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        const total = Number(order.total_value);
        const advance = Number(order.advance_paid);

        return {
          advance: summary.advance + advance,
          remaining: summary.remaining + Math.max(total - advance, 0),
          total: summary.total + total,
        };
      },
      { advance: 0, remaining: 0, total: 0 },
    );
  }, [orders]);
  const canArchive =
    orders.length > 0 &&
    orders.every(
      (order) => order.status === "delivered" || order.status === "cancelled",
    );

  async function cycleStatus(order: Order) {
    const nextStatus = nextOrderStatus(order.status);
    setUpdatingOrderId(order.id);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, status: nextStatus }
            : currentOrder,
        ),
      );
    }

    setUpdatingOrderId(null);
  }

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function deleteOrder() {
    if (!orderToDelete) {
      return;
    }

    setDeletingOrder(true);
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderToDelete.id);

    if (deleteError) {
      showToast(deleteError.message, "error");
      setDeletingOrder(false);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.id !== orderToDelete.id),
    );
    showToast(`${orderToDelete.title} was deleted.`);
    setOrderToDelete(null);
    setDeletingOrder(false);
  }

  async function archiveClient() {
    if (!client || !canArchive) {
      return;
    }

    setArchiving(true);
    setError(null);

    const userId = await getCurrentUserId();
    const reportData = buildReportData(client, orders);
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        client_id: client.id,
        report_data: reportData,
        user_id: userId,
      })
      .select()
      .single();

    if (reportError || !report) {
      setError(reportError?.message ?? "Could not create report.");
      setArchiving(false);
      return;
    }

    const { error: archiveError } = await supabase
      .from("archived_clients")
      .insert({
        id: client.id,
        last_project_date: getLastProjectDate(orders),
        name: client.name,
        phone: client.phone,
        report_id: report.id,
        summary_json: {
          advancePaid: reportData.paymentSummary.advancePaid,
          businessType: client.business_type,
          completedAt: reportData.completedAt,
          email: client.email,
          remaining: reportData.paymentSummary.remaining,
          totalOrders: orders.length,
          totalValue: reportData.paymentSummary.total,
        },
        tags: reportData.tags,
        user_id: userId,
      });

    if (archiveError) {
      setError(archiveError.message);
      setArchiving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (deleteError) {
      setError(deleteError.message);
      setArchiving(false);
      return;
    }

    router.push("/reports");
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !client) {
    return (
      <section className="rounded-2xl border border-saffron-500/25 bg-saffron-100 p-4 text-saffron-700 shadow-card">
        <p className="text-sm font-black">Client could not be loaded</p>
        <p className="mt-1 text-sm font-semibold leading-6">
          {error ?? "No client was found for this id."}
        </p>
        <Link
          href="/clients"
          className="mt-4 inline-flex text-sm font-black text-accent"
        >
          Back to clients
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Clients
        </Link>
        <div className="mt-5 lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
              Client profile
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {client.name}
            </h1>
            <p className="mt-3 text-base font-semibold text-muted-foreground">
              {client.business_type ?? "Local business"} · {client.phone}
            </p>
            {client.email ? (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {client.email}
              </p>
            ) : null}
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:mt-0">
            {canArchive ? (
              <button
                type="button"
                onClick={archiveClient}
                disabled={archiving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-clay-900 px-5 text-sm font-black text-white shadow-card disabled:opacity-60"
              >
                <Archive className="h-5 w-5" aria-hidden />
                {archiving ? "Archiving..." : "Archive Client"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground shadow-card"
            >
              <Plus className="h-5 w-5" aria-hidden />
              Add Order
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total" value={formatCurrency(paymentSummary.total)} />
        <SummaryCard
          label="Advance Paid"
          value={formatCurrency(paymentSummary.advance)}
        />
        <SummaryCard
          label="Remaining"
          value={formatCurrency(paymentSummary.remaining)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Orders
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {orders.length} active records
              </h2>
            </div>
            <ReceiptText className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>

          <div className="mt-5 space-y-3">
            {orders.length > 0 ? (
              orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-border/80 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">{order.title}</h3>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <CalendarDays className="h-4 w-4" aria-hidden />
                        {order.due_date ?? "No due date"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={order.status}
                        onClick={
                          updatingOrderId === order.id
                            ? undefined
                            : () => cycleStatus(order)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
                        title="Delete order"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <a
                    href={buildWhatsAppUrl(
                      client.phone,
                      `Hi ${client.name}, quick update on "${order.title}": status is ${orderStatusLabels[order.status]}. Balance remaining: ${formatCurrency(Math.max(Number(order.total_value) - Number(order.advance_paid), 0))}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-accent-foreground"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp update
                  </a>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniAmount
                      label="Total"
                      value={formatCurrency(Number(order.total_value))}
                    />
                    <MiniAmount
                      label="Advance"
                      value={formatCurrency(Number(order.advance_paid))}
                    />
                    <MiniAmount
                      label="Remaining"
                      value={formatCurrency(
                        Math.max(
                          Number(order.total_value) - Number(order.advance_paid),
                          0,
                        ),
                      )}
                    />
                  </div>
                  {order.notes ? (
                    <p className="mt-4 rounded-2xl bg-card p-3 text-sm font-semibold leading-6 text-muted-foreground">
                      {order.notes}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                <p className="font-black">No orders yet</p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Add the first order for this client.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <p className="text-sm font-semibold text-muted-foreground">Notes</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Order notes
          </h2>
          <div className="mt-5 space-y-3">
            {orders.filter((order) => order.notes).length > 0 ? (
              orders
                .filter((order) => order.notes)
                .map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-border/80 bg-background/60 p-3"
                  >
                    <p className="text-sm font-black">{order.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                      {order.notes}
                    </p>
                  </div>
                ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm font-semibold leading-6 text-muted-foreground">
                Notes added while creating orders will appear here.
              </p>
            )}
          </div>
        </section>
      </div>

      {modalOpen ? (
        <AddOrderModal
          clientId={client.id}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            loadClient();
          }}
        />
      ) : null}

      {orderToDelete ? (
        <ConfirmModal
          title="Delete order?"
          description="Delete this order permanently?"
          confirmLabel="Delete Order"
          working={deletingOrder}
          onCancel={() => setOrderToDelete(null)}
          onConfirm={deleteOrder}
        />
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function MiniAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function AddOrderModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const userId = await getCurrentUserId();
    const totalValue = Number(formData.get("total_value") ?? 0);
    const advancePaid = Number(formData.get("advance_paid") ?? 0);

    const { error: insertError } = await supabase.from("orders").insert({
      advance_paid: advancePaid,
      client_id: clientId,
      due_date: String(formData.get("due_date") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: formData.get("status") as OrderStatus,
      title: String(formData.get("title") ?? "").trim(),
      total_value: totalValue,
      user_id: userId,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-3 backdrop-blur-sm sm:place-items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
              New order
            </p>
            <h2 className="mt-1 text-2xl font-black">Add Order</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-black text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <Field label="Order Title" name="title" required />
          <label className="grid gap-2 text-sm font-black">
            Status
            <select
              name="status"
              defaultValue="pending"
              className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
            >
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Total Value" name="total_value" required type="number" />
            <Field
              label="Advance Paid"
              name="advance_paid"
              required
              type="number"
            />
          </div>
          <Field label="Due Date" name="due_date" type="date" />
          <label className="grid gap-2 text-sm font-black">
            Notes
            <textarea
              name="notes"
              rows={4}
              className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 min-h-12 w-full rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <input
        name={name}
        required={required}
        type={type}
        min={type === "number" ? 0 : undefined}
        className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-card shadow-card" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-border bg-card shadow-card"
          />
        ))}
      </div>
    </div>
  );
}
