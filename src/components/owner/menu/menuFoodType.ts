import type { FoodType, MenuAddon, MenuItem, MenuVariation } from "../../../types/owner";

const RANK: Record<FoodType, number> = { veg: 0, egg: 1, non_veg: 2 };

export type ModifierFoodType = FoodType | "" | "inherit";

export function normalizeFoodType(value: unknown): FoodType | null {
  if (value == null || value === "") return null;
  const s = String(value).toLowerCase().replace(/-/g, "_");
  if (s === "veg" || s === "non_veg" || s === "egg") return s as FoodType;
  return null;
}

export function itemBaseFoodType(item: MenuItem): FoodType {
  return normalizeFoodType(item.food_type) ?? (item.is_veg ? "veg" : "non_veg");
}

export function resolveModifierFoodType(
  base: FoodType,
  modifier: FoodType | null | undefined,
): FoodType {
  const m = normalizeFoodType(modifier);
  return m ?? base;
}

export function modifierEffectiveFoodType(
  item: MenuItem,
  modifierFoodType: FoodType | null | undefined,
): FoodType {
  return resolveModifierFoodType(itemBaseFoodType(item), modifierFoodType);
}

export function variationEffectiveFoodType(item: MenuItem, variation: MenuVariation): FoodType {
  return modifierEffectiveFoodType(item, variation.food_type);
}

export function addonEffectiveFoodType(item: MenuItem, addon: MenuAddon): FoodType {
  return modifierEffectiveFoodType(item, addon.food_type);
}

export function strictestFoodType(...types: FoodType[]): FoodType {
  if (types.length === 0) return "veg";
  return types.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

/**
 * Billing / KOT line diet from what is actually on the order line.
 * Priority: non-veg (red) > egg (yellow) > veg (green).
 * Only the selected variation (if any) and selected toppings count — not other menu options.
 */
export function billingLineDiet(
  item: MenuItem,
  variation: MenuVariation | null | undefined,
  selectedAddons: MenuAddon[],
): FoodType {
  const base = itemBaseFoodType(item);
  const diets: FoodType[] = [];
  const hasVariationMenu = (item.variations ?? []).length > 0;

  if (variation) {
    diets.push(variationEffectiveFoodType(item, variation));
  } else if (!hasVariationMenu) {
    diets.push(base);
  } else {
    diets.push(base);
  }

  for (const addon of selectedAddons) {
    diets.push(addonEffectiveFoodType(item, addon));
  }

  if (diets.some((d) => d === "non_veg")) return "non_veg";
  if (diets.some((d) => d === "egg")) return "egg";
  return "veg";
}

/** @alias billingLineDiet */
export function effectiveLineFoodType(
  item: MenuItem,
  variation: MenuVariation | null | undefined,
  addons: MenuAddon[],
): FoodType {
  return billingLineDiet(item, variation, addons);
}

export const DIET_SELECT_OPTIONS: { value: ModifierFoodType; label: string }[] = [
  { value: "", label: "Same as item" },
  { value: "veg", label: "Veg" },
  { value: "egg", label: "Egg" },
  { value: "non_veg", label: "Non-veg" },
];

export function dietSelectValue(ft: FoodType | null | undefined): ModifierFoodType {
  return ft ?? "";
}

export function dietFromSelect(value: ModifierFoodType): FoodType | null {
  if (!value || value === "inherit") return null;
  return value;
}
