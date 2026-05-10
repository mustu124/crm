import { jsPDF } from "jspdf";
import type { Client, Order, ReportData } from "@/lib/database.types";
import { formatCurrency, orderStatusLabels } from "@/lib/orders";

export function buildReportData(client: Client, orders: Order[]): ReportData {
  const paymentSummary = orders.reduce(
    (summary, order) => {
      const total = Number(order.total_value);
      const advance = Number(order.advance_paid);

      return {
        advancePaid: summary.advancePaid + advance,
        remaining: summary.remaining + Math.max(total - advance, 0),
        total: summary.total + total,
      };
    },
    { advancePaid: 0, remaining: 0, total: 0 },
  );
  const completedAt = new Date().toISOString();
  const tags = [client.business_type, "archived"]
    .filter(Boolean)
    .map((tag) => String(tag));

  return {
    client,
    completedAt,
    notes: orders
      .map((order) => order.notes)
      .filter((note): note is string => Boolean(note)),
    orders,
    paymentSummary,
    tags,
  };
}

export function getLastProjectDate(orders: Order[]) {
  const dates = orders
    .map((order) => order.due_date ?? order.created_at)
    .filter(Boolean)
    .map((date) => new Date(date));

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())))
    .toISOString()
    .slice(0, 10);
}

export function downloadReportPdf(reportData: ReportData) {
  const doc = new jsPDF();
  const left = 16;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AppName Client Completion Report", left, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Completion date: ${formatDate(reportData.completedAt)}`, left, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Client Details", left, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  [
    `Name: ${reportData.client.name}`,
    `Phone: ${reportData.client.phone}`,
    `Email: ${reportData.client.email ?? "Not provided"}`,
    `Business type: ${reportData.client.business_type ?? "Local business"}`,
  ].forEach((line) => {
    doc.text(line, left, y);
    y += 6;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Payment Breakdown", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total value: ${formatCurrency(reportData.paymentSummary.total)}`, left, y);
  y += 6;
  doc.text(
    `Advance paid: ${formatCurrency(reportData.paymentSummary.advancePaid)}`,
    left,
    y,
  );
  y += 6;
  doc.text(
    `Remaining: ${formatCurrency(reportData.paymentSummary.remaining)}`,
    left,
    y,
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Order History", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  reportData.orders.forEach((order, index) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }

    const lines = doc.splitTextToSize(
      `${index + 1}. ${order.title} | ${orderStatusLabels[order.status]} | Total ${formatCurrency(Number(order.total_value))} | Paid ${formatCurrency(Number(order.advance_paid))} | Due ${order.due_date ?? "No date"}`,
      178,
    );
    doc.text(lines, left, y);
    y += lines.length * 5 + 2;

    if (order.notes) {
      const noteLines = doc.splitTextToSize(`Notes: ${order.notes}`, 170);
      doc.text(noteLines, left + 4, y);
      y += noteLines.length * 5 + 2;
    }
  });

  if (reportData.notes.length > 0) {
    y += 4;
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Notes", left, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    reportData.notes.forEach((note) => {
      const noteLines = doc.splitTextToSize(`- ${note}`, 178);
      doc.text(noteLines, left, y);
      y += noteLines.length * 5 + 2;
    });
  }

  doc.save(
    `${reportData.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.pdf`,
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
