import { useMemo } from "react";
import type { MenuItem } from "../../../types/owner";
import { billingLineDiet } from "../menu/menuFoodType";
import {
  availableAddons,
  availableVariations,
  defaultVariationId,
  isModifierAvailable,
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
  const variations = availableVariations(item);
  const addons = availableAddons(item);

  const resolvedVariationId =
    variationId && variations.some((v) => v.id === variationId)
      ? variationId
      : defaultVariationId(item, variations) ?? "";

  const selectedVar = variations.find((v) => v.id === resolvedVariationId) ?? null;
  const selectedAddons = addons.filter((a) => addonIds.includes(a.id));
  const unitPrice = selectedVar ? parseFloat(selectedVar.price) : parseFloat(item.price);
  const addonsTotal = selectedAddons.reduce((s, a) => s + parseFloat(a.price), 0);
  const lineTotal = (unitPrice + addonsTotal) * qty;

  const lineFoodType = useMemo(
    () => billingLineDiet(item, selectedVar, selectedAddons),
    [item, selectedVar, selectedAddons],
  );
  const dietClass = dietStripeClass(lineFoodType);

  const hasVariationRows = (item.variations ?? []).length > 0;
  const noSizesAvailable = hasVariationRows && variations.length === 0;
  const variationRequired = variations.length > 0;
  const canConfirm =
    !busy && !noSizesAvailable && (!variationRequired || Boolean(resolvedVariationId));

  const toggleAddon = (id: string) => {
    onAddonIds(
      addonIds.includes(id) ? addonIds.filter((x) => x !== id) : [...addonIds, id],
    );
  };

  const clearAddons = () => onAddonIds([]);

  const handleConfirm = () => {
    onConfirm({
      variationId: variationRequired ? resolvedVariationId || null : null,
      addonIds: [...addonIds],
      qty,
    });
  };

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
              {variations.length === 0 && (
                <p className="pos-picker-sheet__base-price">{fmt(item.price)}</p>
              )}
              {selectedVar && variations.length > 1 && (
                <p className="pos-picker-sheet__base-price muted">
                  {selectedVar.name} · {fmt(selectedVar.price)}
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
          {variations.length > 0 && (
            <section className="pos-picker-block">
              <div className="pos-picker-block__head">
                <p className="pos-picker-block__label">Choose size / variation</p>
                <span className="pos-picker-block__hint">Required · one only</span>
              </div>
              <div className="pos-picker-var-list" role="radiogroup" aria-label="Variation">
                {variations.map((v) => {
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
                        {v.is_default && variations.length > 1 && (
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

          {addons.length > 0 && (
            <section className="pos-picker-block">
              <div className="pos-picker-block__head">
                <p className="pos-picker-block__label">Toppings & add-ons</p>
                <span className="pos-picker-block__hint">Optional · select any</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="pos-picker-addon-summary">
                  <span className="pos-picker-addon-summary__text">
                    {selectedAddons.length} selected (+{fmt(addonsTotal)})
                  </span>
                  <button
                    type="button"
                    className="pos-picker-addon-summary__clear"
                    onClick={clearAddons}
                    disabled={busy}
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="pos-picker-addon-list">
                {addons.map((a) => {
                  const on = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`pos-picker-addon ${on ? "pos-picker-addon--on" : ""}`}
                      onClick={() => toggleAddon(a.id)}
                      aria-pressed={on}
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
          )}

          {noSizesAvailable && (
            <p className="pos-picker-sheet__note form-error">
              All sizes are off — turn a variation on in Menu, or add toppings only on a base item.
            </p>
          )}
          {!noSizesAvailable &&
            (item.variations ?? []).some((v) => !isModifierAvailable(v.is_available)) && (
              <p className="pos-picker-sheet__note muted">Some sizes are hidden (out of stock).</p>
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
