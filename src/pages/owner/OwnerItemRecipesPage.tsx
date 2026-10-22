import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listInventoryItems, listMenuItems, replaceRecipeBom } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { ItemRecipeModal } from "../../components/owner/recipes/ItemRecipeModal";
import { useItemRecipes, type RecipeDraft } from "../../hooks/useItemRecipes";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { ItemRecipe } from "../../types/itemRecipes";
import type { InventoryItem, MenuItem } from "../../types/owner";
import { categoryNameById, recipeHasIngredients } from "../../utils/itemRecipesStorage";

type ModalState =
  | { open: false }
  | { open: true; mode: "create" | "edit" | "view"; recipe: ItemRecipe | null };

export function OwnerItemRecipesPage() {
  const { outlet } = useOwnerOutlet();
  const {
    store,
    hydrated,
    addCategory,
    deleteCategory,
    upsertRecipe,
    deleteRecipe,
    duplicateRecipe,
  } = useItemRecipes(outlet?.id);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<InventoryItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMenuItemId, setFilterMenuItemId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [onlyWithIngredients, setOnlyWithIngredients] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabCategoryId, setActiveTabCategoryId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const loadMenu = useCallback(async () => {
    if (!outlet) return;
    setMenuLoading(true);
    setError(null);
    try {
      const [menu, materials] = await Promise.all([
        listMenuItems(outlet.id),
        listInventoryItems(outlet.id, "raw").catch(() => [] as InventoryItem[]),
      ]);
      setMenuItems(menu);
      setRawMaterials(materials);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load menu items");
    } finally {
      setMenuLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const recipes = store.recipes;

  const tabCounts = useMemo(() => {
    const all = recipes.length;
    const byCat = new Map<string, number>();
    for (const r of recipes) {
      byCat.set(r.categoryId, (byCat.get(r.categoryId) ?? 0) + 1);
    }
    return { all, byCat };
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    let list = [...recipes];
    if (activeTabCategoryId !== "all") {
      list = list.filter((r) => r.categoryId === activeTabCategoryId);
    }
    if (filterCategoryId) {
      list = list.filter((r) => r.categoryId === filterCategoryId);
    }
    if (filterMenuItemId) {
      list = list.filter((r) => r.menuItemId === filterMenuItemId);
    }
    if (onlyWithIngredients) {
      list = list.filter(recipeHasIngredients);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const cat = categoryNameById(store.categories, r.categoryId).toLowerCase();
        return r.name.toLowerCase().includes(q) || cat.includes(q);
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    recipes,
    activeTabCategoryId,
    filterCategoryId,
    filterMenuItemId,
    onlyWithIngredients,
    searchQuery,
    store.categories,
  ]);

  const applySearch = () => setSearchQuery(searchDraft);
  const clearFilters = () => {
    setFilterMenuItemId("");
    setFilterCategoryId("");
    setOnlyWithIngredients(false);
    setSearchDraft("");
    setSearchQuery("");
    setActiveTabCategoryId("all");
  };

  const openCreate = () => {
    if (store.categories.length === 0) {
      const cat = addCategory("General");
      if (!cat) return;
    }
    setModal({ open: true, mode: "create", recipe: null });
  };

  const handleSaveRecipe = async (draft: RecipeDraft, existingId?: string) => {
    upsertRecipe(draft, existingId);
    if (!outlet || !draft.menuItemId) return;
    const lines = draft.ingredients
      .filter((i) => i.rawMaterialId && parseFloat(i.quantity) > 0)
      .map((i) => ({
        inventory_item_id: i.rawMaterialId as string,
        qty_per_serve: parseFloat(i.quantity),
      }));
    try {
      await replaceRecipeBom(outlet.id, draft.menuItemId, lines);
    } catch (err) {
      setError(
        err instanceof OwnerApiError
          ? err.message
          : "Recipe saved locally, but kitchen stock BOM could not sync",
      );
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecipes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} recipe(s)?`)) return;
    selectedIds.forEach((id) => deleteRecipe(id));
    setSelectedIds(new Set());
  };

  if (!outlet) {
    return <p className="muted">Select an outlet to manage item recipes.</p>;
  }

  return (
    <div className="page ir-page">
      <header className="ir-page__head">
        <div>
          <h1>Item recipes</h1>
          <p className="muted">
            BOM per dish for <strong>{outlet.name}</strong>. Pick raw materials so KOT deducts kitchen stock.
            Recipe names still save on this browser.
          </p>
        </div>
        <div className="ir-page__head-actions">
          <Link to="/app/raw-materials" className="btn btn-secondary btn-sm">
            Raw materials
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCategoriesOpen(true)}>
            Categories
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Create new
          </button>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {!hydrated && <p className="muted">Loading recipes…</p>}

      <section className="card ir-filters">
        <div className="ir-filters__row">
          <label className="field ir-filter-field">
            <span>Select item</span>
            <select
              value={filterMenuItemId}
              onChange={(e) => setFilterMenuItemId(e.target.value)}
              disabled={menuLoading}
            >
              <option value="">All menu items</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="field ir-filter-field">
            <span>Select category</span>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All recipe categories</option>
              {store.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field ir-filter-field">
            <span>Recipe filter</span>
            <select
              value={onlyWithIngredients ? "created" : "all"}
              onChange={(e) => setOnlyWithIngredients(e.target.value === "created")}
            >
              <option value="all">All recipes</option>
              <option value="created">With ingredients (BOM)</option>
            </select>
          </label>
        </div>
        <div className="ir-filters__row ir-filters__search">
          <input
            type="search"
            placeholder="Search by recipe or category name"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={applySearch}>
            Search
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </section>

      <div className="ir-category-tabs" role="tablist" aria-label="Recipe categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTabCategoryId === "all"}
          className={`ir-cat-tab ${activeTabCategoryId === "all" ? "ir-cat-tab--active" : ""}`}
          onClick={() => setActiveTabCategoryId("all")}
        >
          All categories
          <span className="ir-cat-tab__count">{tabCounts.all} items</span>
        </button>
        {store.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activeTabCategoryId === c.id}
            className={`ir-cat-tab ${activeTabCategoryId === c.id ? "ir-cat-tab--active" : ""}`}
            onClick={() => setActiveTabCategoryId(c.id)}
          >
            {c.name}
            <span className="ir-cat-tab__count">
              {tabCounts.byCat.get(c.id) ?? 0} items
            </span>
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="ir-bulk-bar">
          <span>{selectedIds.size} selected</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={bulkDelete}>
            Delete selected
          </button>
        </div>
      )}

      <section className="card ir-table-card">
        <div className="table-wrap">
          <table className="data-table ir-table">
            <thead>
              <tr>
                <th className="ir-check-col">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={
                      filteredRecipes.length > 0 && selectedIds.size === filteredRecipes.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Category</th>
                <th>Options</th>
                <th className="ir-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipes.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted ir-empty-cell">
                    No recipes yet. Click <strong>Create new</strong> to add your first recipe.
                  </td>
                </tr>
              )}
              {filteredRecipes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                  <td>
                    <strong>{r.name}</strong>
                    {r.menuItemId && (
                      <div className="ir-menu-link muted">
                        {menuItems.find((m) => m.id === r.menuItemId)?.name ?? "Menu item"}
                      </div>
                    )}
                  </td>
                  <td>{categoryNameById(store.categories, r.categoryId)}</td>
                  <td>
                    {r.options.length
                      ? r.options.map((o) => o.label).join(", ")
                      : "—"}
                  </td>
                  <td>
                    <div className="ir-row-actions">
                      <button
                        type="button"
                        className="ir-icon-btn"
                        title="View"
                        onClick={() => setModal({ open: true, mode: "view", recipe: r })}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="ir-icon-btn"
                        title="Edit"
                        onClick={() => setModal({ open: true, mode: "edit", recipe: r })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ir-icon-btn ir-icon-btn--danger"
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete recipe "${r.name}"?`)) deleteRecipe(r.id);
                        }}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="ir-icon-btn"
                        title="Duplicate"
                        onClick={() => duplicateRecipe(r.id)}
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="ir-table-footer muted">
          Showing {filteredRecipes.length === 0 ? 0 : 1} to {filteredRecipes.length} of{" "}
          {filteredRecipes.length} records
        </footer>
      </section>

      <ItemRecipeModal
        open={modal.open}
        mode={modal.open ? modal.mode : "view"}
        recipe={modal.open ? modal.recipe : null}
        categories={store.categories}
        menuItems={menuItems}
        rawMaterials={rawMaterials}
        onClose={() => setModal({ open: false })}
        onSave={handleSaveRecipe}
        onAddCategory={addCategory}
      />

      {categoriesOpen && (
        <div className="ir-modal-backdrop" role="presentation" onClick={() => setCategoriesOpen(false)}>
          <div
            className="ir-modal card ir-categories-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ir-cat-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ir-modal__head">
              <div className="ir-modal__head-copy">
                <h2 id="ir-cat-title">Recipe categories</h2>
                <p className="ir-modal__subtitle">Group recipes so you can filter them on the list.</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCategoriesOpen(false)}>
                Close
              </button>
            </header>
            <div className="ir-modal__body">
              <div className="ir-inline-add ir-cat-add">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addCategory(newCatName)) setNewCatName("");
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (addCategory(newCatName)) setNewCatName("");
                  }}
                >
                  Add
                </button>
              </div>
              <ul className="ir-cat-list">
                {store.categories.length === 0 && (
                  <li className="muted">No categories. Add one to group recipes.</li>
                )}
                {store.categories.map((c) => (
                  <li key={c.id} className="ir-cat-list__item">
                    <span>{c.name}</span>
                    <span className="muted">
                      {tabCounts.byCat.get(c.id) ?? 0} recipe(s)
                    </span>
                    <button
                      type="button"
                      className="ir-remove-btn"
                      disabled={(tabCounts.byCat.get(c.id) ?? 0) > 0}
                      title={
                        (tabCounts.byCat.get(c.id) ?? 0) > 0
                          ? "Move or delete recipes in this category first"
                          : "Delete category"
                      }
                      onClick={() => {
                        if (window.confirm(`Delete category "${c.name}"?`)) deleteCategory(c.id);
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="ir-modal__foot">
              <button type="button" className="btn btn-secondary" onClick={() => setCategoriesOpen(false)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
