import type { ReactNode } from "react";
import type { MenuAddonGroupInput, MenuItem, MenuVariationInput } from "../../../types/owner";
import { dietFromSelect, dietSelectValue, DIET_SELECT_OPTIONS, type ModifierFoodType } from "./menuFoodType";

export type VariationRow = {
  name: string;
  price: string;
  is_default: boolean;
  is_available: boolean;
  weight_grams: string;
  food_type: ModifierFoodType;
  children: VariationRow[];
};

export type AddonRow = {
  name: string;
  price: string;
  is_available: boolean;
  weight_grams: string;
  food_type: ModifierFoodType;
};

export type AddonRule = "any" | "optional_one" | "required_one" | "required_two" | "custom";

export type AddonGroupRow = {
  name: string;
  rule: AddonRule;
  min_select: string;
  max_select: string;
  addons: AddonRow[];
};

type Props = {
  variations: VariationRow[];
  setVariations: (rows: VariationRow[]) => void;
  groups: AddonGroupRow[];
  setGroups: (rows: AddonGroupRow[]) => void;
  variationRadioName: string;
};

export function emptyVariation(defaultSize = false): VariationRow {
  return {
    name: "",
    price: "",
    is_default: defaultSize,
    is_available: true,
    weight_grams: "",
    food_type: "",
    children: [],
  };
}

export function emptySize(): VariationRow {
  return { ...emptyVariation(), is_default: false };
}

export function emptyAddon(): AddonRow {
  return {
    name: "",
    price: "",
    is_available: true,
    weight_grams: "",
    food_type: "",
  };
}

export function emptyAddonGroup(name = "Toppings"): AddonGroupRow {
  return {
    name,
    rule: "any",
    min_select: "0",
    max_select: "",
    addons: [emptyAddon()],
  };
}

function parseWeightGrams(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ruleFromMinMax(minSelect: number, maxSelect: number | null): AddonRule {
  if (minSelect <= 0 && maxSelect == null) return "any";
  if (minSelect <= 0 && maxSelect === 1) return "optional_one";
  if (minSelect === 1 && maxSelect === 1) return "required_one";
  if (minSelect === 2 && maxSelect === 2) return "required_two";
  return "custom";
}

function minMaxFromRule(row: AddonGroupRow): { min_select: number; max_select: number | null } {
  if (row.rule === "any") return { min_select: 0, max_select: null };
  if (row.rule === "optional_one") return { min_select: 0, max_select: 1 };
  if (row.rule === "required_one") return { min_select: 1, max_select: 1 };
  if (row.rule === "required_two") return { min_select: 2, max_select: 2 };
  const min = Math.max(0, parseInt(row.min_select, 10) || 0);
  const maxRaw = row.max_select.trim();
  const max = maxRaw === "" ? null : Math.max(1, parseInt(maxRaw, 10) || 1);
  return { min_select: min, max_select: max };
}

function mapVariationRow(v: MenuItem["variations"][number]): VariationRow {
  return {
    name: v.name,
    price: String(v.price ?? ""),
    is_default: v.is_default,
    is_available: v.is_available ?? true,
    weight_grams: v.weight_grams != null ? String(v.weight_grams) : "",
    food_type: dietSelectValue(v.food_type),
    children: (v.children ?? []).map(mapVariationRow),
  };
}

export function itemToVariationRows(item: MenuItem): VariationRow[] {
  if (!item.variations?.length) return [emptyVariation()];
  return item.variations.map(mapVariationRow);
}

export function itemToAddonGroupRows(item: MenuItem): AddonGroupRow[] {
  const groups = item.addon_groups ?? [];
  if (groups.length) {
    return groups.map((g) => ({
      name: g.name,
      rule: ruleFromMinMax(g.min_select ?? 0, g.max_select ?? null),
      min_select: String(g.min_select ?? 0),
      max_select: g.max_select == null ? "" : String(g.max_select),
      addons: (g.addons?.length ? g.addons : item.addons ?? []).map((a) => ({
        name: a.name,
        price: String(a.price),
        is_available: a.is_available !== false,
        weight_grams: a.weight_grams != null ? String(a.weight_grams) : "",
        food_type: dietSelectValue(a.food_type),
      })),
    }));
  }
  if (item.addons?.length) {
    return [
      {
        name: "Toppings",
        rule: "any",
        min_select: "0",
        max_select: "",
        addons: item.addons.map((a) => ({
          name: a.name,
          price: String(a.price),
          is_available: a.is_available !== false,
          weight_grams: a.weight_grams != null ? String(a.weight_grams) : "",
          food_type: dietSelectValue(a.food_type),
        })),
      },
    ];
  }
  return [emptyAddonGroup()];
}

export function rowsToVariations(rows: VariationRow[]): MenuVariationInput[] {
  const filled = rows.filter((r) => r.name.trim());
  const typeNames = filled.map((r) => r.name.trim().toLowerCase());
  if (new Set(typeNames).size !== typeNames.length) {
    throw new Error("Type names must be unique (e.g. only one Paneer)");
  }
  let defaultCount = 0;
  const result = filled.map((r, i) => {
    const kids = (r.children ?? []).filter((c) => c.name.trim());
    const kidNames = kids.map((c) => c.name.trim().toLowerCase());
    if (new Set(kidNames).size !== kidNames.length) {
      throw new Error(`Sizes under “${r.name.trim()}” must be unique`);
    }
    if (kids.length) defaultCount += kids.filter((c) => c.is_default).length;
    else if (r.is_default) defaultCount += 1;
    return {
      name: r.name.trim(),
      price: kids.length ? 0 : parseFloat(r.price) || 0,
      sort_order: i,
      is_default: kids.length ? false : r.is_default,
      is_available: r.is_available,
      weight_grams: parseWeightGrams(r.weight_grams),
      food_type: dietFromSelect(r.food_type),
      children: kids.map((c, j) => ({
        name: c.name.trim(),
        price: parseFloat(c.price) || 0,
        sort_order: j,
        is_default: c.is_default,
        is_available: c.is_available,
        weight_grams: parseWeightGrams(c.weight_grams),
        food_type: dietFromSelect(c.food_type),
      })),
    };
  });
  if (result.length > 0 && defaultCount > 1) {
    throw new Error("Only one size can be the POS default");
  }
  if (result.length > 0 && defaultCount === 0) {
    const first = result[0];
    if (first.children.length) first.children[0].is_default = true;
    else first.is_default = true;
  }
  return result;
}

export function rowsToAddonGroups(rows: AddonGroupRow[]): MenuAddonGroupInput[] {
  const groups = rows
    .map((g, i) => {
      const addons = g.addons.filter((a) => a.name.trim());
      const names = addons.map((a) => a.name.trim().toLowerCase());
      if (new Set(names).size !== names.length) {
        throw new Error(`Topping names in “${g.name.trim() || "group"}” must be unique`);
      }
      const { min_select, max_select } = minMaxFromRule(g);
      return {
        name: g.name.trim() || "Toppings",
        min_select,
        max_select,
        sort_order: i,
        addons: addons.map((a, j) => ({
          name: a.name.trim(),
          price: parseFloat(a.price) || 0,
          sort_order: j,
          is_available: a.is_available,
          weight_grams: parseWeightGrams(a.weight_grams),
          food_type: dietFromSelect(a.food_type),
        })),
      };
    })
    .filter((g) => g.addons.length > 0);
  return groups;
}

function firstLeafPrice(rows: VariationRow[]): number | null {
  for (const type of rows) {
    const kids = (type.children ?? []).filter((c) => c.name.trim());
    if (kids.length) {
      const def = kids.find((c) => c.is_default) ?? kids[0];
      return parseFloat(def.price) || 0;
    }
    if (type.name.trim()) return parseFloat(type.price) || 0;
  }
  return null;
}

export function defaultLeafPrice(rows: VariationRow[]): number | null {
  return firstLeafPrice(rows);
}

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

function setDefaultLeaf(rows: VariationRow[], typeIdx: number, sizeIdx: number | null): VariationRow[] {
  return rows.map((type, ti) => ({
    ...type,
    is_default: sizeIdx === null && ti === typeIdx,
    children: (type.children ?? []).map((size, si) => ({
      ...size,
      is_default: ti === typeIdx && sizeIdx !== null && si === sizeIdx,
    })),
  }));
}

export function MenuModifierFields({
  variations,
  setVariations,
  groups,
  setGroups,
  variationRadioName,
}: Props) {
  const filledTypes = variations.filter((r) => r.name.trim()).length;
  const sizeCount = variations.reduce(
    (n, t) => n + (t.children ?? []).filter((c) => c.name.trim()).length,
    0,
  );

  const patchType = (idx: number, patch: Partial<VariationRow>) => {
    const next = [...variations];
    next[idx] = { ...next[idx], ...patch };
    setVariations(next);
  };

  const patchSize = (typeIdx: number, sizeIdx: number, patch: Partial<VariationRow>) => {
    const next = [...variations];
    const kids = [...(next[typeIdx].children ?? [])];
    kids[sizeIdx] = { ...kids[sizeIdx], ...patch };
    next[typeIdx] = { ...next[typeIdx], children: kids };
    setVariations(next);
  };

  const addHalfFull = (typeIdx: number) => {
    const type = variations[typeIdx];
    const existing = new Set((type.children ?? []).map((c) => c.name.trim().toLowerCase()));
    const extras: VariationRow[] = [];
    if (!existing.has("half")) extras.push({ ...emptySize(), name: "Half" });
    if (!existing.has("full")) extras.push({ ...emptySize(), name: "Full" });
    if (!extras.length) return;
    const kids = [...(type.children ?? []), ...extras];
    if (!kids.some((c) => c.is_default) && !variations.some((t) => t.is_default || t.children.some((c) => c.is_default))) {
      kids[0] = { ...kids[0], is_default: true };
    }
    const next = [...variations];
    next[typeIdx] = { ...type, children: kids, is_default: false };
    setVariations(next);
  };

  const patchGroup = (idx: number, patch: Partial<AddonGroupRow>) => {
    const next = [...groups];
    next[idx] = { ...next[idx], ...patch };
    setGroups(next);
  };

  const patchAddon = (groupIdx: number, addonIdx: number, patch: Partial<AddonRow>) => {
    const next = [...groups];
    const addons = [...next[groupIdx].addons];
    addons[addonIdx] = { ...addons[addonIdx], ...patch };
    next[groupIdx] = { ...next[groupIdx], addons };
    setGroups(next);
  };

  return (
    <div className="menu-mod-panel">
      <p className="menu-mod-panel__hint">
        Build the dish the way the cashier sells it: <strong>type</strong> first (Paneer, Veg), then
        a <strong>size</strong> under it (Half, Full). Price lives on the size. Toppings sit in
        groups so POS can require “pick one sauce” or allow “any extras”.
      </p>

      <div className="menu-mod-panel__stack">
        <section className="menu-mod-section" aria-labelledby="variations-heading">
          <div className="menu-mod-section__head">
            <h3 id="variations-heading">Types &amp; sizes</h3>
            <span className="menu-mod-section__tag">One sellable pick on POS</span>
          </div>
          <p className="menu-mod-section__desc">
            {filledTypes > 0
              ? `${filledTypes} type${filledTypes === 1 ? "" : "s"}${sizeCount ? ` · ${sizeCount} sizes` : ""} — guest pays the size they tap.`
              : "Leave names empty to sell the item at a single base price."}
          </p>

          <ul className="menu-mod-types">
            {variations.map((type, typeIdx) => {
              const sizes = type.children ?? [];
              const hasSizes = sizes.length > 0;
              return (
                <li key={typeIdx} className="menu-mod-type">
                  <div className="menu-mod-type__head">
                    <Field label="Type" className="menu-mod-field--wide">
                      <input
                        className="menu-mod-field__input"
                        placeholder="e.g. Paneer"
                        value={type.name}
                        onChange={(e) => patchType(typeIdx, { name: e.target.value })}
                      />
                    </Field>
                    {!hasSizes && (
                      <Field label="Price ₹">
                        <input
                          className="menu-mod-field__input"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={type.price}
                          onChange={(e) => patchType(typeIdx, { price: e.target.value })}
                        />
                      </Field>
                    )}
                    <Field label="Diet">
                      <select
                        className="menu-mod-field__input"
                        value={type.food_type}
                        onChange={(e) =>
                          patchType(typeIdx, { food_type: e.target.value as ModifierFoodType })
                        }
                      >
                        {DIET_SELECT_OPTIONS.map((o) => (
                          <option key={o.label} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="On POS">
                      <select
                        className="menu-mod-field__input"
                        value={type.is_available ? "yes" : "no"}
                        onChange={(e) => patchType(typeIdx, { is_available: e.target.value === "yes" })}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">Hidden</option>
                      </select>
                    </Field>
                    {!hasSizes && (
                      <div className="menu-mod-option__default">
                        <span className="menu-mod-field__label">Default</span>
                        <label className="menu-mod-default-radio">
                          <input
                            type="radio"
                            name={variationRadioName}
                            checked={type.is_default}
                            onChange={() => setVariations(setDefaultLeaf(variations, typeIdx, null))}
                          />
                          {type.is_default ? "Yes" : "No"}
                        </label>
                      </div>
                    )}
                    <div className="menu-mod-option__actions">
                      <button
                        type="button"
                        className="menu-mod-option__remove"
                        disabled={variations.length <= 1}
                        onClick={() => setVariations(removeRow(variations, typeIdx))}
                      >
                        Remove type
                      </button>
                    </div>
                  </div>

                  <div className="menu-mod-sizes">
                    <div className="menu-mod-sizes__bar">
                      <p className="menu-mod-sizes__title">
                        {hasSizes ? "Sizes under this type — price is billed here" : "No sizes yet — this type sells as-is, or add Half / Full"}
                      </p>
                      <div className="menu-mod-sizes__actions">
                        <button
                          type="button"
                          className="menu-mod-ghost"
                          onClick={() => addHalfFull(typeIdx)}
                        >
                          + Half &amp; Full
                        </button>
                        <button
                          type="button"
                          className="menu-mod-ghost"
                          onClick={() =>
                            patchType(typeIdx, { children: [...sizes, emptySize()], is_default: false })
                          }
                        >
                          + Add size
                        </button>
                      </div>
                    </div>
                    {hasSizes && (
                      <ul className="menu-mod-options">
                        {sizes.map((size, sizeIdx) => (
                          <li key={sizeIdx} className="menu-mod-option menu-mod-option--size">
                            <div className="menu-mod-option__grid menu-mod-option__grid--size">
                              <Field label="Size" className="menu-mod-field--wide">
                                <input
                                  className="menu-mod-field__input"
                                  placeholder="e.g. Half"
                                  value={size.name}
                                  onChange={(e) => patchSize(typeIdx, sizeIdx, { name: e.target.value })}
                                />
                              </Field>
                              <Field label="Price ₹">
                                <input
                                  className="menu-mod-field__input"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0"
                                  value={size.price}
                                  onChange={(e) => patchSize(typeIdx, sizeIdx, { price: e.target.value })}
                                />
                              </Field>
                              <Field label="Diet">
                                <select
                                  className="menu-mod-field__input"
                                  value={size.food_type}
                                  onChange={(e) =>
                                    patchSize(typeIdx, sizeIdx, {
                                      food_type: e.target.value as ModifierFoodType,
                                    })
                                  }
                                >
                                  {DIET_SELECT_OPTIONS.map((o) => (
                                    <option key={o.label} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="On POS">
                                <select
                                  className="menu-mod-field__input"
                                  value={size.is_available ? "yes" : "no"}
                                  onChange={(e) =>
                                    patchSize(typeIdx, sizeIdx, { is_available: e.target.value === "yes" })
                                  }
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
                                  value={size.weight_grams}
                                  onChange={(e) =>
                                    patchSize(typeIdx, sizeIdx, { weight_grams: e.target.value })
                                  }
                                />
                              </Field>
                              <div className="menu-mod-option__default">
                                <span className="menu-mod-field__label">Default</span>
                                <label className="menu-mod-default-radio">
                                  <input
                                    type="radio"
                                    name={variationRadioName}
                                    checked={size.is_default}
                                    onChange={() =>
                                      setVariations(setDefaultLeaf(variations, typeIdx, sizeIdx))
                                    }
                                  />
                                  {size.is_default ? "Yes" : "No"}
                                </label>
                              </div>
                              <div className="menu-mod-option__actions">
                                <button
                                  type="button"
                                  className="menu-mod-option__remove"
                                  onClick={() =>
                                    patchType(
                                      typeIdx,
                                      { children: sizes.filter((_, i) => i !== sizeIdx) },
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-section__add"
            onClick={() => setVariations([...variations, emptyVariation()])}
          >
            + Add type
          </button>
        </section>

        <section className="menu-mod-section" aria-labelledby="toppings-heading">
          <div className="menu-mod-section__head">
            <h3 id="toppings-heading">Topping groups</h3>
            <span className="menu-mod-section__tag menu-mod-section__tag--muted">Rules on POS</span>
          </div>
          <p className="menu-mod-section__desc">
            Split extras by how they are ordered — sauces (pick one), cheese (any), combo add-ons
            (required). Each group is a separate step on billing.
          </p>

          <ul className="menu-mod-types">
            {groups.map((group, groupIdx) => (
              <li key={groupIdx} className="menu-mod-type menu-mod-type--group">
                <div className="menu-mod-type__head menu-mod-type__head--group">
                  <Field label="Group name" className="menu-mod-field--wide">
                    <input
                      className="menu-mod-field__input"
                      placeholder="e.g. Sauces"
                      value={group.name}
                      onChange={(e) => patchGroup(groupIdx, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="POS rule">
                    <select
                      className="menu-mod-field__input"
                      value={group.rule}
                      onChange={(e) =>
                        patchGroup(groupIdx, { rule: e.target.value as AddonRule })
                      }
                    >
                      <option value="any">Any number</option>
                      <option value="optional_one">Optional — pick one</option>
                      <option value="required_one">Required — pick one</option>
                      <option value="required_two">Required — pick two</option>
                      <option value="custom">Custom range</option>
                    </select>
                  </Field>
                  {group.rule === "custom" && (
                    <>
                      <Field label="Min">
                        <input
                          className="menu-mod-field__input"
                          type="number"
                          min={0}
                          value={group.min_select}
                          onChange={(e) => patchGroup(groupIdx, { min_select: e.target.value })}
                        />
                      </Field>
                      <Field label="Max">
                        <input
                          className="menu-mod-field__input"
                          type="number"
                          min={1}
                          placeholder="∞"
                          value={group.max_select}
                          onChange={(e) => patchGroup(groupIdx, { max_select: e.target.value })}
                        />
                      </Field>
                    </>
                  )}
                  <div className="menu-mod-option__actions">
                    <button
                      type="button"
                      className="menu-mod-option__remove"
                      disabled={groups.length <= 1}
                      onClick={() => setGroups(removeRow(groups, groupIdx))}
                    >
                      Remove group
                    </button>
                  </div>
                </div>

                <ul className="menu-mod-options">
                  {group.addons.map((addon, addonIdx) => (
                    <li key={addonIdx} className="menu-mod-option">
                      <div className="menu-mod-option__grid menu-mod-option__grid--addon">
                        <Field label="Topping" className="menu-mod-field--wide">
                          <input
                            className="menu-mod-field__input"
                            placeholder="e.g. Extra mayo"
                            value={addon.name}
                            onChange={(e) => patchAddon(groupIdx, addonIdx, { name: e.target.value })}
                          />
                        </Field>
                        <Field label="+ ₹">
                          <input
                            className="menu-mod-field__input"
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0"
                            value={addon.price}
                            onChange={(e) => patchAddon(groupIdx, addonIdx, { price: e.target.value })}
                          />
                        </Field>
                        <Field label="Diet">
                          <select
                            className="menu-mod-field__input"
                            value={addon.food_type}
                            onChange={(e) =>
                              patchAddon(groupIdx, addonIdx, {
                                food_type: e.target.value as ModifierFoodType,
                              })
                            }
                          >
                            {DIET_SELECT_OPTIONS.map((o) => (
                              <option key={o.label} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="On POS">
                          <select
                            className="menu-mod-field__input"
                            value={addon.is_available ? "yes" : "no"}
                            onChange={(e) =>
                              patchAddon(groupIdx, addonIdx, { is_available: e.target.value === "yes" })
                            }
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
                            value={addon.weight_grams}
                            onChange={(e) =>
                              patchAddon(groupIdx, addonIdx, { weight_grams: e.target.value })
                            }
                          />
                        </Field>
                        <div className="menu-mod-option__actions">
                          <button
                            type="button"
                            className="menu-mod-option__remove"
                            disabled={group.addons.length <= 1}
                            onClick={() =>
                              patchGroup(groupIdx, {
                                addons: removeRow(group.addons, addonIdx),
                              })
                            }
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
                  className="menu-mod-ghost menu-mod-ghost--inline"
                  onClick={() =>
                    patchGroup(groupIdx, { addons: [...group.addons, emptyAddon()] })
                  }
                >
                  + Add topping
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-mod-section__add"
            onClick={() => setGroups([...groups, emptyAddonGroup(groups.length ? "" : "Toppings")])}
          >
            + Add topping group
          </button>
        </section>
      </div>
    </div>
  );
}
