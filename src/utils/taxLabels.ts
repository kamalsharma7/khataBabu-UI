import type { GstSlab, TaxMethod, TaxScheme } from "../types/owner";

export const SCHEMES: { id: TaxScheme; label: string; hint: string }[] = [
  { id: "gst", label: "GST", hint: "Recommended for the Indian market" },
  { id: "vat", label: "VAT", hint: "For global / non-GST venues" },
  { id: "other", label: "Other tax", hint: "Cess, service charge tax, custom" },
];

export const GST_SLABS: { id: GstSlab; label: string; rate: number }[] = [
  { id: "gst_5", label: "GST 5%", rate: 5 },
  { id: "gst_18", label: "GST 18%", rate: 18 },
  { id: "gst_40", label: "GST 40%", rate: 40 },
  { id: "igst", label: "IGST", rate: 5 },
];

export const METHODS: { id: TaxMethod; label: string; hint: string }[] = [
  { id: "forward", label: "Forward", hint: "Menu price + tax. ₹100 + 5% = ₹105." },
  { id: "backward", label: "Backward", hint: "Price already includes tax. ₹100 stays ₹100." },
  { id: "tax_on_tax", label: "Calculate on tax", hint: "Next tax sits on (price + previous tax)." },
];

export function slabRate(scheme: TaxScheme, slab: GstSlab, customRate: number): number {
  if (scheme !== "gst") return customRate;
  const found = GST_SLABS.find((s) => s.id === slab);
  if (slab === "igst" || slab === "custom" || !found) return customRate;
  return found.rate;
}

export function taxTitles(scheme: TaxScheme, slab: GstSlab, rate: number) {
  const r = Number.isFinite(rate) ? rate : 0;
  const half = Math.round((r / 2) * 100) / 100;
  if (scheme === "gst" && slab === "igst") {
    return {
      name: `IGST ${r}%`,
      title: `IGST ${r}%`,
      suffix: `@${r}%`,
      cgst: null as string | null,
      sgst: null as string | null,
      igst: `IGST@${r}%`,
      display: `IGST@${r}%`,
    };
  }
  if (scheme === "gst") {
    return {
      name: `GST ${r}%`,
      title: `GST ${r}%`,
      suffix: `@${half}%`,
      cgst: `CGST@${half}%`,
      sgst: `SGST@${half}%`,
      igst: null as string | null,
      display: `CGST@${half}% · SGST@${half}%`,
    };
  }
  if (scheme === "vat") {
    return {
      name: `VAT ${r}%`,
      title: `VAT ${r}%`,
      suffix: `@${r}%`,
      cgst: null,
      sgst: null,
      igst: null,
      display: `VAT@${r}%`,
    };
  }
  return {
    name: `Other tax ${r}%`,
    title: `Tax ${r}%`,
    suffix: `@${r}%`,
    cgst: null,
    sgst: null,
    igst: null,
    display: `Tax@${r}%`,
  };
}

export function methodLabel(method: string | null | undefined): string {
  if (method === "backward") return "inclusive";
  if (method === "tax_on_tax") return "tax-on-tax";
  if (method === "forward") return "exclusive";
  return "exclusive";
}

export function guestPays(amount: number, rate: number, method: TaxMethod): { tax: number; pays: number } {
  if (rate <= 0) return { tax: 0, pays: amount };
  if (method === "backward") {
    const tax = Math.round(((amount * rate) / (100 + rate)) * 100) / 100;
    return { tax, pays: amount };
  }
  const tax = Math.round(((amount * rate) / 100) * 100) / 100;
  return { tax, pays: Math.round((amount + tax) * 100) / 100 };
}

export function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}
