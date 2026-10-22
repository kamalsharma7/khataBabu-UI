import { normalizeFoodType } from "../menu/menuFoodType";
import type { FoodType } from "../../../types/owner";

export function money(n: string | number) {
  return parseFloat(String(n)) || 0;
}

export function fmt(n: string | number) {
  return `₹${money(n).toFixed(2)}`;
}

/** Green = veg, yellow = egg, red = non-veg (POS stripes). */
export function dietStripeClass(foodType?: FoodType | string | null, isVeg?: boolean): string {
  const ft = normalizeFoodType(foodType);
  if (ft === "egg") return "pp-diet--egg";
  if (ft === "non_veg") return "pp-diet--nonveg";
  if (ft === "veg") return "pp-diet--veg";
  return isVeg !== false ? "pp-diet--veg" : "pp-diet--nonveg";
}
