export const RAW_MATERIAL_CATEGORIES = [
  { id: "grocery", label: "Grocery" },
  { id: "dairy", label: "Dairy" },
  { id: "produce", label: "Vegetables / fruit" },
  { id: "meat", label: "Meat" },
  { id: "seafood", label: "Seafood" },
  { id: "spices", label: "Spices" },
  { id: "beverages", label: "Beverages" },
  { id: "frozen", label: "Frozen" },
  { id: "packaging", label: "Packaging" },
  { id: "other", label: "Other" },
] as const;

export const RAW_MATERIAL_UNITS = [
  { id: "kg", label: "Kg" },
  { id: "g", label: "Gram" },
  { id: "ltr", label: "Litre" },
  { id: "ml", label: "ml" },
  { id: "pcs", label: "Pcs" },
  { id: "pkt", label: "Packet" },
  { id: "bunch", label: "Bunch" },
  { id: "dozen", label: "Dozen" },
] as const;

export function rawCategoryLabel(id: string): string {
  return RAW_MATERIAL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function parseQty(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
}
