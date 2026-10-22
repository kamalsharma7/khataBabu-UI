import type { ReactNode } from "react";
import { DIET_SELECT_OPTIONS, type ModifierFoodType } from "./menuFoodType";

export type VariationRow = {
  name: string;
  price: string;
  is_default: boolean;
  is_available: boolean;
  weight_grams: string;
  food_type: ModifierFoodType;
};

export type AddonRow = {
  name: string;
  price: string;
  is_available: boolean;
  weight_grams: string;
  food_type: ModifierFoodType;
};

type Props = {
  variations: VariationRow[];
  setVariations: (rows: VariationRow[]) => void;
  addons: AddonRow[];
  setAddons: (rows: AddonRow[]) => void;
  variationRadioName: string;
  emptyVariation: (defaultSize?: boolean) => VariationRow;
  emptyAddon: () => AddonRow;
  onSetDefaultVariation: (index: number) => void;
};

function removeRow<T>(rows: T[], index: number): T[] {
  if (rows.length <= 1) return rows;
  return rows.filter((_, i) => i !== index);
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`menu-mod-field ${className}`.trim()}>
      <span className="menu-mod-field__label">{label}</span>
      {children}
    </label>
  );
}

export function MenuModifierFields({
  variations,
  setVariations,
  addons,
  setAddons,
  variationRadioName,
  emptyVariation,
  emptyAddon,
  onSetDefaultVariation,
}: Props) {
  const filledVariationCount = variations.filter((r) => r.name.trim()).length;

  return (
    <div className="menu-mod-panel">
      <p className="menu-mod-panel__hint">
        <strong>Variations</strong> set line price (one per order). <strong>Toppings</strong> add extra
        rupees and combine freely on POS.
      </p>

      <div className="menu-mod-panel__stack">
        <section className="menu-mod-section" aria-labelledby="variations-heading">
          <div className="menu-mod-section__head">
            <h3 id="variations-heading">Variations (size / type)</h3>
            <span className="menu-mod-section__tag">One on POS</span>
          </div>
          <p className="menu-mod-section__desc">
            {filledVariationCount > 0
              ? `${filledVariationCount} row(s) with a name will be saved`
              : "Leave names empty to use only the item base price."}
          </p>

          <ul className="menu-mod-options">
            {variations.map((row, idx) => (
              <li key={idx} className="menu-mod-option">
                <div className="menu-mod-option__grid menu-mod-option__grid--variation">
                  <Field label="Name" className="menu-mod-field--wide">
                    <input
                      className="menu-mod-field__input"
                      placeholder="e.g. Large"
                      value={row.name}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...row, name: e.target.value };
                        setVariations(next);
                      }}
                    />
                  </Field>
                  <Field label="Price ₹">
                    <input
                      className="menu-mod-field__input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...row, price: e.target.value };
                        setVariations(next);
                      }}
                    />
                  </Field>
                  <Field label="Diet">
                    <select
                      className="menu-mod-field__input"
                      value={row.food_type}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...row, food_type: e.target.value as ModifierFoodType };
                        setVariations(next);
                      }}
                    >
                      {DIET_SELECT_OPTIONS.map((o) => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="On POS">
                    <select
                      className="menu-mod-field__input"
                      value={row.is_available ? "yes" : "no"}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...row, is_available: e.target.value === "yes" };
                        setVariations(next);
                      }}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">Hidden</option>
                    </select>
                  </Field>
                  <Field label="Weight (g)">
                    <input
                      className="menu-mod-field__input"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="—"
                      value={row.weight_grams}
                      onChange={(e) => {
                        const next = [...variations];
                        next[idx] = { ...row, weight_grams: e.target.value };
                        setVariations(next);
                      }}
                    />
                  </Field>
                  <div className="menu-mod-option__default">
                    <span className="menu-mod-field__label">Default</span>
                    <label className="menu-mod-default-radio">
                      <input
                        type="radio"
                        name={variationRadioName}
                        checked={row.is_default}
                        onChange={() => onSetDefaultVariation(idx)}
                      />
                      {row.is_default ? "Yes" : "No"}
                    </label>
                  </div>
                  <div className="menu-mod-option__actions">
                    <button
                      type="button"
                      className="menu-mod-option__remove"
                      disabled={variations.length <= 1}
                      onClick={() => setVariations(removeRow(variations, idx))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-section__add"
            onClick={() => setVariations([...variations, emptyVariation()])}
          >
            + Add variation
          </button>
        </section>

        <section className="menu-mod-section" aria-labelledby="toppings-heading">
          <div className="menu-mod-section__head">
            <h3 id="toppings-heading">Toppings / add-ons</h3>
            <span className="menu-mod-section__tag menu-mod-section__tag--muted">Multi on POS</span>
          </div>
          <p className="menu-mod-section__desc">Extra charge per topping; any combination on billing.</p>

          <ul className="menu-mod-options">
            {addons.map((row, idx) => (
              <li key={idx} className="menu-mod-option">
                <div className="menu-mod-option__grid menu-mod-option__grid--addon">
                  <Field label="Name" className="menu-mod-field--wide">
                    <input
                      className="menu-mod-field__input"
                      placeholder="e.g. Extra paneer"
                      value={row.name}
                      onChange={(e) => {
                        const next = [...addons];
                        next[idx] = { ...row, name: e.target.value };
                        setAddons(next);
                      }}
                    />
                  </Field>
                  <Field label="+ ₹">
                    <input
                      className="menu-mod-field__input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...addons];
                        next[idx] = { ...row, price: e.target.value };
                        setAddons(next);
                      }}
                    />
                  </Field>
                  <Field label="Diet">
                    <select
                      className="menu-mod-field__input"
                      value={row.food_type}
                      onChange={(e) => {
                        const next = [...addons];
                        next[idx] = { ...row, food_type: e.target.value as ModifierFoodType };
                        setAddons(next);
                      }}
                    >
                      {DIET_SELECT_OPTIONS.map((o) => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="On POS">
                    <select
                      className="menu-mod-field__input"
                      value={row.is_available ? "yes" : "no"}
                      onChange={(e) => {
                        const next = [...addons];
                        next[idx] = { ...row, is_available: e.target.value === "yes" };
                        setAddons(next);
                      }}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">Hidden</option>
                    </select>
                  </Field>
                  <Field label="Weight (g)">
                    <input
                      className="menu-mod-field__input"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="—"
                      value={row.weight_grams}
                      onChange={(e) => {
                        const next = [...addons];
                        next[idx] = { ...row, weight_grams: e.target.value };
                        setAddons(next);
                      }}
                    />
                  </Field>
                  <div className="menu-mod-option__actions">
                    <button
                      type="button"
                      className="menu-mod-option__remove"
                      disabled={addons.length <= 1}
                      onClick={() => setAddons(removeRow(addons, idx))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-section__add"
            onClick={() => setAddons([...addons, emptyAddon()])}
          >
            + Add topping
          </button>
        </section>
      </div>
    </div>
  );
}
