import { AppShell } from "@/components/dashboard/app-shell";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardPageClient />
    </AppShell>
  );
}
