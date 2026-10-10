import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { MenuItemModifierSummary } from "../../components/owner/menu/MenuItemModifierSummary";
import {
  MenuModifierFields,
  type AddonRow,
  type VariationRow,
} from "../../components/owner/menu/MenuModifierFields";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { downloadMenuExcel } from "../../utils/exportMenuExcel";
import type {
  MenuAddonInput,
  MenuCategory,
  MenuItem,
  MenuVariationInput,
} from "../../types/owner";

const emptyVariation = (defaultSize = false): VariationRow => ({
  name: "",
  price: "",
  is_default: defaultSize,
  weight_grams: "",
});
const emptyAddon = (): AddonRow => ({ name: "", price: "", weight_grams: "" });

function parseWeightGrams(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rowsToVariations(rows: VariationRow[]): MenuVariationInput[] {
  const filled = rows.filter((r) => r.name.trim());
  return filled.map((r, i) => ({
    name: r.name.trim(),
    price: parseFloat(r.price) || 0,
    sort_order: i,
    is_default: r.is_default,
    weight_grams: parseWeightGrams(r.weight_grams),
  }));
}

function rowsToAddons(rows: AddonRow[]): MenuAddonInput[] {
  const filled = rows.filter((r) => r.name.trim());
  return filled.map((r, i) => ({
    name: r.name.trim(),
    price: parseFloat(r.price) || 0,
    sort_order: i,
    is_available: true,
    weight_grams: parseWeightGrams(r.weight_grams),
  }));
}

function itemToVariationRows(item: MenuItem): VariationRow[] {
  if (!item.variations?.length) return [emptyVariation()];
  return item.variations.map((v) => ({
    name: v.name,
    price: String(v.price),
    is_default: v.is_default,
    weight_grams: v.weight_grams != null ? String(v.weight_grams) : "",
  }));
}

function itemToAddonRows(item: MenuItem): AddonRow[] {
  if (!item.addons?.length) return [emptyAddon()];
  return item.addons.map((a) => ({
    name: a.name,
    price: String(a.price),
    weight_grams: a.weight_grams != null ? String(a.weight_grams) : "",
  }));
}

function dietStripeClass(item: MenuItem): string {
  const ft = item.food_type ?? (item.is_veg ? "veg" : "non_veg");
  if (ft === "non_veg") return "pp-diet--nonveg";
  if (ft === "egg") return "pp-diet--egg";
  return "pp-diet--veg";
}

function dietLabel(item: MenuItem): string {
  const ft = item.food_type ?? (item.is_veg ? "veg" : "non_veg");
  if (ft === "non_veg") return "Non-veg";
  if (ft === "egg") return "Egg";
  return "Veg";
}

type OwnerMenuPageProps = { embedded?: boolean };

export function OwnerMenuPage({ embedded = false }: OwnerMenuPageProps = {}) {
  const { outlet } = useOwnerOutlet();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | "all">("all");
  const [addPanelOpen, setAddPanelOpen] = useState(true);

  const [newCategory, setNewCategory] = useState("");
  const [itemForm, setItemForm] = useState({
    category_id: "",
    name: "",
    price: "",
    short_code: "",
    food_type: "veg" as "veg" | "non_veg" | "egg",
    gst_applicable: false,
    cgst_percent: "2.5",
    sgst_percent: "2.5",
  });
  const [newVariations, setNewVariations] = useState<VariationRow[]>([emptyVariation(true)]);
  const [newAddons, setNewAddons] = useState<AddonRow[]>([emptyAddon()]);

  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editVariations, setEditVariations] = useState<VariationRow[]>([]);
  const [editAddons, setEditAddons] = useState<AddonRow[]>([]);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);

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

  const itemsByCategory = useCallback(
    (catId: string) => items.filter((i) => i.category_id === catId),
    [items],
  );

  const visibleCategories = useMemo(() => {
    if (filterCategoryId === "all") return categories;
    return categories.filter((c) => c.id === filterCategoryId);
  }, [categories, filterCategoryId]);

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
        gst_applicable: itemForm.gst_applicable,
        cgst_percent: parseFloat(itemForm.cgst_percent) || 0,
        sgst_percent: parseFloat(itemForm.sgst_percent) || 0,
        variations,
        addons,
      });
      setItemForm((f) => ({ ...f, name: "", price: "", short_code: "" }));
      setNewVariations([emptyVariation(true)]);
      setNewAddons([emptyAddon()]);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Failed");
    }
  };

  const startEditPrice = (item: MenuItem) => {
    setEditingPriceId(item.id);
    setPriceDraft(item.price);
  };

  const cancelEditPrice = () => {
    setEditingPriceId(null);
    setPriceDraft("");
  };

  const savePrice = async (item: MenuItem) => {
    if (!outlet) return;
    const next = parseFloat(priceDraft);
    if (Number.isNaN(next) || next < 0) {
      alert("Enter a valid price (0 or more).");
      return;
    }
    setPriceSaving(true);
    try {
      await updateMenuItem(outlet.id, item.id, { price: next });
      setEditingPriceId(null);
      setPriceDraft("");
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Could not update price");
    } finally {
      setPriceSaving(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!outlet) return;
    if (items.length === 0) {
      alert("No menu items to export yet.");
      return;
    }
    void downloadMenuExcel(outlet.name, categories, items).catch(() => {
      alert("Could not create Excel file.");
    });
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
      if (filterCategoryId === cat.id) setFilterCategoryId("all");
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

  return (
    <div className={`menu-mgmt${embedded ? " menu-mgmt--embedded" : ""}`}>
      <header className="menu-mgmt__header">
        <div>
          <h1 className="menu-mgmt__title">Manage menu</h1>
          {!embedded && (
            <p className="menu-mgmt__subtitle muted">
              Categories and items are saved for this outlet and appear on the billing screen.
            </p>
          )}
        </div>
        <div className="menu-mgmt__header-actions">
          <div className="menu-mgmt__stats">
            <span className="menu-mgmt__stat">{categories.length} categories</span>
            <span className="menu-mgmt__stat">{items.length} items</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadExcel}
            disabled={loading || items.length === 0}
          >
            Download menu (Excel)
          </button>
        </div>
      </header>

      {loading && <p className="muted menu-mgmt__loading">Loading menu…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && (
        <div className="menu-mgmt__shell">
          <aside className="menu-mgmt__sidebar card">
            <h2 className="menu-mgmt__sidebar-title">Categories</h2>
            <form className="menu-mgmt__cat-form" onSubmit={addCategory}>
              <input
                className="menu-mgmt-input"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                required
              />
              <button type="submit" className="btn btn-primary btn-sm" title="Add category">
                +
              </button>
            </form>

            <nav className="menu-mgmt__cat-nav" aria-label="Filter by category">
              <button
                type="button"
                className={`menu-mgmt__cat-btn ${filterCategoryId === "all" ? "menu-mgmt__cat-btn--on" : ""}`}
                onClick={() => setFilterCategoryId("all")}
              >
                <span>All items</span>
                <span className="menu-mgmt__cat-count">{items.length}</span>
              </button>
              {categories.map((c) => (
                <div key={c.id} className="menu-mgmt__cat-row">
                  <button
                    type="button"
                    className={`menu-mgmt__cat-btn ${filterCategoryId === c.id ? "menu-mgmt__cat-btn--on" : ""}`}
                    onClick={() => setFilterCategoryId(c.id)}
                  >
                    <span>{c.name}</span>
                    <span className="menu-mgmt__cat-count">{itemsByCategory(c.id).length}</span>
                  </button>
                  <button
                    type="button"
                    className="menu-mgmt-icon-btn menu-mgmt-icon-btn--danger"
                    onClick={() => void removeCategory(c)}
                    title={`Delete ${c.name}`}
                    aria-label={`Delete ${c.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </nav>
          </aside>

          <div className="menu-mgmt__main">
            <section className="card menu-mgmt__add-card">
              <button
                type="button"
                className="menu-mgmt__add-toggle"
                onClick={() => setAddPanelOpen((o) => !o)}
                aria-expanded={addPanelOpen}
              >
                <span className="menu-mgmt__add-toggle-title">Add new item</span>
                <span className="menu-mgmt__add-toggle-icon">{addPanelOpen ? "−" : "+"}</span>
              </button>

              {addPanelOpen && (
                <form className="menu-mgmt__add-form" onSubmit={addItem}>
                  <div className="menu-mgmt__form-grid">
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
                      <span>{hasVariationsInForm ? "Base price (optional)" : "Price (₹)"}</span>
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
                        placeholder="KOT / kitchen"
                      />
                    </label>
                    <label className="field">
                      <span>Diet type</span>
                      <select
                        value={itemForm.food_type}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            food_type: e.target.value as "veg" | "non_veg" | "egg",
                          })
                        }
                      >
                        <option value="veg">Veg</option>
                        <option value="egg">Egg</option>
                        <option value="non_veg">Non-veg</option>
                      </select>
                    </label>
                    <label className="field field--checkbox">
                      <input
                        type="checkbox"
                        checked={itemForm.gst_applicable}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, gst_applicable: e.target.checked })
                        }
                      />
                      <span>GST applicable (CGST + SGST)</span>
                    </label>
                    {itemForm.gst_applicable && (
                      <>
                        <label className="field">
                          <span>CGST %</span>
                          <input
                            type="number"
                            step="0.1"
                            value={itemForm.cgst_percent}
                            onChange={(e) =>
                              setItemForm({ ...itemForm, cgst_percent: e.target.value })
                            }
                          />
                        </label>
                        <label className="field">
                          <span>SGST %</span>
                          <input
                            type="number"
                            step="0.1"
                            value={itemForm.sgst_percent}
                            onChange={(e) =>
                              setItemForm({ ...itemForm, sgst_percent: e.target.value })
                            }
                          />
                        </label>
                      </>
                    )}
                  </div>

                  <MenuModifierFields
                    variations={newVariations}
                    setVariations={setNewVariations}
                    addons={newAddons}
                    setAddons={setNewAddons}
                    variationRadioName="new-default-var"
                    emptyVariation={emptyVariation}
                    emptyAddon={emptyAddon}
                    onSetDefaultVariation={(idx) =>
                      setDefaultVariation(newVariations, setNewVariations, idx)
                    }
                  />

                  <button type="submit" className="btn btn-primary" disabled={categories.length === 0}>
                    Save item
                  </button>
                </form>
              )}
            </section>

            <section className="menu-mgmt__catalog">
              {categories.length === 0 && (
                <div className="card menu-mgmt__empty">
                  <p>Add a category on the left to start building your menu.</p>
                </div>
              )}

              {visibleCategories.map((cat) => {
                const catItems = itemsByCategory(cat.id);
                return (
                  <div key={cat.id} className="menu-mgmt__cat-section">
                    <h2 className="menu-mgmt__cat-heading">
                      {cat.name}
                      <span className="menu-mgmt__cat-heading-count">{catItems.length}</span>
                    </h2>
                    {catItems.length === 0 ? (
                      <p className="muted menu-mgmt__cat-empty">No items in this category yet.</p>
                    ) : (
                      <div className="menu-mgmt-list card">
                        {catItems.map((item) => (
                          <article
                            key={item.id}
                            className={`menu-mgmt-row ${!item.is_available ? "menu-mgmt-row--off" : ""}`}
                          >
                            <div className={`menu-mgmt-row__stripe ${dietStripeClass(item)}`} />
                            <div className="menu-mgmt-row__content">
                              <div className="menu-mgmt-row__head">
                                <div className="menu-mgmt-row__title-block">
                                  <h3 className="menu-mgmt-row__name">{item.name}</h3>
                                  <div className="menu-mgmt-row__meta">
                                    {item.short_code && (
                                      <span className="menu-mgmt-tag">Code {item.short_code}</span>
                                    )}
                                    <span className="menu-mgmt-tag">{dietLabel(item)}</span>
                                    <span
                                      className={`menu-mgmt-tag ${item.is_available ? "menu-mgmt-tag--ok" : "menu-mgmt-tag--off"}`}
                                    >
                                      {item.is_available ? "In stock" : "Hidden on POS"}
                                    </span>
                                  </div>
                                </div>
                                <div className="menu-mgmt-row__price-block">
                                  {editingPriceId === item.id ? (
                                    <div className="menu-mgmt-price-edit">
                                      <label className="menu-mgmt-price-edit__label">
                                        Base price (₹)
                                        <input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          value={priceDraft}
                                          onChange={(e) => setPriceDraft(e.target.value)}
                                          disabled={priceSaving}
                                          autoFocus
                                        />
                                      </label>
                                      <div className="menu-mgmt-price-edit__actions">
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          disabled={priceSaving}
                                          onClick={() => void savePrice(item)}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          disabled={priceSaving}
                                          onClick={cancelEditPrice}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="menu-mgmt-row__price">₹{item.price}</p>
                                      <button
                                        type="button"
                                        className="menu-mgmt-text-btn"
                                        onClick={() => startEditPrice(item)}
                                      >
                                        Change price
                                      </button>
                                      {(item.variations?.length ?? 0) > 0 && (
                                        <span className="menu-mgmt-row__price-hint muted">
                                          Size prices → Variations & toppings
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <MenuItemModifierSummary item={item} />
                            </div>
                            <div className="menu-mgmt-row__actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => toggleAvailability(item)}
                              >
                                {item.is_available ? "Out of stock" : "In stock"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openEditModifiers(item)}
                              >
                                Variations & toppings
                              </button>
                              <button
                                type="button"
                                className="menu-mgmt-text-btn menu-mgmt-text-btn--danger"
                                onClick={() => void removeItem(item)}
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      )}

      {editItem && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditItem(null)}>
          <div
            className="card modal menu-mgmt-modal menu-mgmt-modal--wide"
            role="dialog"
            aria-labelledby="edit-modifiers-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-modifiers-title" className="menu-mgmt-modal__title">
              Sizes & toppings
            </h2>
            <p className="muted menu-mgmt-modal__item">{editItem.name}</p>
            <MenuModifierFields
              variations={editVariations}
              setVariations={setEditVariations}
              addons={editAddons}
              setAddons={setEditAddons}
              variationRadioName="edit-default-var"
              emptyVariation={emptyVariation}
              emptyAddon={emptyAddon}
              onSetDefaultVariation={(idx) =>
                setDefaultVariation(editVariations, setEditVariations, idx)
              }
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void saveEditModifiers()}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
