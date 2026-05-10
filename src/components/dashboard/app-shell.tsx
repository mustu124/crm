"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  LucideIcon,
  UsersRound,
} from "lucide-react";

const navItems: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: UsersRound },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-24 text-foreground lg:pb-0">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-border/80 bg-card/90 px-4 py-5 shadow-card backdrop-blur-xl lg:block">
        <Brand />
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const active = item.href !== "#" && pathname.startsWith(item.href);

            return <NavLink key={item.label} {...item} active={active} />;
          })}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-border bg-clay-50 p-4">
          <p className="text-sm font-semibold text-clay-900">Today looks steady</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            6 orders need a quick check before evening dispatch.
          </p>
        </div>
      </aside>

      <main className="mx-auto w-full px-4 py-4 sm:px-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:max-w-none lg:px-8 lg:py-8">
        {children}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-18px_40px_-30px_rgba(92,54,30,0.65)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href !== "#" && pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.72rem] font-semibold transition ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-lg font-black text-accent-foreground shadow-card">
        A
      </div>
      <div>
        <p className="text-lg font-black tracking-tight">AppName</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Maker OS
        </p>
      </div>
    </Link>
  );
}

function NavLink({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-accent text-accent-foreground shadow-card"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
