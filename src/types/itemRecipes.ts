export type RecipeOptionLine = {
  id: string;
  label: string;
};

export type RecipeIngredientLine = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  rawMaterialId?: string | null;
};

export type RecipeCategory = {
  id: string;
  name: string;
};

export type ItemRecipe = {
  id: string;
  name: string;
  categoryId: string;
  /** Optional link to a menu item for filtering */
  menuItemId: string | null;
  options: RecipeOptionLine[];
  ingredients: RecipeIngredientLine[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemRecipesStore = {
  version: 1;
  categories: RecipeCategory[];
  recipes: ItemRecipe[];
  autoConsumption: boolean;
};
