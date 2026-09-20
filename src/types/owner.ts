export interface OutletSummary {
  id: string;
  name: string;
  ref_code: string;
  status: string;
}

export type ResourceKind = "dine_table" | "time_based";

export interface VenueArea {
  id: string;
  outlet_id: string;
  name: string;
  sort_order: number;
}

export interface VenueTable {
  id: string;
  outlet_id: string;
  area_id: string;
  label: string;
  capacity: number | null;
  resource_kind: ResourceKind;
  hourly_rate: string | null;
  sort_order: number;
}

export interface MenuCategory {
  id: string;
  outlet_id: string;
  name: string;
  sort_order: number;
}

export interface MenuVariation {
  id: string;
  name: string;
  price: string;
  sort_order: number;
  is_default: boolean;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: string;
  sort_order: number;
  is_available: boolean;
}

export type FoodType = "veg" | "non_veg" | "egg";

export type TableVisualState = "blank" | "running" | "running_kot" | "printed";

export interface MenuItem {
  id: string;
  outlet_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  short_code: string | null;
  is_veg: boolean;
  food_type?: FoodType;
  is_available: boolean;
  sort_order: number;
  variations: MenuVariation[];
  addons: MenuAddon[];
}

export interface MenuVariationInput {
  name: string;
  price: number;
  sort_order?: number;
  is_default?: boolean;
}

export interface MenuAddonInput {
  name: string;
  price: number;
  sort_order?: number;
  is_available?: boolean;
}

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type OrderStatus = "open" | "settled" | "cancelled";
export type OrderLineStatus = "pending_kot" | "in_kot" | "served" | "cancelled";
export type PaymentMethod =
  | "cash"
  | "upi"
  | "card"
  | "wallet"
  | "bank"
  | "due"
  | "complimentary"
  | "other";

export interface PosOrderLineAddon {
  id: string;
  name: string;
  price: string;
}

export interface PosOrderLine {
  id: string;
  menu_item_id: string;
  menu_item_variation_id: string | null;
  item_name: string;
  variation_name: string | null;
  quantity: number;
  unit_price: string;
  addons_total: string;
  line_total: string;
  notes: string | null;
  food_type: FoodType;
  status: OrderLineStatus;
  addons: PosOrderLineAddon[];
}

export interface PosOrder {
  id: string;
  outlet_id: string;
  order_type: OrderType;
  order_number: number;
  venue_table_id: string | null;
  status: OrderStatus;
  guest_count: number | null;
  customer_name: string | null;
  customer_mobile: string | null;
  pay_later: boolean;
  notes: string | null;
  created_at: string;
  settled_at: string | null;
  lines: PosOrderLine[];
  running_subtotal: string;
}

export interface PosBillPayment {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string | null;
}

export interface PosBillListEntry extends PosBill {
  order_number: number;
  settled_at: string | null;
  created_at: string;
  table_label: string | null;
  customer_name: string | null;
}

export interface PosBill {
  id: string;
  outlet_id: string;
  order_id: string;
  bill_number: number;
  subtotal: string;
  discount_amount: string;
  discount_percent: string;
  tax_percent: string;
  tax_amount: string;
  round_off: string;
  grand_total: string;
  amount_paid?: string;
  balance_due?: string;
  status: "open" | "settled" | "void";
  payments: PosBillPayment[];
}

export interface SplitBillPreview {
  parts: number;
  grand_total: string;
  amount_per_part: string;
}

export interface FloorTableStatus {
  table_id: string;
  area_id: string;
  label: string;
  resource_kind: string;
  is_occupied: boolean;
  visual_state: TableVisualState;
  current_order_id: string | null;
  minutes_elapsed: number | null;
  order_number: number | null;
  running_total: string | null;
  last_kot_at: string | null;
  kot_count: number;
}

export interface FloorAreaStatus {
  area_id: string;
  name: string;
  tables: FloorTableStatus[];
}

export interface FloorStatusResponse {
  areas: FloorAreaStatus[];
}

export interface PosKotLine {
  id: string;
  item_name: string;
  variation_name: string | null;
  quantity: number;
}

export interface PosKot {
  id: string;
  kot_number: number;
  status: string;
  notes: string | null;
  created_at: string;
  lines?: PosKotLine[];
}
