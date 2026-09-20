import type { MenuItem, PosOrder, PosOrderLine } from "../../../types/owner";
import { money } from "./posUtils";

function withSubtotal(order: PosOrder, lines: PosOrderLine[]): PosOrder {
  const total = lines
    .filter((l) => l.status !== "cancelled")
    .reduce((s, l) => s + money(l.line_total), 0);
  return { ...order, lines, running_subtotal: total.toFixed(2) };
}

export function optimisticRemoveLine(order: PosOrder, lineId: string): PosOrder {
  return withSubtotal(order, order.lines.filter((l) => l.id !== lineId));
}

export function optimisticQtyLine(order: PosOrder, lineId: string, qty: number): PosOrder {
  const lines = order.lines.map((l) => {
    if (l.id !== lineId) return l;
    const addonsTotal = money(l.addons_total);
    const unit = money(l.unit_price);
    return {
      ...l,
      quantity: qty,
      line_total: ((unit + addonsTotal) * qty).toFixed(2),
    };
  });
  return withSubtotal(order, lines);
}

export function optimisticAddLine(
  order: PosOrder,
  item: MenuItem,
  variationId: string | null,
  addonIds: string[],
  quantity: number,
): PosOrder {
  const variation = item.variations?.find((v) => v.id === variationId);
  const unitPrice = variation?.price ?? item.price;
  const addons = (item.addons ?? []).filter((a) => addonIds.includes(a.id) && a.is_available);
  const addonsTotal = addons.reduce((s, a) => s + money(a.price), 0);
  const unit = money(unitPrice);
  const line: PosOrderLine = {
    id: `opt-${crypto.randomUUID()}`,
    menu_item_id: item.id,
    menu_item_variation_id: variationId,
    item_name: item.name,
    variation_name: variation?.name ?? null,
    quantity,
    unit_price: String(unitPrice),
    addons_total: addonsTotal.toFixed(2),
    line_total: ((unit + addonsTotal) * quantity).toFixed(2),
    notes: null,
    food_type: item.food_type ?? (item.is_veg ? "veg" : "non_veg"),
    status: "pending_kot",
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
  };
  return withSubtotal(order, [...order.lines, line]);
}
