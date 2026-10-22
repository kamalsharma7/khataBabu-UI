import type { MenuAddon, MenuItem, MenuVariation } from "../../../types/owner";
import { itemBaseFoodType, variationEffectiveFoodType } from "./menuFoodType";

/** Treat missing `is_available` as available (older API rows). */
export function isModifierAvailable(isAvailable?: boolean): boolean {
  return isAvailable !== false;
}

export function availableVariations(item: MenuItem): MenuVariation[] {
  return (item.variations ?? []).filter((v) => isModifierAvailable(v.is_available));
}

export function availableAddons(item: MenuItem): MenuAddon[] {
  return (item.addons ?? []).filter((a) => isModifierAvailable(a.is_available));
}

/**
 * Which variation is pre-selected on POS (picker / quick add).
 * 1) `is_default`  2) first whose diet matches the item (veg item → veg variation)
 * 3) first in list — avoids yellow/red from an egg/non-veg row listed first.
 */
export function defaultVariationId(item: MenuItem, variations: MenuVariation[]): string | null {
  if (variations.length === 0) return null;
  const explicit = variations.find((v) => v.is_default === true);
  if (explicit) return explicit.id;

  const base = itemBaseFoodType(item);
  const matchesItem = variations.find((v) => variationEffectiveFoodType(item, v) === base);
  if (matchesItem) return matchesItem.id;

  return variations[0].id;
}

/** Open POS picker when the user must choose size and/or toppings. */
export function needsModifierPicker(item: MenuItem): boolean {
  const variations = availableVariations(item);
  const addons = availableAddons(item);
  if (variations.length === 0 && addons.length === 0) return false;
  if (variations.length <= 1 && addons.length === 0) return false;
  return true;
}
