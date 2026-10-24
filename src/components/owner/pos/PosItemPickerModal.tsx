import { useMemo } from "react";
import type { MenuAddon, MenuAddonGroup, MenuItem, MenuVariation } from "../../../types/owner";
import { billingLineDiet } from "../menu/menuFoodType";
import {
  addonGroupHint,
  addonGroupsValid,
  availableAddonGroups,
  availableVariations,
  defaultVariationId,
  hasNestedVariations,
  isModifierAvailable,
  parentIdOfLeaf,
  variationDisplayName,
  variationRoots,
} from "../menu/modifierUtils";
import { dietStripeClass, fmt } from "./posUtils";

export type PickerConfirmPayload = {
  variationId: string | null;
  addonIds: string[];
  qty: number;
};

type Props = {
  item: MenuItem;
  variationId: string;
  addonIds: string[];
  qty: number;
  busy: boolean;
  onVariationId: (id: string) => void;
  onAddonIds: (ids: string[]) => void;
  onQty: (qty: number) => void;
  onClose: () => void;
  onConfirm: (payload: PickerConfirmPayload) => void;
};

function availableRoots(item: MenuItem): MenuVariation[] {
  return variationRoots(item).filter((root) => {
    if (!isModifierAvailable(root.is_available)) return false;
    if (root.children?.length) {
      return root.children.some((c) => isModifierAvailable(c.is_available));
    }
    return true;
  });
}

function sizesOfType(type: MenuVariation): MenuVariation[] {
  if (!type.children?.length) return [type];
  return type.children.filter((c) => isModifierAvailable(c.is_available));
}

export function PosItemPickerModal({
  item,
  variationId,
  addonIds,
  qty,
  busy,
  onVariationId,
  onAddonIds,
  onQty,
  onClose,
  onConfirm,
}: Props) {
  const nested = hasNestedVariations(item);
  const roots = availableRoots(item);
  const leaves = availableVariations(item);
  const groups = availableAddonGroups(item);

  const resolvedVariationId =
    variationId && leaves.some((v) => v.id === variationId)
      ? variationId
      : defaultVariationId(item, leaves) ?? "";

  const selectedTypeId =
    (resolvedVariationId && parentIdOfLeaf(item, resolvedVariationId)) || roots[0]?.id || "";
  const selectedType = roots.find((r) => r.id === selectedTypeId) ?? null;
  const typeSizes = selectedType ? sizesOfType(selectedType) : leaves;

  const selectedVar = leaves.find((v) => v.id === resolvedVariationId) ?? null;
  const selectedAddons = groups.flatMap((g) => g.addons).filter((a) => addonIds.includes(a.id));
  const unitPrice = selectedVar ? parseFloat(selectedVar.price) : parseFloat(item.price);
  const addonsTotal = selectedAddons.reduce((s, a) => s + parseFloat(a.price), 0);
  const lineTotal = (unitPrice + addonsTotal) * qty;

  const lineFoodType = useMemo(
    () => billingLineDiet(item, selectedVar, selectedAddons),
    [item, selectedVar, selectedAddons],
  );
  const dietClass = dietStripeClass(lineFoodType);

  const hasVariationRows = (item.variations ?? []).length > 0;
  const noSizesAvailable = hasVariationRows && leaves.length === 0;
  const variationRequired = leaves.length > 0;
  const groupsOk = addonGroupsValid(item, addonIds);
  const canConfirm =
    !busy &&
    !noSizesAvailable &&
    (!variationRequired || Boolean(resolvedVariationId)) &&
    groupsOk;

  const pickType = (type: MenuVariation) => {
    const sizes = sizesOfType(type);
    const next =
      sizes.find((s) => s.is_default)?.id ??
      defaultVariationId(item, sizes) ??
      sizes[0]?.id ??
      type.id;
    onVariationId(next);
  };

  const toggleAddon = (group: MenuAddonGroup, addon: MenuAddon) => {
    const groupIds = new Set(group.addons.map((a) => a.id));
    const selectedInGroup = addonIds.filter((id) => groupIds.has(id));
    const on = addonIds.includes(addon.id);
    if (on) {
      onAddonIds(addonIds.filter((id) => id !== addon.id));
      return;
    }
    if (group.max_select === 1) {
      onAddonIds([...addonIds.filter((id) => !groupIds.has(id)), addon.id]);
      return;
    }
    if (group.max_select != null && selectedInGroup.length >= group.max_select) {
      return;
    }
    onAddonIds([...addonIds, addon.id]);
  };

  const clearGroup = (group: MenuAddonGroup) => {
    const groupIds = new Set(group.addons.map((a) => a.id));
    onAddonIds(addonIds.filter((id) => !groupIds.has(id)));
  };

  const handleConfirm = () => {
    onConfirm({
      variationId: variationRequired ? resolvedVariationId || null : null,
      addonIds: [...addonIds],
      qty,
    });
  };

  const selectedLabel = variationDisplayName(item, resolvedVariationId);

  return (
    <div className="modal-backdrop pos-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pos-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-picker-title"
      >
        <header className={`pos-picker-sheet__head ${dietClass}`}>
          <div className="pos-picker-sheet__title-wrap">
            <span className="pos-picker-sheet__diet" aria-hidden />
            <div>
              <h2 id="pos-picker-title">{item.name}</h2>
              {leaves.length === 0 && (
                <p className="pos-picker-sheet__base-price">{fmt(item.price)}</p>
              )}
              {selectedVar && selectedLabel && (
                <p className="pos-picker-sheet__base-price muted">
                  {selectedLabel} · {fmt(selectedVar.price)}
                </p>
              )}
              {item.gst_applicable && (
                <p className="pos-picker-sheet__gst">
                  GST {item.cgst_percent}% + {item.sgst_percent}%
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="pos-picker-sheet__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5 5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="pos-picker-sheet__body">
          {nested && roots.length > 0 && (
            <section className="pos-picker-block">
              <div className="pos-picker-block__head">
                <p className="pos-picker-block__label">Choose type</p>
                <span className="pos-picker-block__hint">Required · one only</span>
              </div>
              <div className="pos-picker-types" role="tablist" aria-label="Type">
                {roots.map((type) => {
                  const on = selectedTypeId === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      className={`pos-picker-type ${on ? "pos-picker-type--on" : ""}`}
                      onClick={() => pickType(type)}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {typeSizes.length > 0 && (
            <section className="pos-picker-block">
              <div className="pos-picker-block__head">
                <p className="pos-picker-block__label">
                  {nested ? `Choose size${selectedType ? ` · ${selectedType.name}` : ""}` : "Choose size / variation"}
                </p>
                <span className="pos-picker-block__hint">Required · one only</span>
              </div>
              <div className="pos-picker-var-list" role="radiogroup" aria-label="Size">
                {typeSizes.map((v) => {
                  const selected = resolvedVariationId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`pos-picker-var ${selected ? "pos-picker-var--on" : ""}`}
                      onClick={() => onVariationId(v.id)}
                    >
                      <span className="pos-picker-var__radio" aria-hidden>
                        <span className="pos-picker-var__radio-dot" />
                      </span>
                      <span className="pos-picker-var__main">
                        <span className="pos-picker-var__name">{v.name}</span>
                        {v.weight_grams != null && (
                          <span className="pos-picker-var__meta">{v.weight_grams} g</span>
                        )}
                        {v.is_default && typeSizes.length > 1 && (
                          <span className="pos-picker-var__meta">Default</span>
                        )}
                      </span>
                      <span className="pos-picker-var__price">{fmt(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {groups.map((group) => {
            const selectedInGroup = group.addons.filter((a) => addonIds.includes(a.id));
            const groupTotal = selectedInGroup.reduce((s, a) => s + parseFloat(a.price), 0);
            const atMax =
              group.max_select != null && selectedInGroup.length >= group.max_select;
            return (
              <section key={group.id} className="pos-picker-block">
                <div className="pos-picker-block__head">
                  <p className="pos-picker-block__label">{group.name}</p>
                  <span className="pos-picker-block__hint">
                    {addonGroupHint(group.min_select, group.max_select)}
                  </span>
                </div>
                {selectedInGroup.length > 0 && (
                  <div className="pos-picker-addon-summary">
                    <span className="pos-picker-addon-summary__text">
                      {selectedInGroup.length} selected (+{fmt(groupTotal)})
                    </span>
                    <button
                      type="button"
                      className="pos-picker-addon-summary__clear"
                      onClick={() => clearGroup(group)}
                      disabled={busy}
                    >
                      Clear
                    </button>
                  </div>
                )}
                <div className="pos-picker-addon-list">
                  {group.addons.map((a) => {
                    const on = addonIds.includes(a.id);
                    const lockedOut = !on && atMax && group.max_select !== 1;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`pos-picker-addon ${on ? "pos-picker-addon--on" : ""}`}
                        onClick={() => toggleAddon(group, a)}
                        aria-pressed={on}
                        disabled={lockedOut}
                      >
                        <span className="pos-picker-addon__check" aria-hidden>
                          {on ? (
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <path
                                d="M2.5 7.2 5.5 10.2 11.5 3.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </span>
                        <span className="pos-picker-addon__name">{a.name}</span>
                        <span className="pos-picker-addon__price">+{fmt(a.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {noSizesAvailable && (
            <p className="pos-picker-sheet__note form-error">
              All sizes are off — turn a type or size on in Menu.
            </p>
          )}
          {!noSizesAvailable &&
            variationLeavesHidden(item) && (
              <p className="pos-picker-sheet__note muted">Some sizes are hidden (out of stock).</p>
            )}
          {!groupsOk && (
            <p className="pos-picker-sheet__note form-error">
              Finish required toppings before adding this item.
            </p>
          )}

          <section className="pos-picker-block pos-picker-block--qty">
            <p className="pos-picker-block__label">Quantity</p>
            <div className="pos-picker-qty" aria-label="Quantity">
              <button
                type="button"
                className="pos-picker-qty__btn"
                disabled={busy || qty <= 1}
                onClick={() => onQty(qty - 1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="pos-picker-qty__value">{qty}</span>
              <button
                type="button"
                className="pos-picker-qty__btn"
                disabled={busy}
                onClick={() => onQty(qty + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </section>
        </div>

        <footer className="pos-picker-sheet__foot">
          <div className="pos-picker-sheet__total">
            <span className="pos-picker-sheet__total-label">Line total</span>
            <div className="pos-picker-sheet__total-breakdown">
              <span className="muted">
                {fmt(unitPrice)} × {qty}
                {addonsTotal > 0 ? ` + toppings ${fmt(addonsTotal * qty)}` : ""}
              </span>
              <strong className="pos-picker-sheet__total-amount">{fmt(lineTotal)}</strong>
            </div>
          </div>
          <div className="pos-picker-sheet__actions">
            <button type="button" className="pos-picker-btn pos-picker-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="pos-picker-btn pos-picker-btn--primary"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Add to order
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function variationLeavesHidden(item: MenuItem): boolean {
  for (const root of variationRoots(item)) {
    if (!isModifierAvailable(root.is_available)) return true;
    if (root.children?.some((c) => !isModifierAvailable(c.is_available))) return true;
  }
  return false;
}
