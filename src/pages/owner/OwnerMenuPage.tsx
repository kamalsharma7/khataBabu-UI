import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  listMenuCategories,
  listMenuItems,
  replaceMenuItemModifiers,
  updateMenuItem,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type {
  MenuAddonInput,
  MenuCategory,
  MenuItem,
  MenuVariationInput,
} from "../../types/owner";

type VariationRow = { name: string; price: string; is_default: boolean };
type AddonRow = { name: string; price: string };

const emptyVariation = (defaultSize = false): VariationRow => ({
  name: "",
  price: "",
  is_default: defaultSize,
});
const emptyAddon = (): AddonRow => ({ name: "", price: "" });

function rowsToVariations(rows: VariationRow[]): MenuVariationInput[] {
  const filled = rows.filter((r) => r.name.trim());
  return filled.map((r, i) => ({
    name: r.name.trim(),
    price: parseFloat(r.price) || 0,
    sort_order: i,
    is_default: r.is_default,
  }));
}

function rowsToAddons(rows: AddonRow[]): MenuAddonInput[] {
  const filled = rows.filter((r) => r.name.trim());
  return filled.map((r, i) => ({
    name: r.name.trim(),
    price: parseFloat(r.price) || 0,
    sort_order: i,
    is_available: true,
  }));
}

function formatModifiers(item: MenuItem): string {
  const parts: string[] = [];
  if (item.variations?.length) {
    parts.push(
      item.variations.map((v) => `${v.name} ₹${v.price}${v.is_default ? " (default)" : ""}`).join(", "),
    );
  }
  if (item.addons?.length) {
    parts.push(`+ ${item.addons.map((a) => `${a.name} ₹${a.price}`).join(", ")}`);
  }
  return parts.join(" · ") || "—";
}

function itemToVariationRows(item: MenuItem): VariationRow[] {
  if (!item.variations?.length) return [emptyVariation()];
  return item.variations.map((v) => ({
    name: v.name,
    price: String(v.price),
    is_default: v.is_default,
  }));
}

function itemToAddonRows(item: MenuItem): AddonRow[] {
  if (!item.addons?.length) return [emptyAddon()];
  return item.addons.map((a) => ({ name: a.name, price: String(a.price) }));
}

type OwnerMenuPageProps = { embedded?: boolean };

export function OwnerMenuPage({ embedded }: OwnerMenuPageProps = {}) {
  const { outlet } = useOwnerOutlet();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [itemForm, setItemForm] = useState({
    category_id: "",
    name: "",
    price: "",
    short_code: "",
    food_type: "veg" as "veg" | "non_veg" | "egg",
  });
  const [newVariations, setNewVariations] = useState<VariationRow[]>([emptyVariation()]);
  const [newAddons, setNewAddons] = useState<AddonRow[]>([emptyAddon()]);

  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editVariations, setEditVariations] = useState<VariationRow[]>([]);
  const [editAddons, setEditAddons] = useState<AddonRow[]>([]);

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, its] = await Promise.all([
        listMenuCategories(outlet.id),
        listMenuItems(outlet.id),
      ]);
      setCategories(cats);
      setItems(its);
      setItemForm((f) => ({
        ...f,
        category_id: f.category_id || cats[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !newCategory.trim()) return;
    try {
      await createMenuCategory(outlet.id, newCategory.trim());
      setNewCategory("");
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const addItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet) return;
    const variations = rowsToVariations(newVariations);
    const addons = rowsToAddons(newAddons);
    const basePrice =
      variations.length > 0
        ? variations.find((v) => v.is_default)?.price ?? variations[0].price
        : parseFloat(itemForm.price);
    try {
      await createMenuItem(outlet.id, {
        category_id: itemForm.category_id,
        name: itemForm.name.trim(),
        price: basePrice,
        short_code: itemForm.short_code.trim() || null,
        food_type: itemForm.food_type,
        is_veg: itemForm.food_type !== "non_veg",
        variations,
        addons,
      });
      setItemForm((f) => ({ ...f, name: "", price: "", short_code: "" }));
      setNewVariations([emptyVariation()]);
      setNewAddons([emptyAddon()]);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!outlet) return;
    try {
      await updateMenuItem(outlet.id, item.id, { is_available: !item.is_available });
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const removeCategory = async (cat: MenuCategory) => {
    if (!outlet) return;
    if (!confirm(`Delete category "${cat.name}" and its items?`)) return;
    try {
      await deleteMenuCategory(outlet.id, cat.id);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const removeItem = async (item: MenuItem) => {
    if (!outlet) return;
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteMenuItem(outlet.id, item.id);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const openEditModifiers = (item: MenuItem) => {
    setEditItem(item);
    setEditVariations(itemToVariationRows(item));
    setEditAddons(itemToAddonRows(item));
  };

  const saveEditModifiers = async () => {
    if (!outlet || !editItem) return;
    try {
      await replaceMenuItemModifiers(outlet.id, editItem.id, {
        variations: rowsToVariations(editVariations),
        addons: rowsToAddons(editAddons),
      });
      setEditItem(null);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const setDefaultVariation = (
    rows: VariationRow[],
    setRows: (r: VariationRow[]) => void,
    index: number,
  ) => {
    setRows(rows.map((r, i) => ({ ...r, is_default: i === index })));
  };

  const hasVariationsInForm = newVariations.some((r) => r.name.trim());

  if (!outlet) return <p className="muted">No outlet found.</p>;

  const itemsByCategory = (catId: string) => items.filter((i) => i.category_id === catId);

  return (
    <div className={`page menu-page${embedded ? " menu-page--embedded" : ""}`}>
      <h1>Menu</h1>
      {!embedded && (
        <p className="muted">
          Categories and items are saved in the database for this outlet — they stay after you restart
          the app or server until you add, edit, or remove them.
        </p>
      )}

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="menu-layout">
        <section className="card menu-panel">
          <h2>Categories</h2>
          <form className="menu-inline-form" onSubmit={addCategory}>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              required
            />
            <button type="submit" className="btn btn-primary btn-sm">Add</button>
          </form>
          <ul className="menu-category-list">
            {categories.map((c) => (
              <li key={c.id}>
                <span>{c.name}</span>
                <button type="button" className="link-danger" onClick={() => removeCategory(c)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card menu-panel menu-panel--wide">
          <h2>Add item</h2>
          <form className="form-grid menu-item-form" onSubmit={addItem}>
            <label className="field">
              <span>Category</span>
              <select
                value={itemForm.category_id}
                onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Item name</span>
              <input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>{hasVariationsInForm ? "Base price (optional if sizes set)" : "Price (₹)"}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                required={!hasVariationsInForm}
              />
            </label>
            <label className="field">
              <span>Short code</span>
              <input
                value={itemForm.short_code}
                onChange={(e) => setItemForm({ ...itemForm, short_code: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Diet (POS colour stripe)</span>
              <select
                value={itemForm.food_type}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    food_type: e.target.value as "veg" | "non_veg" | "egg",
                  })
                }
              >
                <option value="veg">Veg (green)</option>
                <option value="egg">Egg (yellow)</option>
                <option value="non_veg">Non-veg (red)</option>
              </select>
            </label>

            <div className="field field--full menu-modifiers-block">
              <span className="menu-modifiers-label">Variations (sizes / types)</span>
              <p className="muted menu-modifiers-hint">e.g. Small ₹99, Medium ₹149 — mark one as default.</p>
              {newVariations.map((row, idx) => (
                <div key={idx} className="menu-modifier-row">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...newVariations];
                      next[idx] = { ...row, name: e.target.value };
                      setNewVariations(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="₹"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...newVariations];
                      next[idx] = { ...row, price: e.target.value };
                      setNewVariations(next);
                    }}
                  />
                  <label className="menu-modifier-default">
                    <input
                      type="radio"
                      name="new-default-var"
                      checked={row.is_default}
                      onChange={() => setDefaultVariation(newVariations, setNewVariations, idx)}
                    />
                    Default
                  </label>
                  {newVariations.length > 1 && (
                    <button
                      type="button"
                      className="link-danger"
                      onClick={() => setNewVariations(newVariations.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setNewVariations([...newVariations, emptyVariation()])}
              >
                + Variation
              </button>
            </div>

            <div className="field field--full menu-modifiers-block">
              <span className="menu-modifiers-label">Toppings / add-ons</span>
              <p className="muted menu-modifiers-hint">Extra charge per topping (e.g. Extra cheese ₹40).</p>
              {newAddons.map((row, idx) => (
                <div key={idx} className="menu-modifier-row">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...newAddons];
                      next[idx] = { ...row, name: e.target.value };
                      setNewAddons(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="₹"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...newAddons];
                      next[idx] = { ...row, price: e.target.value };
                      setNewAddons(next);
                    }}
                  />
                  {newAddons.length > 1 && (
                    <button
                      type="button"
                      className="link-danger"
                      onClick={() => setNewAddons(newAddons.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setNewAddons([...newAddons, emptyAddon()])}
              >
                + Topping
              </button>
            </div>

            <div className="field field--full">
              <button type="submit" className="btn btn-primary" disabled={categories.length === 0}>
                Add item
              </button>
            </div>
          </form>

          <h2 className="menu-items-heading">Items</h2>
          {categories.length === 0 && <p className="muted">Add a category first.</p>}
          {categories.map((cat) => (
            <div key={cat.id} className="menu-cat-block">
              <h3>{cat.name}</h3>
              {itemsByCategory(cat.id).length === 0 ? (
                <p className="muted">No items</p>
              ) : (
                <table className="data-table menu-items-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Price</th>
                      <th>Variations / toppings</th>
                      <th>Veg</th>
                      <th>Stock</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {itemsByCategory(cat.id).map((item) => (
                      <tr key={item.id} className={!item.is_available ? "menu-row--off" : ""}>
                        <td>{item.name}</td>
                        <td>{item.short_code ?? "—"}</td>
                        <td>₹{item.price}</td>
                        <td className="menu-modifiers-cell">{formatModifiers(item)}</td>
                        <td>{item.is_veg ? "Veg" : "Non-veg"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => toggleAvailability(item)}
                          >
                            {item.is_available ? "In stock" : "Out of stock"}
                          </button>
                        </td>
                        <td className="menu-actions-cell">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModifiers(item)}>
                            Sizes & toppings
                          </button>
                          <button type="button" className="link-danger" onClick={() => removeItem(item)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      </div>

      {editItem && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditItem(null)}>
          <div
            className="card modal menu-edit-modal"
            role="dialog"
            aria-labelledby="edit-modifiers-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-modifiers-title">Sizes & toppings — {editItem.name}</h2>
            <div className="menu-modifiers-block">
              <span className="menu-modifiers-label">Variations</span>
              {editVariations.map((row, idx) => (
                <div key={idx} className="menu-modifier-row">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...editVariations];
                      next[idx] = { ...row, name: e.target.value };
                      setEditVariations(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="₹"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...editVariations];
                      next[idx] = { ...row, price: e.target.value };
                      setEditVariations(next);
                    }}
                  />
                  <label className="menu-modifier-default">
                    <input
                      type="radio"
                      name="edit-default-var"
                      checked={row.is_default}
                      onChange={() => setDefaultVariation(editVariations, setEditVariations, idx)}
                    />
                    Default
                  </label>
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => setEditVariations(editVariations.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditVariations([...editVariations, emptyVariation()])}
              >
                + Variation
              </button>
            </div>
            <div className="menu-modifiers-block">
              <span className="menu-modifiers-label">Toppings</span>
              {editAddons.map((row, idx) => (
                <div key={idx} className="menu-modifier-row">
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...editAddons];
                      next[idx] = { ...row, name: e.target.value };
                      setEditAddons(next);
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="₹"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...editAddons];
                      next[idx] = { ...row, price: e.target.value };
                      setEditAddons(next);
                    }}
                  />
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => setEditAddons(editAddons.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditAddons([...editAddons, emptyAddon()])}
              >
                + Topping
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveEditModifiers}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
