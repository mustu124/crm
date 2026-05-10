import type { LucideIcon } from "lucide-react";

export function OrdersByStatus({
  statuses,
}: {
  statuses: ReadonlyArray<{
    label: string;
    count: number;
    color: string;
    icon: LucideIcon;
  }>;
}) {
  const total = statuses.reduce((sum, status) => sum + status.count, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Orders by Status
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{total} orders</h2>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">
          Live snapshot
        </span>
      </div>

      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted">
        {statuses.map((status) => (
          <div
            key={status.label}
            className={status.color}
            style={{ width: total > 0 ? `${(status.count / total) * 100}%` : "0%" }}
            aria-label={`${status.label}: ${status.count}`}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statuses.map((status) => {
          const Icon = status.icon;

          return (
            <div
              key={status.label}
              className="rounded-2xl border border-border/80 bg-background/60 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-4 text-2xl font-black">{status.count}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {status.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
