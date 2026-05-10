"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Search, Trash2, UserRound } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/components/ui/toast";
import type { Client, Order, OrderStatus } from "@/lib/database.types";
import { formatCurrency, orderStatusLabels } from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type ClientSummary = Client & {
  activeOrders: number;
  pendingPayment: number;
  statuses: Set<OrderStatus>;
};

const activeOrderStatuses: OrderStatus[] = ["pending", "in_progress", "ready"];

export function ClientsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "payment" | OrderStatus>(
    "all",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientSummary | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [clientsResult, ordersResult] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", {
        ascending: false,
      }),
      supabase.from("orders").select("*").order("created_at", {
        ascending: false,
      }),
    ]);

    if (clientsResult.error || ordersResult.error) {
      setError(
        clientsResult.error?.message ??
          ordersResult.error?.message ??
          "Could not load clients.",
      );
    } else {
      setClients(clientsResult.data ?? []);
      setOrders(ordersResult.data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const summaries = useMemo(() => {
    return clients.map((client): ClientSummary => {
      const clientOrders = orders.filter((order) => order.client_id === client.id);
      const activeOrders = clientOrders.filter((order) =>
        activeOrderStatuses.includes(order.status),
      );
      const pendingPayment = clientOrders.reduce((sum, order) => {
        if (order.status === "cancelled" || order.status === "delivered") {
          return sum;
        }

        return (
          sum +
          Math.max(Number(order.total_value) - Number(order.advance_paid), 0)
        );
      }, 0);

      return {
        ...client,
        activeOrders: activeOrders.length,
        pendingPayment,
        statuses: new Set(clientOrders.map((order) => order.status)),
      };
    });
  }, [clients, orders]);

  const filteredClients = summaries.filter((client) => {
    const matchesQuery =
      client.name.toLowerCase().includes(query.toLowerCase()) ||
      client.business_type?.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && client.activeOrders > 0) ||
      (filter === "payment" && client.pendingPayment > 0) ||
      client.statuses.has(filter as OrderStatus);

    return matchesQuery && matchesFilter;
  });

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function deleteClient() {
    if (!clientToDelete) {
      return;
    }

    setDeleting(true);
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .eq("client_id", clientToDelete.id);

    if (ordersError) {
      showToast(ordersError.message, "error");
      setDeleting(false);
      return;
    }

    const { error: clientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientToDelete.id);

    if (clientError) {
      showToast(clientError.message, "error");
      setDeleting(false);
      return;
    }

    setClients((currentClients) =>
      currentClients.filter((client) => client.id !== clientToDelete.id),
    );
    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.client_id !== clientToDelete.id),
    );
    showToast(`${clientToDelete.name} was deleted.`);
    setClientToDelete(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Client book
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            Clients and orders.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            A WhatsApp-simple view of who is active, what is due, and which
            orders need movement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground shadow-card transition hover:translate-y-[-1px] lg:mt-0"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Add Client
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or business"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as typeof filter)
            }
            className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-black outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="all">All clients</option>
            <option value="active">Active orders</option>
            <option value="payment">Pending payment</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <SetupNotice message={error} /> : null}

      {loading ? (
        <ClientGridSkeleton />
      ) : filteredClients.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onDelete={() => setClientToDelete(client)}
            />
          ))}
        </section>
      ) : (
        <EmptyClients onAddClient={() => setModalOpen(true)} />
      )}

      {modalOpen ? (
        <AddClientModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            loadData();
          }}
        />
      ) : null}

      {clientToDelete ? (
        <ConfirmModal
          title="Delete client?"
          description="Are you sure? This will also delete all orders for this client."
          confirmLabel="Delete Client"
          working={deleting}
          onCancel={() => setClientToDelete(null)}
          onConfirm={deleteClient}
        />
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

function ClientCard({
  client,
  onDelete,
}: {
  client: ClientSummary;
  onDelete: () => void;
}) {
  const whatsappUrl = buildWhatsAppUrl(
    client.phone,
    `Hi ${client.name}, sharing a quick update from AppName. You have ${client.activeOrders} active order(s) and ${formatCurrency(client.pendingPayment)} pending.`,
  );

  return (
    <article className="group rounded-2xl border border-border bg-card p-4 shadow-card transition hover:translate-y-[-2px] hover:border-accent/40 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/clients/${client.id}`} className="hover:text-accent">
            <h2 className="text-xl font-black tracking-tight">{client.name}</h2>
          </Link>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {client.business_type ?? "Local business"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
            title="Delete client"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-foreground">{client.phone}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="text-2xl font-black">{client.activeOrders}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Active orders
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3">
          <p className="text-xl font-black">
            {formatCurrency(client.pendingPayment)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Payment due
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-muted px-4 text-sm font-black text-foreground"
        >
          View profile
        </Link>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-4 text-sm font-black text-accent-foreground"
          title="Send WhatsApp update"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
        </a>
      </div>
    </article>
  );
}

function AddClientModal({
  onClose,
  onCreated,
}: {
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
    const payload = {
      business_type: String(formData.get("business_type") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
    };

    const { error: insertError } = await supabase.from("clients").insert(payload);

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
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
              New client
            </p>
            <h2 className="mt-1 text-2xl font-black">Add Client</h2>
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
          <Field label="Name" name="name" required />
          <Field label="Phone" name="phone" required />
          <Field label="Email" name="email" type="email" />
          <Field label="Business Type" name="business_type" />
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
          {saving ? "Saving..." : "Save Client"}
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
        className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

function EmptyClients({ onAddClient }: { onAddClient: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
      <h2 className="text-2xl font-black">No clients here yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
        Add your client.
      </p>
      <button
        type="button"
        onClick={onAddClient}
        className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add Client
      </button>
    </section>
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-saffron-500/25 bg-saffron-100 p-4 text-saffron-700">
      <p className="text-sm font-black">Supabase needs attention</p>
      <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
      <p className="mt-2 text-sm font-semibold leading-6">
        Run the SQL in <span className="font-black">supabase/schema.sql</span>,
        then refresh this page.
      </p>
    </section>
  );
}

function ClientGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-56 animate-pulse rounded-2xl border border-border bg-card shadow-card"
        />
      ))}
    </section>
  );
}
