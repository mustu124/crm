import { ClientProfileClient } from "@/components/clients/client-profile-client";
import { AppShell } from "@/components/dashboard/app-shell";

export default function ClientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AppShell>
      <ClientProfileClient clientId={params.id} />
    </AppShell>
  );
}
