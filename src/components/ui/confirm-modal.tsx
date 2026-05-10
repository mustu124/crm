export function ConfirmModal({
  confirmLabel = "Delete",
  description,
  onCancel,
  onConfirm,
  title,
  working,
}: {
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  working?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">
          Confirm
        </p>
        <h2 className="mt-1 text-2xl font-black">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="min-h-11 rounded-2xl bg-muted px-4 text-sm font-black text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="min-h-11 rounded-2xl bg-red-700 px-4 text-sm font-black text-white disabled:opacity-60"
          >
            {working ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
