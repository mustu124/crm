import { AppShell } from "@/components/dashboard/app-shell";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

export default function ClientsPage() {
  return (
    <AppShell>
      <ClientsPageClient />
    </AppShell>
  );
}
