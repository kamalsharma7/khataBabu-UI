import type { MenuItem, PosOrder, PosOrderLine } from "../../../types/owner";
import { effectiveLineFoodType } from "../menu/menuFoodType";
import { findVariation, isModifierAvailable, variationDisplayName } from "../menu/modifierUtils";
import { optimisticLineId } from "./posIds";
import { money } from "./posUtils";

function withSubtotal(order: PosOrder, lines: PosOrderLine[]): PosOrder {
  const linesTotal = lines
    .filter((l) => l.status !== "cancelled")
    .reduce((s, l) => s + money(l.line_total), 0);
  const timePart =
    order.time_billing_excluded || !order.time_charge ? 0 : money(order.time_charge);
  return { ...order, lines, running_subtotal: (linesTotal + timePart).toFixed(2) };
}

export function optimisticRemoveLine(order: PosOrder, lineId: string): PosOrder {
  return withSubtotal(order, order.lines.filter((l) => l.id !== lineId));
}

export function optimisticOpenLineUpdate(
  order: PosOrder,
  lineId: string,
  payload: { quantity: number; unit_price: number; notes: string | null },
): PosOrder {
  const lines = order.lines.map((l) => {
    if (l.id !== lineId) return l;
    const addonsTotal = money(l.addons_total);
    const unit = payload.unit_price;
    const qty = payload.quantity;
    return {
      ...l,
      quantity: qty,
      unit_price: unit.toFixed(2),
      notes: payload.notes,
      line_total: ((unit + addonsTotal) * qty).toFixed(2),
    };
  });
  return withSubtotal(order, lines);
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
  const variation = findVariation(item, variationId);
  const unitPrice = variation?.price ?? item.price;
  const addons = (item.addons ?? []).filter(
    (a) => addonIds.includes(a.id) && isModifierAvailable(a.is_available),
  );
  const addonsTotal = addons.reduce((s, a) => s + money(a.price), 0);
  const unit = money(unitPrice);
  const lineFood = effectiveLineFoodType(item, variation ?? null, addons);
  const line: PosOrderLine = {
    id: optimisticLineId(),
    menu_item_id: item.id,
    is_open_item: false,
    menu_item_variation_id: variationId,
    item_name: item.name,
    variation_name: variationDisplayName(item, variationId),
    quantity,
    unit_price: String(unitPrice),
    addons_total: addonsTotal.toFixed(2),
    line_total: ((unit + addonsTotal) * quantity).toFixed(2),
    notes: null,
    food_type: lineFood,
    status: "pending_kot",
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
  };
  return withSubtotal(order, [...order.lines, line]);
}
