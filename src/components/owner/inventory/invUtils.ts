import type { InventoryItem } from "../../../types/owner";

export const STOCK_UNITS = [
  { value: "pcs", label: "Pcs (pieces)" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
  { value: "glass", label: "Glass" },
  { value: "plate", label: "Plate" },
  { value: "kg", label: "Kg" },
] as const;

export function fmtQty(n: string | number): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v);
}

export type StockStatus = "unset" | "ok" | "low" | "out";

export function stockStatus(item: InventoryItem): StockStatus {
  const left = parseFloat(item.remaining_today);
  const opening = item.today_opening ? parseFloat(item.today_opening) : null;
  if (!item.stock_date || opening === null) return "unset";
  if (left <= 0) return "out";
  if (opening > 0 && left / opening <= 0.2) return "low";
  return "ok";
}

export function statusLabel(s: StockStatus): string {
  switch (s) {
    case "unset":
      return "Count not set";
    case "ok":
      return "In stock";
    case "low":
      return "Running low";
    case "out":
      return "Out of stock";
  }
}

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function isStockSetForToday(item: InventoryItem): boolean {
  return item.stock_date === todayIso() && item.today_opening != null;
}
