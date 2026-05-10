import { InventoryPageClient } from "@/components/inventory/inventory-page-client";
import { AppShell } from "@/components/dashboard/app-shell";

export default function InventoryPage() {
  return (
    <AppShell>
      <InventoryPageClient />
    </AppShell>
  );
}
