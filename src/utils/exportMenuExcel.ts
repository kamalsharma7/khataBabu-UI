import type { MenuCategory, MenuItem } from "../types/owner";

function dietLabel(item: MenuItem): string {
  const ft = item.food_type ?? (item.is_veg ? "veg" : "non_veg");
  if (ft === "non_veg") return "Non-veg";
  if (ft === "egg") return "Egg";
  return "Veg";
}

function formatVariations(item: MenuItem): string {
  if (!item.variations?.length) return "";
  return item.variations
    .map((v) => `${v.name}: ₹${v.price}${v.is_default ? " (default)" : ""}`)
    .join("; ");
}

function formatAddons(item: MenuItem): string {
  if (!item.addons?.length) return "";
  return item.addons.map((a) => `${a.name}: +₹${a.price}`).join("; ");
}

export async function downloadMenuExcel(
  outletName: string,
  categories: MenuCategory[],
  items: MenuItem[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const catNameById = new Map(categories.map((c) => [c.id, c.name]));
  const sorted = [...items].sort((a, b) => {
    const ca = catNameById.get(a.category_id) ?? "";
    const cb = catNameById.get(b.category_id) ?? "";
    if (ca !== cb) return ca.localeCompare(cb);
    return a.name.localeCompare(b.name);
  });

  const rows = sorted.map((item) => ({
    Category: catNameById.get(item.category_id) ?? "",
    "Item name": item.name,
    "Short code": item.short_code ?? "",
    "Base price (₹)": parseFloat(item.price) || 0,
    "Diet type": dietLabel(item),
    Available: item.is_available ? "Yes" : "No",
    Variations: formatVariations(item),
    "Toppings / add-ons": formatAddons(item),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 36 },
    { wch: 36 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Menu");

  const safeName = outletName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "outlet";
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `khatababu-menu-${safeName}-${date}.xlsx`);
}
