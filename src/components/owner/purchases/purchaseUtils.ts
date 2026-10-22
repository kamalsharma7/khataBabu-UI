import type { PurchasePaymentMode, PurchasePaymentStatus } from "../../../types/owner";

export const PAYMENT_MODES: { id: PurchasePaymentMode; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "bank", label: "Bank transfer" },
  { id: "credit", label: "Credit (pay later)" },
  { id: "other", label: "Other" },
];

export const PURCHASE_UNITS = ["kg", "g", "ltr", "ml", "pcs", "pkt", "box", "bunch", "dozen"];

export function paymentModeLabel(mode: string | null | undefined): string {
  if (!mode) return "—";
  return PAYMENT_MODES.find((m) => m.id === mode)?.label ?? mode;
}

export function paymentStatusLabel(status: PurchasePaymentStatus): string {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partially paid";
  return "Unpaid";
}

export function num(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

export function inr(value: string | number | null | undefined, fraction = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(num(value));
}

export function qty(value: string | number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(num(value));
}

export function isoToday(): string {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
