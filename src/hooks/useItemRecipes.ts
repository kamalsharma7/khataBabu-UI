import { useCallback, useEffect, useState } from "react";
import type { ItemRecipe, ItemRecipesStore, RecipeCategory } from "../types/itemRecipes";
import {
  emptyItemRecipesStore,
  loadItemRecipesStore,
  newLineId,
  newRecipeId,
  saveItemRecipesStore,
} from "../utils/itemRecipesStorage";

export type RecipeDraft = Omit<ItemRecipe, "id" | "createdAt" | "updatedAt">;

function nowIso(): string {
  return new Date().toISOString();
}

export function useItemRecipes(outletId: string | undefined) {
  const [store, setStore] = useState<ItemRecipesStore>(emptyItemRecipesStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!outletId) {
      setStore(emptyItemRecipesStore());
      setHydrated(false);
      return;
    }
    setStore(loadItemRecipesStore(outletId));
    setHydrated(true);
  }, [outletId]);

  const persist = useCallback(
    (updater: (prev: ItemRecipesStore) => ItemRecipesStore) => {
      setStore((prev) => {
        const next = updater(prev);
        if (outletId) saveItemRecipesStore(outletId, next);
        return next;
      });
    },
    [outletId],
  );

  const setAutoConsumption = useCallback(
    (value: boolean) => {
      persist((prev) => ({ ...prev, autoConsumption: value }));
    },
    [persist],
  );

  const addCategory = useCallback(
    (name: string): RecipeCategory | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      let created: RecipeCategory | null = null;
      persist((prev) => {
        const exists = prev.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) return prev;
        const cat: RecipeCategory = { id: newRecipeId(), name: trimmed };
        created = cat;
        return { ...prev, categories: [...prev.categories, cat] };
      });
      return created;
    },
    [persist],
  );

  const renameCategory = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
      }));
    },
    [persist],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      persist((prev) => {
        const remaining = prev.categories.filter((c) => c.id !== id);
        const fallbackId = remaining[0]?.id ?? "";
        return {
          ...prev,
          categories: remaining,
          recipes: prev.recipes.map((r) =>
            r.categoryId === id ? { ...r, categoryId: fallbackId, updatedAt: nowIso() } : r,
          ),
        };
      });
    },
    [persist],
  );

  const upsertRecipe = useCallback(
    (draft: RecipeDraft, existingId?: string): ItemRecipe => {
      const ts = nowIso();
      let result: ItemRecipe | null = null;
      persist((prev) => {
        if (existingId) {
          const updated: ItemRecipe = {
            ...draft,
            id: existingId,
            createdAt: prev.recipes.find((r) => r.id === existingId)?.createdAt ?? ts,
            updatedAt: ts,
          };
          result = updated;
          return {
            ...prev,
            recipes: prev.recipes.map((r) => (r.id === existingId ? updated : r)),
          };
        }
        const created: ItemRecipe = {
          ...draft,
          id: newRecipeId(),
          createdAt: ts,
          updatedAt: ts,
        };
        result = created;
        return { ...prev, recipes: [...prev.recipes, created] };
      });
      return result!;
    },
    [persist],
  );

  const deleteRecipe = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, recipes: prev.recipes.filter((r) => r.id !== id) }));
    },
    [persist],
  );

  const duplicateRecipe = useCallback(
    (id: string): ItemRecipe | null => {
      let copy: ItemRecipe | null = null;
      persist((prev) => {
        const source = prev.recipes.find((r) => r.id === id);
        if (!source) return prev;
        const ts = nowIso();
        copy = {
          ...source,
          id: newRecipeId(),
          name: `${source.name} (copy)`,
          options: source.options.map((o) => ({ ...o, id: newLineId() })),
          ingredients: source.ingredients.map((i) => ({ ...i, id: newLineId() })),
          createdAt: ts,
          updatedAt: ts,
        };
        return { ...prev, recipes: [...prev.recipes, copy] };
      });
      return copy;
    },
    [persist],
  );

  return {
    store,
    hydrated,
    setAutoConsumption,
    addCategory,
    renameCategory,
    deleteCategory,
    upsertRecipe,
    deleteRecipe,
    duplicateRecipe,
  };
}
