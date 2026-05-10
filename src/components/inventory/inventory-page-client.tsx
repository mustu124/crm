"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Minus, Plus, Search, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/components/ui/toast";
import type { InventoryItem, InventoryLog } from "@/lib/database.types";
import { getCurrentUserId } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type StockStatus = "OK" | "Low" | "Critical";

export function InventoryPageClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [itemsResult, logsResult] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_logs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (itemsResult.error || logsResult.error) {
      setError(
        itemsResult.error?.message ??
          logsResult.error?.message ??
          "Could not load inventory.",
      );
    } else {
      setItems(itemsResult.data ?? []);
      setLogs(logsResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const haystack = `${item.name} ${item.category ?? ""}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [items, query]);

  const lowStockCount = items.filter(
    (item) => getStockStatus(item) !== "OK",
  ).length;

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function deleteInventoryItem() {
    if (!itemToDelete) {
      return;
    }

    setDeleting(true);
    const { error: logsError } = await supabase
      .from("inventory_logs")
      .delete()
      .eq("item_id", itemToDelete.id);

    if (logsError) {
      showToast(logsError.message, "error");
      setDeleting(false);
      return;
    }

    const { error: itemError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", itemToDelete.id);

    if (itemError) {
      showToast(itemError.message, "error");
      setDeleting(false);
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemToDelete.id),
    );
    setLogs((currentLogs) =>
      currentLogs.filter((log) => log.item_id !== itemToDelete.id),
    );
    showToast(`${itemToDelete.name} was deleted.`);
    setItemToDelete(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Inventory
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            Materials in motion.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Track stock without turning your studio into a spreadsheet.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:mt-0">
          <button
            type="button"
            onClick={() => setStockOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-muted px-5 text-sm font-black text-foreground"
          >
            <Minus className="h-5 w-5" aria-hidden />
            Update Stock
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground shadow-card"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Add Item
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Items" value={items.length.toString()} />
        <SummaryTile label="Low alerts" value={lowStockCount.toString()} />
        <SummaryTile
          label="Movements"
          value={logs.length.toString()}
          icon={<Boxes className="h-5 w-5" aria-hidden />}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4">
          <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search material or category"
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          />
        </label>
      </section>

      {error ? <SetupNotice message={error} /> : null}

      {loading ? (
        <InventorySkeleton />
      ) : filteredItems.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              logs={logs.filter((log) => log.item_id === item.id).slice(0, 4)}
              onDelete={() => setItemToDelete(item)}
              onUpdate={() => setStockOpen(true)}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-2xl font-black">No materials yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
            Add wax, clay, fabric, labels, packaging, or any material you need
            to keep an eye on.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Add Item
          </button>
        </section>
      )}

      {addOpen ? (
        <AddItemModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            loadInventory();
          }}
        />
      ) : null}

      {stockOpen ? (
        <UpdateStockModal
          items={items}
          onClose={() => setStockOpen(false)}
          onUpdated={() => {
            setStockOpen(false);
            loadInventory();
          }}
        />
      ) : null}

      {itemToDelete ? (
        <ConfirmModal
          title="Delete inventory item?"
          description="This will permanently delete this item and all stock movement logs linked to it."
          confirmLabel="Delete Item"
          working={deleting}
          onCancel={() => setItemToDelete(null)}
          onConfirm={deleteInventoryItem}
        />
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

function InventoryCard({
  item,
  logs,
  onDelete,
}: {
  item: InventoryItem;
  logs: InventoryLog[];
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const status = getStockStatus(item);
  const statusClasses = {
    OK: "bg-leaf-100 text-leaf-700 border-leaf-500/20",
    Low: "bg-saffron-100 text-saffron-700 border-saffron-500/20",
    Critical: "bg-red-50 text-red-700 border-red-200",
  } satisfies Record<StockStatus, string>;

  return (
    <article
      className={`rounded-2xl border p-4 shadow-card sm:p-5 ${
        status === "Critical"
          ? "border-red-200 bg-red-50/80"
          : status === "Low"
            ? "border-saffron-500/25 bg-saffron-100/55"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight">{item.name}</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {item.category ?? "Uncategorized"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[status]}`}
          >
            {status}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
            title="Delete inventory item"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-black tracking-tight">
            {Number(item.quantity).toLocaleString("en-IN")}
          </p>
          <p className="text-sm font-bold text-muted-foreground">{item.unit}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/70 p-3 text-right">
          <p className="text-xs font-bold text-muted-foreground">Low at</p>
          <p className="text-sm font-black">
            {Number(item.low_stock_threshold).toLocaleString("en-IN")}{" "}
            {item.unit}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-black">Stock log</p>
        <div className="mt-2 space-y-2">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 p-3"
              >
                <div>
                  <p className="text-sm font-black">
                    {Number(log.change_amount) > 0 ? "+" : ""}
                    {Number(log.change_amount).toLocaleString("en-IN")}{" "}
                    {item.unit}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {log.reason ?? "Stock update"}
                  </p>
                </div>
                <p className="text-xs font-bold text-muted-foreground">
                  {new Date(log.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-3 text-sm font-semibold text-muted-foreground">
              No stock movement yet.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function AddItemModal({
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
    const userId = await getCurrentUserId();
    const quantity = Number(formData.get("quantity") ?? 0);

    const { data, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        category: String(formData.get("category") ?? "").trim() || null,
        low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 0),
        name: String(formData.get("name") ?? "").trim(),
        quantity,
        unit: String(formData.get("unit") ?? "").trim(),
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (data && quantity !== 0) {
      await supabase.from("inventory_logs").insert({
        change_amount: quantity,
        item_id: data.id,
        reason: "Opening stock",
        user_id: userId,
      });
    }

    onCreated();
  }

  return (
    <ModalFrame title="Add Item" eyebrow="New material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Field label="Material Name" name="name" required />
        <Field label="Category" name="category" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Unit" name="unit" required placeholder="kg, m, pcs" />
          <Field label="Quantity" name="quantity" required type="number" />
        </div>
        <Field
          label="Low Stock Threshold"
          name="low_stock_threshold"
          required
          type="number"
        />
        {error ? <ErrorMessage message={error} /> : null}
        <SubmitButton saving={saving} label="Save Item" />
      </form>
    </ModalFrame>
  );
}

function UpdateStockModal({
  items,
  onClose,
  onUpdated,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const userId = await getCurrentUserId();
    const itemId = String(formData.get("item_id") ?? "");
    const direction = String(formData.get("direction") ?? "in");
    const amount = Math.abs(Number(formData.get("amount") ?? 0));
    const changeAmount = direction === "out" ? amount * -1 : amount;
    const item = items.find((currentItem) => currentItem.id === itemId);

    if (!item || amount <= 0) {
      setError("Choose an item and enter a stock amount.");
      setSaving(false);
      return;
    }

    const nextQuantity = Number(item.quantity) + changeAmount;

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ quantity: nextQuantity })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const { error: logError } = await supabase.from("inventory_logs").insert({
      change_amount: changeAmount,
      item_id: item.id,
      reason: String(formData.get("reason") ?? "").trim() || "Stock update",
      user_id: userId,
    });

    if (logError) {
      setError(logError.message);
      setSaving(false);
      return;
    }

    onUpdated();
  }

  return (
    <ModalFrame title="Update Stock" eyebrow="Stock movement" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="grid gap-2 text-sm font-black">
          Item
          <select
            name="item_id"
            required
            className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Choose item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {Number(item.quantity).toLocaleString("en-IN")}{" "}
                {item.unit}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black">
            Movement
            <select
              name="direction"
              className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
            </select>
          </label>
          <Field label="Amount" name="amount" required type="number" />
        </div>
        <Field label="Reason" name="reason" placeholder="Order use, purchase" />
        {error ? <ErrorMessage message={error} /> : null}
        <SubmitButton saving={saving} label="Update Stock" />
      </form>
    </ModalFrame>
  );
}

function getStockStatus(item: InventoryItem): StockStatus {
  const quantity = Number(item.quantity);
  const threshold = Number(item.low_stock_threshold);

  if (threshold > 0 && quantity <= threshold / 2) {
    return "Critical";
  }

  if (threshold > 0 && quantity <= threshold) {
    return "Low";
  }

  return "OK";
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function ModalFrame({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-black text-muted-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="min-h-12 rounded-2xl border border-border bg-background/70 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

function SubmitButton({ label, saving }: { label: string; saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="mt-2 min-h-12 w-full rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground disabled:opacity-60"
    >
      {saving ? "Saving..." : label}
    </button>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
      {message}
    </p>
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

function InventorySkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-80 animate-pulse rounded-2xl border border-border bg-card shadow-card"
        />
      ))}
    </section>
  );
}
