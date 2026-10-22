import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ItemRecipe, RecipeCategory } from "../../../types/itemRecipes";
import type { RecipeDraft } from "../../../hooks/useItemRecipes";
import { categoryNameById, newLineId } from "../../../utils/itemRecipesStorage";
import type { InventoryItem, MenuItem } from "../../../types/owner";

type Mode = "create" | "edit" | "view";

type Props = {
  open: boolean;
  mode: Mode;
  recipe: ItemRecipe | null;
  categories: RecipeCategory[];
  menuItems: MenuItem[];
  rawMaterials?: InventoryItem[];
  onClose: () => void;
  onSave: (draft: RecipeDraft, existingId?: string) => void;
  onAddCategory: (name: string) => RecipeCategory | null;
};

const emptyIngredient = () => ({
  id: newLineId(),
  name: "",
  quantity: "",
  unit: "",
  rawMaterialId: null as string | null,
});
const emptyOption = () => ({ id: newLineId(), label: "" });

function recipeToDraft(recipe: ItemRecipe | null, defaultCategoryId: string): RecipeDraft {
  if (!recipe) {
    return {
      name: "",
      categoryId: defaultCategoryId,
      menuItemId: null,
      options: [emptyOption()],
      ingredients: [emptyIngredient()],
      notes: "",
    };
  }
  return {
    name: recipe.name,
    categoryId: recipe.categoryId,
    menuItemId: recipe.menuItemId,
    options: recipe.options.length ? recipe.options : [emptyOption()],
    ingredients: recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()],
    notes: recipe.notes,
  };
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ItemRecipeModal({
  open,
  mode,
  recipe,
  categories,
  menuItems,
  rawMaterials = [],
  onClose,
  onSave,
  onAddCategory,
}: Props) {
  const readOnly = mode === "view";
  const defaultCategoryId = categories[0]?.id ?? "";
  const [draft, setDraft] = useState<RecipeDraft>(() => recipeToDraft(recipe, defaultCategoryId));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(recipeToDraft(recipe, categories[0]?.id ?? ""));
    setLocalError(null);
    setNewCategoryName("");
  }, [open, recipe, categories]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => {
    if (mode === "create") return "Create recipe";
    if (mode === "edit") return "Edit recipe";
    return "Recipe details";
  }, [mode]);

  const subtitle = useMemo(() => {
    if (mode === "create") return "Name the dish, pick a category, then add options and ingredients.";
    if (mode === "edit") return "Update this recipe. Changes are saved on this browser for the current outlet.";
    return "Read-only view of this recipe.";
  }, [mode]);

  const linkedMenuName = useMemo(() => {
    const id = readOnly ? recipe?.menuItemId : draft.menuItemId;
    if (!id) return null;
    return menuItems.find((m) => m.id === id)?.name ?? null;
  }, [readOnly, recipe?.menuItemId, draft.menuItemId, menuItems]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const name = draft.name.trim();
    if (!name) {
      setLocalError("Recipe name is required.");
      return;
    }
    if (!draft.categoryId && categories.length === 0) {
      setLocalError("Add at least one recipe category first.");
      return;
    }
    const categoryId = draft.categoryId || categories[0]?.id || "";
    const options = draft.options
      .map((o) => ({ ...o, label: o.label.trim() }))
      .filter((o) => o.label);
    const ingredients = draft.ingredients
      .map((i) => {
        const material = rawMaterials.find((m) => m.id === i.rawMaterialId);
        const name = material?.name ?? i.name.trim();
        return {
          ...i,
          name,
          quantity: i.quantity.trim(),
          unit: (material?.unit ?? i.unit).trim(),
          rawMaterialId: i.rawMaterialId || null,
        };
      })
      .filter((i) => i.name || i.rawMaterialId);
    onSave(
      {
        ...draft,
        name,
        categoryId,
        options,
        ingredients,
        notes: draft.notes.trim(),
      },
      mode === "edit" ? recipe?.id : undefined,
    );
    onClose();
  };

  const addCategoryInline = () => {
    const cat = onAddCategory(newCategoryName);
    if (!cat) {
      setLocalError("Could not add category (empty or duplicate name).");
      return;
    }
    setDraft((d) => ({ ...d, categoryId: cat.id }));
    setNewCategoryName("");
    setLocalError(null);
  };

  const filledOptions = draft.options.filter((o) => o.label.trim());
  const filledIngredients = draft.ingredients.filter((i) => i.name.trim());

  return (
    <div className="ir-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ir-modal card ir-modal--${mode}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ir-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ir-modal__head">
          <div className="ir-modal__head-copy">
            <span className={`ir-mode-badge ir-mode-badge--${mode}`}>
              {mode === "create" ? "New" : mode === "edit" ? "Edit" : "View"}
            </span>
            <h2 id="ir-modal-title">{title}</h2>
            <p className="ir-modal__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </header>

        {readOnly ? (
          <div className="ir-modal__body">
            <section className="ir-view-hero">
              <h3 className="ir-view-hero__name">{recipe?.name || "Untitled recipe"}</h3>
              <div className="ir-view-chips">
                <span className="ir-chip">
                  {categoryNameById(categories, recipe?.categoryId ?? "")}
                </span>
                {linkedMenuName && (
                  <span className="ir-chip ir-chip--muted">Menu: {linkedMenuName}</span>
                )}
              </div>
              {recipe?.updatedAt && (
                <p className="ir-view-hero__meta muted">Updated {formatWhen(recipe.updatedAt)}</p>
              )}
            </section>

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Options</h3>
                <span className="ir-section__count">{filledOptions.length}</span>
              </div>
              {filledOptions.length === 0 ? (
                <p className="ir-empty-note">No options on this recipe.</p>
              ) : (
                <ul className="ir-option-chips">
                  {filledOptions.map((opt) => (
                    <li key={opt.id}>{opt.label}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Ingredients</h3>
                <span className="ir-section__count">{filledIngredients.length}</span>
              </div>
              {filledIngredients.length === 0 ? (
                <p className="ir-empty-note">No ingredients listed yet.</p>
              ) : (
                <div className="ir-ing-table-wrap">
                  <table className="ir-ing-table">
                    <thead>
                      <tr>
                        <th>Raw material</th>
                        <th>Qty</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledIngredients.map((ing) => (
                        <tr key={ing.id}>
                          <td>{ing.name}</td>
                          <td>{ing.quantity || "—"}</td>
                          <td>{ing.unit || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Notes</h3>
              </div>
              {draft.notes.trim() ? (
                <p className="ir-notes-block">{draft.notes}</p>
              ) : (
                <p className="ir-empty-note">No notes.</p>
              )}
            </section>
          </div>
        ) : (
          <form className="ir-form" onSubmit={submit} id="ir-recipe-form">
            <div className="ir-modal__body">
              {localError && (
                <p className="form-error ir-form-error" role="alert">{localError}</p>
              )}

              <section className="ir-section">
                <div className="ir-section__head">
                  <h3>Basics</h3>
                </div>
                <div className="ir-grid">
                  <label className="field ir-grid--full">
                    <span>Recipe name</span>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="e.g. Margherita Pizza"
                      autoFocus={mode === "create"}
                    />
                  </label>

                  <label className="field">
                    <span>Recipe category</span>
                    <select
                      value={draft.categoryId}
                      disabled={categories.length === 0}
                      onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                    >
                      {categories.length === 0 && <option value="">No categories yet</option>}
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Link menu item <em>(optional)</em></span>
                    <select
                      value={draft.menuItemId ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, menuItemId: e.target.value || null })
                      }
                    >
                      <option value="">Not linked</option>
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="ir-add-category">
                  <span className="ir-add-category__label">Or create a category</span>
                  <div className="ir-add-category__row">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Pizza, Desserts"
                      aria-label="New recipe category name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCategoryInline();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addCategoryInline}>
                      Add category
                    </button>
                  </div>
                </div>
              </section>

              <section className="ir-section">
                <div className="ir-section__head">
                  <h3>Options / variants</h3>
                  <span className="ir-section__count">{draft.options.length}</span>
                </div>
                <p className="ir-section__hint">
                  Size, spice level, or other serving options for this recipe.
                </p>
                <ul className="ir-line-list">
                  {draft.options.map((opt, idx) => (
                    <li key={opt.id} className="ir-line-row">
                      <span className="ir-line-row__index" aria-hidden="true">{idx + 1}</span>
                      <input
                        value={opt.label}
                        placeholder="e.g. Regular, Extra spicy"
                        aria-label={`Option ${idx + 1}`}
                        onChange={(e) => {
                          const options = [...draft.options];
                          options[idx] = { ...opt, label: e.target.value };
                          setDraft({ ...draft, options });
                        }}
                      />
                      {draft.options.length > 1 && (
                        <button
                          type="button"
                          className="ir-remove-btn"
                          aria-label={`Remove option ${idx + 1}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              options: draft.options.filter((o) => o.id !== opt.id),
                            })
                          }
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm ir-add-line"
                  onClick={() => setDraft({ ...draft, options: [...draft.options, emptyOption()] })}
                >
                  + Add option
                </button>
              </section>

              <section className="ir-section">
                <div className="ir-section__head">
                  <h3>Ingredients (BOM)</h3>
                  <span className="ir-section__count">{draft.ingredients.length}</span>
                </div>
                <p className="ir-section__hint">
                  Raw materials used for one serving of this recipe.
                </p>
                {rawMaterials.length === 0 && (
                  <p className="ir-empty-note">
                    No raw materials yet. Add them under Raw materials, then pick them here so KOT can deduct stock.
                  </p>
                )}
                <div className="ir-ing-editor">
                  <div className="ir-ing-editor__head" aria-hidden="true">
                    <span>Raw material</span>
                    <span>Qty / serve</span>
                    <span>Unit</span>
                    <span />
                  </div>
                  {draft.ingredients.map((ing, idx) => {
                    const linked = rawMaterials.find((m) => m.id === ing.rawMaterialId);
                    return (
                      <div key={ing.id} className="ir-ingredient-row">
                        <select
                          value={ing.rawMaterialId ?? ""}
                          aria-label={`Ingredient ${idx + 1} raw material`}
                          onChange={(e) => {
                            const id = e.target.value || null;
                            const material = rawMaterials.find((m) => m.id === id);
                            const ingredients = [...draft.ingredients];
                            ingredients[idx] = {
                              ...ing,
                              rawMaterialId: id,
                              name: material?.name ?? "",
                              unit: material?.unit ?? ing.unit,
                            };
                            setDraft({ ...draft, ingredients });
                          }}
                        >
                          <option value="">Select material</option>
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          value={ing.quantity}
                          placeholder="1"
                          aria-label={`Ingredient ${idx + 1} quantity`}
                          onChange={(e) => {
                            const ingredients = [...draft.ingredients];
                            ingredients[idx] = { ...ing, quantity: e.target.value };
                            setDraft({ ...draft, ingredients });
                          }}
                        />
                        <input
                          value={linked?.unit ?? ing.unit}
                          readOnly
                          aria-label={`Ingredient ${idx + 1} unit`}
                        />
                        {draft.ingredients.length > 1 ? (
                          <button
                            type="button"
                            className="ir-remove-btn"
                            aria-label={`Remove ingredient ${idx + 1}`}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                ingredients: draft.ingredients.filter((i) => i.id !== ing.id),
                              })
                            }
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="ir-ing-spacer" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm ir-add-line"
                  onClick={() =>
                    setDraft({ ...draft, ingredients: [...draft.ingredients, emptyIngredient()] })
                  }
                >
                  + Add ingredient
                </button>
              </section>

              <section className="ir-section">
                <div className="ir-section__head">
                  <h3>Notes</h3>
                </div>
                <label className="field ir-notes-field">
                  <span className="visually-hidden">Notes</span>
                  <textarea
                    rows={4}
                    value={draft.notes}
                    placeholder="Prep notes, yield, or kitchen instructions"
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </label>
              </section>
            </div>
          </form>
        )}

        <footer className="ir-modal__foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {readOnly ? "Done" : "Cancel"}
          </button>
          {!readOnly && (
            <button type="submit" form="ir-recipe-form" className="btn btn-primary">
              {mode === "create" ? "Save recipe" : "Save changes"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
