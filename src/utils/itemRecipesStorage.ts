import type { ItemRecipe, ItemRecipesStore, RecipeCategory } from "../types/itemRecipes";

const STORAGE_PREFIX = "khatababu_item_recipes_v1_";

export function emptyItemRecipesStore(): ItemRecipesStore {
  return {
    version: 1,
    categories: [],
    recipes: [],
    autoConsumption: false,
  };
}

export function loadItemRecipesStore(outletId: string): ItemRecipesStore {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${outletId}`);
    if (!raw) return emptyItemRecipesStore();
    const parsed = JSON.parse(raw) as ItemRecipesStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.recipes) || !Array.isArray(parsed.categories)) {
      return emptyItemRecipesStore();
    }
    return {
      version: 1,
      categories: parsed.categories,
      recipes: parsed.recipes,
      autoConsumption: Boolean(parsed.autoConsumption),
    };
  } catch {
    return emptyItemRecipesStore();
  }
}

export function saveItemRecipesStore(outletId: string, store: ItemRecipesStore): void {
  localStorage.setItem(`${STORAGE_PREFIX}${outletId}`, JSON.stringify(store));
}

export function newRecipeId(): string {
  return crypto.randomUUID();
}

export function newLineId(): string {
  return crypto.randomUUID();
}

export function categoryNameById(categories: RecipeCategory[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "Uncategorized";
}

export function recipeHasIngredients(recipe: ItemRecipe): boolean {
  return recipe.ingredients.some((i) => i.name.trim().length > 0);
}
