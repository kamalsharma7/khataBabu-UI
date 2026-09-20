import type { FoodType } from "../../../types/owner";

export function money(n: string | number) {
  return parseFloat(String(n)) || 0;
}

export function fmt(n: string | number) {
  return `₹${money(n).toFixed(2)}`;
}

export function dietStripeClass(foodType: FoodType | string, isVeg?: boolean): string {
  if (foodType === "egg") return "pp-diet--egg";
  if (foodType === "non_veg") return "pp-diet--nonveg";
  if (foodType === "veg") return "pp-diet--veg";
  return isVeg ? "pp-diet--veg" : "pp-diet--nonveg";
}
