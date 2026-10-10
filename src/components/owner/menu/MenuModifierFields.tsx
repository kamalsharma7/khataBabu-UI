type VariationRow = { name: string; price: string; is_default: boolean; weight_grams: string };
type AddonRow = { name: string; price: string; weight_grams: string };

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
  return (
    <div className="menu-mod-panel">
      <p className="menu-mod-panel__hint">
        <strong>How this shows on billing:</strong> variations are sizes or types (customer picks one).
        Toppings are optional extras added on top of the item price. Weight in grams is optional (for kitchen / inventory).
      </p>

      <div className="menu-mod-panel__columns">
        <section className="menu-mod-block" aria-labelledby="variations-heading">
          <div className="menu-mod-block__title-row">
            <h3 id="variations-heading" className="menu-mod-block__title">Variations</h3>
            <span className="menu-mod-block__badge">Required if you have sizes</span>
          </div>
          <p className="menu-mod-block__desc">Example: Small ₹99, Large ₹149 — one must be default for POS.</p>

          <div className="menu-mod-table menu-mod-table--with-weight" role="table">
            <div className="menu-mod-table__head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Price (₹)</span>
              <span role="columnheader">Weight (g)</span>
              <span role="columnheader">Default</span>
              <span role="columnheader" className="menu-mod-table__head-actions" />
            </div>
            {variations.map((row, idx) => (
              <div key={idx} className="menu-mod-table__row" role="row">
                <input
                  className="menu-mod-table__input"
                  placeholder="e.g. Large"
                  value={row.name}
                  aria-label="Variation name"
                  onChange={(e) => {
                    const next = [...variations];
                    next[idx] = { ...row, name: e.target.value };
                    setVariations(next);
                  }}
                />
                <input
                  className="menu-mod-table__input menu-mod-table__input--num"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={row.price}
                  aria-label="Variation price"
                  onChange={(e) => {
                    const next = [...variations];
                    next[idx] = { ...row, price: e.target.value };
                    setVariations(next);
                  }}
                />
                <input
                  className="menu-mod-table__input menu-mod-table__input--num"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="—"
                  value={row.weight_grams}
                  aria-label="Variation weight grams"
                  onChange={(e) => {
                    const next = [...variations];
                    next[idx] = { ...row, weight_grams: e.target.value };
                    setVariations(next);
                  }}
                />
                <label className="menu-mod-table__default">
                  <input
                    type="radio"
                    name={variationRadioName}
                    checked={row.is_default}
                    onChange={() => onSetDefaultVariation(idx)}
                  />
                  <span>{row.is_default ? "Yes" : "—"}</span>
                </label>
                <div className="menu-mod-table__actions">
                  {variations.length > 1 && (
                    <button
                      type="button"
                      className="menu-mod-table__remove"
                      onClick={() => setVariations(variations.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-block__add"
            onClick={() => setVariations([...variations, emptyVariation()])}
          >
            + Add variation row
          </button>
        </section>

        <section className="menu-mod-block" aria-labelledby="toppings-heading">
          <div className="menu-mod-block__title-row">
            <h3 id="toppings-heading" className="menu-mod-block__title">Toppings / add-ons</h3>
            <span className="menu-mod-block__badge menu-mod-block__badge--muted">Optional</span>
          </div>
          <p className="menu-mod-block__desc">Example: Extra cheese ₹40 — customer can select multiple on POS.</p>

          <div className="menu-mod-table menu-mod-table--addons menu-mod-table--with-weight" role="table">
            <div className="menu-mod-table__head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Extra price (₹)</span>
              <span role="columnheader">Weight (g)</span>
              <span role="columnheader" className="menu-mod-table__head-actions" />
            </div>
            {addons.map((row, idx) => (
              <div key={idx} className="menu-mod-table__row menu-mod-table__row--addons" role="row">
                <input
                  className="menu-mod-table__input"
                  placeholder="e.g. Extra paneer"
                  value={row.name}
                  aria-label="Topping name"
                  onChange={(e) => {
                    const next = [...addons];
                    next[idx] = { ...row, name: e.target.value };
                    setAddons(next);
                  }}
                />
                <input
                  className="menu-mod-table__input menu-mod-table__input--num"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={row.price}
                  aria-label="Topping price"
                  onChange={(e) => {
                    const next = [...addons];
                    next[idx] = { ...row, price: e.target.value };
                    setAddons(next);
                  }}
                />
                <input
                  className="menu-mod-table__input menu-mod-table__input--num"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="—"
                  value={row.weight_grams}
                  aria-label="Topping weight grams"
                  onChange={(e) => {
                    const next = [...addons];
                    next[idx] = { ...row, weight_grams: e.target.value };
                    setAddons(next);
                  }}
                />
                <div className="menu-mod-table__actions">
                  {addons.length > 1 && (
                    <button
                      type="button"
                      className="menu-mod-table__remove"
                      onClick={() => setAddons(addons.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-block__add"
            onClick={() => setAddons([...addons, emptyAddon()])}
          >
            + Add topping row
          </button>
        </section>
      </div>
    </div>
  );
}

export type { VariationRow, AddonRow };
