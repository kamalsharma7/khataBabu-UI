import type { MenuAddon, MenuAddonGroup, MenuItem, MenuVariation } from "../../../types/owner";
import { itemBaseFoodType, variationEffectiveFoodType } from "./menuFoodType";

/** Treat missing `is_available` as available (older API rows). */
export function isModifierAvailable(isAvailable?: boolean): boolean {
  return isAvailable !== false;
}

export function variationRoots(item: MenuItem): MenuVariation[] {
  return (item.variations ?? []).filter((v) => !v.parent_id);
}

export function variationLeaves(item: MenuItem): MenuVariation[] {
  const leaves: MenuVariation[] = [];
  for (const root of variationRoots(item)) {
    if (root.children?.length) {
      leaves.push(...root.children);
    } else {
      leaves.push(root);
    }
  }
  return leaves;
}

export function hasNestedVariations(item: MenuItem): boolean {
  return variationRoots(item).some((r) => (r.children?.length ?? 0) > 0);
}

export function availableVariations(item: MenuItem): MenuVariation[] {
  return variationLeaves(item).filter((v) => isModifierAvailable(v.is_available));
}

export function availableAddons(item: MenuItem): MenuAddon[] {
  return (item.addons ?? []).filter((a) => isModifierAvailable(a.is_available));
}

export function availableAddonGroups(item: MenuItem): MenuAddonGroup[] {
  const groups = item.addon_groups ?? [];
  if (groups.length > 0) {
    return groups
      .map((g) => ({
        ...g,
        addons: (g.addons ?? []).filter((a) => isModifierAvailable(a.is_available)),
      }))
      .filter((g) => g.addons.length > 0);
  }
  const addons = availableAddons(item);
  if (!addons.length) return [];
  return [
    {
      id: item.id,
      name: "Toppings",
      min_select: 0,
      max_select: null,
      sort_order: 0,
      addons,
    },
  ];
}

export function findVariation(item: MenuItem, variationId: string | null): MenuVariation | undefined {
  if (!variationId) return undefined;
  for (const root of variationRoots(item)) {
    if (root.id === variationId) return root;
    const child = root.children?.find((c) => c.id === variationId);
    if (child) return child;
  }
  return (item.variations ?? []).find((v) => v.id === variationId);
}

export function variationDisplayName(item: MenuItem, variationId: string | null): string | null {
  if (!variationId) return null;
  for (const root of variationRoots(item)) {
    if (root.id === variationId) return root.name;
    const child = root.children?.find((c) => c.id === variationId);
    if (child) return `${root.name} · ${child.name}`;
  }
  return findVariation(item, variationId)?.name ?? null;
}

export function parentIdOfLeaf(item: MenuItem, leafId: string): string | null {
  for (const root of variationRoots(item)) {
    if (root.id === leafId) return root.id;
    if (root.children?.some((c) => c.id === leafId)) return root.id;
  }
  return null;
}

export function addonGroupHint(minSelect: number, maxSelect: number | null): string {
  if (minSelect <= 0 && maxSelect == null) return "Optional · select any";
  if (minSelect <= 0 && maxSelect === 1) return "Optional · pick one";
  if (minSelect === 1 && maxSelect === 1) return "Required · pick one";
  if (minSelect > 0 && maxSelect === minSelect) return `Required · pick ${minSelect}`;
  if (minSelect > 0 && maxSelect == null) return `Pick at least ${minSelect}`;
  if (minSelect > 0 && maxSelect != null) return `Pick ${minSelect}–${maxSelect}`;
  if (maxSelect != null) return `Pick up to ${maxSelect}`;
  return "Optional · select any";
}

export function addonGroupsValid(item: MenuItem, addonIds: string[]): boolean {
  return availableAddonGroups(item).every((group) => {
    const count = group.addons.filter((a) => addonIds.includes(a.id)).length;
    if (count < (group.min_select ?? 0)) return false;
    if (group.max_select != null && count > group.max_select) return false;
    return true;
  });
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
  const groups = availableAddonGroups(item);
  const addons = groups.flatMap((g) => g.addons);
  if (hasNestedVariations(item) && variations.length > 1) return true;
  if (groups.some((g) => (g.min_select ?? 0) > 0)) return true;
  if (variations.length === 0 && addons.length === 0) return false;
  if (variations.length <= 1 && addons.length === 0) return false;
  return true;
}
