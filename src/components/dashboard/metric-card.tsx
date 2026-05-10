import type { LucideIcon } from "lucide-react";

const toneClasses = {
  leaf: "bg-leaf-100 text-leaf-700",
  saffron: "bg-saffron-100 text-saffron-700",
  clay: "bg-clay-100 text-clay-700",
};

export function MetricCard({
  label,
  value,
  helper,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  tone: keyof typeof toneClasses;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {value}
          </p>
        </div>
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{helper}</p>
    </article>
  );
}
