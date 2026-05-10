"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  Download,
  FileText,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/clients/status-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Toast } from "@/components/ui/toast";
import type { ArchivedClient, Report } from "@/lib/database.types";
import { formatCurrency } from "@/lib/orders";
import {
  downloadReportPdf,
  formatDate,
} from "@/lib/report-utils";
import { supabase } from "@/lib/supabase";

type ArchivedWithReport = ArchivedClient & {
  report?: Report;
};

export function ReportsPageClient() {
  const [archives, setArchives] = useState<ArchivedClient[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeClientIds, setActiveClientIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [archiveToDelete, setArchiveToDelete] =
    useState<ArchivedWithReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [archivesResult, reportsResult, clientsResult] = await Promise.all([
      supabase
        .from("archived_clients")
        .select("*")
        .order("last_project_date", { ascending: false, nullsFirst: false }),
      supabase.from("reports").select("*").order("created_at", {
        ascending: false,
      }),
      supabase.from("clients").select("id"),
    ]);

    if (archivesResult.error || reportsResult.error || clientsResult.error) {
      setError(
        archivesResult.error?.message ??
          reportsResult.error?.message ??
          clientsResult.error?.message ??
          "Could not load reports.",
      );
    } else {
      setArchives(archivesResult.data ?? []);
      setReports(reportsResult.data ?? []);
      setActiveClientIds(
        new Set((clientsResult.data ?? []).map((client) => client.id)),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const archivedWithReports = useMemo(() => {
    return archives.map((archive) => ({
      ...archive,
      report: reports.find((report) => report.id === archive.report_id),
    }));
  }, [archives, reports]);

  const filteredArchives = archivedWithReports.filter((archive) => {
    const date = archive.last_project_date ?? "";
    const haystack = `${archive.name} ${archive.phone} ${date}`.toLowerCase();

    return haystack.includes(query.toLowerCase());
  });
  const selectedReport =
    archivedWithReports.find((archive) => archive.id === selectedId) ??
    filteredArchives[0];

  async function restoreClient(archive: ArchivedWithReport) {
    setRestoringId(archive.id);
    setRestoreMessage(null);
    setError(null);

    const reportData = archive.report?.report_data;

    if (activeClientIds.has(archive.id)) {
      setRestoreMessage(`${archive.name} is already active.`);
      setRestoringId(null);
      return;
    }

    const { error: restoreError } = await supabase.from("clients").insert({
      business_type:
        reportData?.client.business_type ??
        archive.tags.filter((tag) => tag !== "archived").join(", ") ??
        null,
      email: reportData?.client.email ?? null,
      id: archive.id,
      name: archive.name,
      phone: archive.phone,
    });

    if (restoreError) {
      setError(restoreError.message);
    } else {
      setActiveClientIds((current) => new Set(current).add(archive.id));
      setRestoreMessage(
        `${archive.name} has been restored to active clients. Original report stays here for reference.`,
      );
    }

    setRestoringId(null);
  }

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function deleteReport() {
    if (!archiveToDelete) {
      return;
    }

    setDeleting(true);
    const { error: archiveError } = await supabase
      .from("archived_clients")
      .delete()
      .eq("id", archiveToDelete.id);

    if (archiveError) {
      showToast(archiveError.message, "error");
      setDeleting(false);
      return;
    }

    if (archiveToDelete.report_id) {
      const { error: reportError } = await supabase
        .from("reports")
        .delete()
        .eq("id", archiveToDelete.report_id);

      if (reportError) {
        showToast(reportError.message, "error");
        setDeleting(false);
        return;
      }
    }

    setArchives((currentArchives) =>
      currentArchives.filter((archive) => archive.id !== archiveToDelete.id),
    );
    setReports((currentReports) =>
      currentReports.filter((report) => report.id !== archiveToDelete.report_id),
    );
    if (selectedId === archiveToDelete.id) {
      setSelectedId(null);
    }
    showToast(`${archiveToDelete.name} report was deleted.`);
    setArchiveToDelete(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Reports
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            Completed client history.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Search archived clients, review project history, export a PDF, or
            restore a client when they come back.
          </p>
        </div>
        <div className="mt-5 rounded-2xl bg-accent px-4 py-3 text-accent-foreground lg:mt-0">
          <p className="text-sm font-semibold opacity-85">Generated reports</p>
          <p className="mt-1 text-2xl font-black">{archives.length}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4">
          <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, or date"
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          />
        </label>
      </section>

      {error ? <SetupNotice message={error} /> : null}
      {restoreMessage ? (
        <section className="rounded-2xl border border-leaf-500/25 bg-leaf-100 p-4 text-leaf-700">
          <p className="text-sm font-black">{restoreMessage}</p>
        </section>
      ) : null}

      {loading ? (
        <ReportsSkeleton />
      ) : filteredArchives.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <section className="space-y-3">
            {filteredArchives.map((archive) => (
              <article
                key={archive.id}
                className={`w-full rounded-2xl border p-4 text-left shadow-card transition ${
                  selectedReport?.id === archive.id
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(archive.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h2 className="text-lg font-black">{archive.name}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Phone className="h-4 w-4" aria-hidden />
                      {archive.phone}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" aria-hidden />
                    <button
                      type="button"
                      onClick={() => setArchiveToDelete(archive)}
                      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
                      title="Delete report"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold text-muted-foreground">
                  Last project:{" "}
                  {archive.last_project_date
                    ? formatDate(archive.last_project_date)
                    : "Not set"}
                </p>
              </article>
            ))}
          </section>

          {selectedReport ? (
            <ReportDetail
              archive={selectedReport}
              isActive={activeClientIds.has(selectedReport.id)}
              restoring={restoringId === selectedReport.id}
              onRestore={() => restoreClient(selectedReport)}
            />
          ) : null}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
          <h2 className="text-2xl font-black">No reports yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
            Archive a completed client to generate the first report.
          </p>
        </section>
      )}

      {archiveToDelete ? (
        <ConfirmModal
          title="Delete report?"
          description="This will permanently remove the archived report and client record."
          confirmLabel="Delete Report"
          working={deleting}
          onCancel={() => setArchiveToDelete(null)}
          onConfirm={deleteReport}
        />
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}

function ReportDetail({
  archive,
  isActive,
  onRestore,
  restoring,
}: {
  archive: ArchivedWithReport;
  isActive: boolean;
  onRestore: () => void;
  restoring: boolean;
}) {
  const reportData = archive.report?.report_data;

  if (!reportData) {
    return (
      <section className="rounded-2xl border border-saffron-500/25 bg-saffron-100 p-4 text-saffron-700">
        <p className="text-sm font-black">Report data missing</p>
        <p className="mt-1 text-sm font-semibold">
          This archive does not have a linked full report.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Report details
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {reportData.client.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Completed {formatDate(reportData.completedAt)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => downloadReportPdf(reportData)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-muted px-4 text-sm font-black text-foreground"
          >
            <Download className="h-5 w-5" aria-hidden />
            Export PDF
          </button>
          <button
            type="button"
            disabled={isActive || restoring}
            onClick={onRestore}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-accent-foreground disabled:opacity-60"
          >
            <ArchiveRestore className="h-5 w-5" aria-hidden />
            {isActive ? "Restored" : restoring ? "Restoring..." : "Restore Client"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MiniAmount
          label="Total"
          value={formatCurrency(reportData.paymentSummary.total)}
        />
        <MiniAmount
          label="Advance Paid"
          value={formatCurrency(reportData.paymentSummary.advancePaid)}
        />
        <MiniAmount
          label="Remaining"
          value={formatCurrency(reportData.paymentSummary.remaining)}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border/80 bg-background/60 p-4">
        <p className="text-sm font-black">Client details</p>
        <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground sm:grid-cols-2">
          <p>Name: {reportData.client.name}</p>
          <p>Phone: {reportData.client.phone}</p>
          <p>Email: {reportData.client.email ?? "Not provided"}</p>
          <p>Tags: {archive.tags.join(", ") || "None"}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-black">Order history</p>
        {reportData.orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-border/80 bg-background/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{order.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Due {order.due_date ?? "No date"}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniAmount
                label="Total"
                value={formatCurrency(Number(order.total_value))}
              />
              <MiniAmount
                label="Paid"
                value={formatCurrency(Number(order.advance_paid))}
              />
              <MiniAmount
                label="Remaining"
                value={formatCurrency(
                  Math.max(Number(order.total_value) - Number(order.advance_paid), 0),
                )}
              />
            </div>
            {order.notes ? (
              <p className="mt-4 rounded-2xl bg-card p-3 text-sm font-semibold leading-6 text-muted-foreground">
                {order.notes}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniAmount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-saffron-500/25 bg-saffron-100 p-4 text-saffron-700">
      <p className="text-sm font-black">Supabase needs attention</p>
      <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
      <p className="mt-2 text-sm font-semibold leading-6">
        Run the final SQL in <span className="font-black">supabase/schema.sql</span>,
        then refresh this page.
      </p>
    </section>
  );
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-card" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-card shadow-card" />
    </div>
  );
}
