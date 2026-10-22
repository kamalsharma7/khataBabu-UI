import type { CustomerRelation, CustomerSegment, OrderType, PaymentMethod } from "../../../types/owner";

export const SEGMENT_META: Record<CustomerSegment, { label: string; hint: string }> = {
  vip: { label: "VIP", hint: "10+ visits or ₹10,000+ lifetime spend" },
  regular: { label: "Regular", hint: "3+ visits, seen in the last 45 days" },
  occasional: { label: "Occasional", hint: "2 visits so far" },
  new: { label: "New", hint: "First visit recorded" },
  at_risk: { label: "At risk", hint: "Used to come, but no visit in 45–90 days" },
  lost: { label: "Lost", hint: "No visit in 90+ days" },
  prospect: { label: "No visit yet", hint: "In CRM but no settled bill" },
};

export const SEGMENT_ORDER: CustomerSegment[] = [
  "vip",
  "regular",
  "occasional",
  "new",
  "at_risk",
  "lost",
  "prospect",
];

export const RELATION_OPTIONS: { value: CustomerRelation; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "friend", label: "Friend" },
  { value: "worker", label: "Worker" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

export const QUICK_TAGS = ["Regular", "Corporate", "Family", "Party host", "Delivery", "Complains", "Influencer"];

export function segmentLabel(seg: CustomerSegment): string {
  return SEGMENT_META[seg]?.label ?? seg;
}

export function orderTypeLabel(t: OrderType | null | undefined): string {
  if (t === "dine_in") return "Dine-in";
  if (t === "takeaway") return "Takeaway";
  if (t === "delivery") return "Delivery";
  return "—";
}

export function paymentLabel(m: PaymentMethod): string {
  if (m === "due") return "Khata (due)";
  if (m === "upi") return "UPI";
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function num(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function inr(v: string | number | null | undefined): string {
  return `₹${num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysAgoLabel(days: number | null | undefined, fallback = "Never"): string {
  if (days === null || days === undefined) return fallback;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${(days / 365).toFixed(1)} yr ago`;
}

export function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

export function normalizeMobile(v: string): string {
  let d = digitsOnly(v);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export function waLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const d = normalizeMobile(phone);
  const intl = d.length === 10 ? `91${d}` : d;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${intl}${q}`;
}

export function initials(name: string | null | undefined, phone?: string | null): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return phone ? phone.slice(-2) : "?";
}

export function occasionLabel(kind: "birthday" | "anniversary"): string {
  return kind === "birthday" ? "Birthday" : "Anniversary";
}
