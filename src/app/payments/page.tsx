import { AppShell } from "@/components/dashboard/app-shell";
import { PaymentsPageClient } from "@/components/payments/payments-page-client";

export default function PaymentsPage() {
  return (
    <AppShell>
      <PaymentsPageClient />
    </AppShell>
  );
}
