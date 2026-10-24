export interface OutletSummary {
  id: string;
  name: string;
  ref_code: string;
  status: string;
}

export type ResourceKind = "dine_table" | "time_based";
export type AreaBillingMode = "dine_in" | "time_based";

export interface VenueArea {
  id: string;
  outlet_id: string;
  name: string;
  sort_order: number;
  billing_mode: AreaBillingMode;
  operating_start: string | null;
  operating_end: string | null;
  hourly_rate: string | null;
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
  is_available?: boolean;
  weight_grams?: number | null;
  food_type?: FoodType | null;
  parent_id?: string | null;
  children?: MenuVariation[];
}

export interface MenuAddon {
  id: string;
  name: string;
  price: string;
  sort_order: number;
  is_available?: boolean;
  weight_grams?: number | null;
  food_type?: FoodType | null;
  group_id?: string | null;
}

export interface MenuAddonGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number | null;
  sort_order: number;
  addons: MenuAddon[];
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
  gst_applicable?: boolean;
  cgst_percent?: string;
  sgst_percent?: string;
  variations: MenuVariation[];
  addons: MenuAddon[];
  addon_groups?: MenuAddonGroup[];
}

export interface MenuVariationInput {
  name: string;
  price: number;
  sort_order?: number;
  is_default?: boolean;
  is_available?: boolean;
  weight_grams?: number | null;
  food_type?: FoodType | null;
  children?: MenuVariationInput[];
}

export interface MenuAddonInput {
  name: string;
  price: number;
  sort_order?: number;
  is_available?: boolean;
  weight_grams?: number | null;
  food_type?: FoodType | null;
}

export interface MenuAddonGroupInput {
  name: string;
  min_select?: number;
  max_select?: number | null;
  sort_order?: number;
  addons: MenuAddonInput[];
}

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type CustomerRelation = "customer" | "friend" | "worker" | "family" | "other";
export type OwnerRole = "owner" | "admin" | "worker";
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
  menu_item_id: string | null;
  is_open_item?: boolean;
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
  customer_locality: string | null;
  customer_relation: CustomerRelation | null;
  customer_id?: string | null;
  bill_saved_at: string | null;
  pay_later: boolean;
  notes: string | null;
  created_at: string;
  settled_at: string | null;
  time_session_start: string | null;
  time_session_end: string | null;
  time_billed_minutes: number | null;
  hourly_rate_snapshot: string | null;
  time_charge: string | null;
  time_billing_excluded?: boolean;
  lines: PosOrderLine[];
  running_subtotal: string;
  warnings?: string[];
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

export interface PosBillDetail {
  bill: PosBill;
  order_id: string;
  order_number: number;
  order_type: OrderType;
  order_created_at: string;
  settled_at: string | null;
  table_label: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  guest_count: number | null;
  pay_later: boolean;
  order_notes: string | null;
  lines: PosOrderLine[];
  kots: PosKot[];
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
  cgst_amount?: string;
  sgst_amount?: string;
  igst_amount?: string;
  tax_method?: string | null;
  tax_label?: string | null;
  tip_amount?: string;
  round_off: string;
  grand_total: string;
  amount_paid?: string;
  balance_due?: string;
  status: "open" | "settled" | "void";
  payments: PosBillPayment[];
  invoice_number?: number | null;
  invoice_code?: string | null;
  refunded_total?: string;
}

export interface BusinessSettings {
  legal_name: string;
  trading_name: string | null;
  primary_phone: string;
  primary_email: string;
  city: string;
  state: string;
  gst_registered: boolean;
  gstin: string | null;
  fssai: string | null;
  pan: string | null;
  registered_address: string | null;
  invoice_prefix: string;
  worker_max_discount_percent: string;
  max_discount_percent: string;
  manager_pin_configured: boolean;
}

export interface DiscountPolicy {
  worker_max_discount_percent: string;
  max_discount_percent: string;
  manager_pin_configured: boolean;
}

export interface AuditLogEntry {
  id: string;
  outlet_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  reason: string | null;
  created_at: string;
}

export interface BusinessDayState {
  id: string;
  business_date: string;
  status: string;
  opening_cash: string;
  expected_cash: string | null;
  projected_expected_cash?: string;
  actual_closing_cash: string | null;
  cash_variance: string | null;
  cash_sales_total: string;
  notes: string | null;
  movements: {
    id: string;
    kind: string;
    amount: string;
    reason: string;
    created_at: string;
  }[];
}

export interface SplitBillPreview {
  parts: number;
  grand_total: string;
  amount_per_part: string;
}

export interface AnalyticsStatus {
  pin_configured: boolean;
}

export interface AnalyticsUnlockResult {
  analytics_token: string;
  expires_in_minutes: number;
  pin_configured: boolean;
}

export interface AnalyticsPaymentBreakdown {
  method: PaymentMethod;
  amount: string;
  count: number;
}

export interface AnalyticsSummary {
  from_datetime: string;
  to_datetime: string;
  gross_sales: string;
  total_collected: string;
  discount_total: string;
  tax_total: string;
  orders_settled: number;
  orders_cancelled: number;
  average_bill: string;
  pay_later_settled: number;
  open_orders_now: number;
  payment_breakdown: AnalyticsPaymentBreakdown[];
}

export interface AnalyticsOrderRow {
  order_id: string;
  order_number: number;
  bill_number: number;
  settled_at: string;
  table_label: string | null;
  customer_name: string | null;
  guest_count: number | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  grand_total: string;
  pay_later: boolean;
  payments_summary: string;
}

export interface AnalyticsOrdersPage {
  total: number;
  items: AnalyticsOrderRow[];
}

export interface FloorTableStatus {
  table_id: string;
  area_id: string;
  label: string;
  resource_kind: string;
  hourly_rate: string | null;
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
  billing_mode: AreaBillingMode;
  operating_start: string | null;
  operating_end: string | null;
  hourly_rate: string | null;
  tables: FloorTableStatus[];
}

export interface FloorStatusResponse {
  areas: FloorAreaStatus[];
}

export interface PosKotLine {
  id: string;
  item_name: string;
  variation_name: string | null;
  addon_names?: string[];
  quantity: number;
}

export interface LinkedMenuItem {
  menu_item_id: string;
  menu_item_name: string;
  qty_per_serve: string;
}

export interface InventoryItem {
  id: string;
  outlet_id: string;
  name: string;
  unit: string;
  category: string;
  tracks_daily: boolean;
  daily_par: string | null;
  stock_date: string | null;
  today_opening: string | null;
  remaining_today: string;
  sold_today: string;
  current_stock: string;
  low_stock_threshold: string | null;
  cost_per_unit: string | null;
  notes: string | null;
  linked_menu_items: LinkedMenuItem[];
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  delta: string;
  reason: string;
  notes: string | null;
  created_at: string;
}

export type InventoryKind = "all" | "raw" | "daily";

// ---- CRM / customers ----

export type CustomerSegment =
  | "new"
  | "occasional"
  | "regular"
  | "vip"
  | "at_risk"
  | "lost"
  | "prospect";

export interface CustomerSummary {
  id: string;
  outlet_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  locality: string | null;
  relation: CustomerRelation | null;
  tags: string[];
  birthday: string | null;
  anniversary: string | null;
  marketing_opt_in: boolean;
  source: string;
  visit_count: number;
  total_spend_inr: string;
  avg_ticket_inr: string;
  first_visit_at: string | null;
  last_visit_at: string | null;
  days_since_last_visit: number | null;
  segment: CustomerSegment;
  khata_due_inr: string;
  created_at: string;
}

export interface CustomerFavouriteItem {
  item_name: string;
  times_ordered: number;
  total_qty: number;
  menu_item_id: string | null;
}

export interface CustomerVisit {
  order_id: string;
  order_number: number;
  bill_id: string | null;
  bill_number: number | null;
  invoice_code: string | null;
  order_type: OrderType;
  table_label: string | null;
  settled_at: string | null;
  grand_total: string;
  items_summary: string;
  payment_methods: PaymentMethod[];
  guest_count: number | null;
}

export interface WeekdayCount {
  weekday: number;
  label: string;
  visits: number;
}

export interface DaypartCount {
  key: string;
  label: string;
  visits: number;
}

export interface PaymentMixEntry {
  method: PaymentMethod;
  amount_inr: string;
  share_percent: string;
}

export interface CustomerDetail extends CustomerSummary {
  address: string | null;
  notes: string | null;
  preferred_order_type: OrderType | null;
  veg_share_percent: string | null;
  avg_guest_count: string | null;
  favourite_items: CustomerFavouriteItem[];
  visits_by_weekday: WeekdayCount[];
  visits_by_daypart: DaypartCount[];
  payment_mix: PaymentMixEntry[];
  recent_visits: CustomerVisit[];
  avg_days_between_visits: string | null;
}

export interface CustomerListResponse {
  total: number;
  customers: CustomerSummary[];
}

export interface CustomerLookupResponse {
  found: boolean;
  customer: CustomerSummary | null;
  favourite_items: string[];
  greeting: string | null;
}

export interface CustomerWrite {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  locality?: string | null;
  address?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  relation?: CustomerRelation | null;
  tags?: string[];
  notes?: string | null;
  marketing_opt_in?: boolean;
  clear_birthday?: boolean;
  clear_anniversary?: boolean;
}

export interface SegmentCount {
  segment: CustomerSegment;
  label: string;
  customers: number;
  spend_inr: string;
}

export interface LocalityInsight {
  locality: string;
  customers: number;
  visits: number;
  spend_inr: string;
}

export interface FrequencyBucket {
  bucket: string;
  customers: number;
}

export interface MonthlyNewCustomers {
  month: string;
  label: string;
  customers: number;
}

export interface TrendingItem {
  item_name: string;
  customers: number;
  total_qty: number;
}

export interface OccasionEntry {
  customer_id: string;
  name: string | null;
  phone: string | null;
  occasion: "birthday" | "anniversary";
  on_date: string;
  days_away: number;
}

export interface OrderTypeMix {
  order_type: OrderType;
  visits: number;
  share_percent: string;
}

export interface CrmInsights {
  total_customers: number;
  with_phone: number;
  new_this_month: number;
  new_last_month: number;
  repeat_customers: number;
  repeat_rate_percent: string;
  avg_visits_per_customer: string;
  avg_spend_per_customer_inr: string;
  identified_orders_30d: number;
  settled_orders_30d: number;
  capture_rate_30d_percent: string;
  khata_due_total_inr: string;
  segments: SegmentCount[];
  top_localities: LocalityInsight[];
  top_spenders: CustomerSummary[];
  most_frequent: CustomerSummary[];
  win_back: CustomerSummary[];
  frequency_buckets: FrequencyBucket[];
  monthly_new: MonthlyNewCustomers[];
  trending_items: TrendingItem[];
  upcoming_occasions: OccasionEntry[];
  order_type_mix: OrderTypeMix[];
  visits_by_weekday: WeekdayCount[];
  visits_by_daypart: DaypartCount[];
}

export interface CustomerBackfillResult {
  orders_scanned: number;
  orders_linked: number;
  customers_created: number;
  customers_refreshed: number;
}

export interface StaffPermissionItem {
  code: string;
  label: string;
  hint: string;
  staff_assignable: boolean;
  default_staff: boolean;
  dangerous: boolean;
}

export interface StaffPermissionGroup {
  id: string;
  label: string;
  staff_assignable: boolean;
  permissions: StaffPermissionItem[];
}

export interface StaffMemberSummary {
  id: string;
  full_name: string;
  username: string;
  role: string;
  is_active: boolean;
}

export interface StaffGrantRow extends StaffMemberSummary {
  configured: boolean;
  grants: Record<string, boolean>;
}

export interface StaffPermissionMatrix {
  outlet_id: string;
  outlet_name: string;
  catalog: StaffPermissionGroup[];
  managers: StaffMemberSummary[];
  staff: StaffGrantRow[];
}

export interface MyPermissions {
  outlet_id: string | null;
  role: string;
  can_manage_permissions: boolean;
  source: "role" | "defaults" | "custom";
  permissions: string[];
}

export type PurchasePaymentMode = "cash" | "upi" | "card" | "bank" | "credit" | "other";
export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export interface PurchaseLineInput {
  inventory_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price_inr: number;
  tax_percent: number;
}

export interface PurchaseInvoiceCreate {
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_gstin?: string | null;
  invoice_number?: string | null;
  invoice_date: string;
  po_reference?: string | null;
  discount_inr?: number;
  other_charges_inr?: number;
  paid_inr?: number;
  payment_mode?: PurchasePaymentMode | null;
  notes?: string | null;
  apply_stock?: boolean;
  lines: PurchaseLineInput[];
}

export interface PurchaseLine {
  id: string;
  inventory_item_id: string | null;
  item_name: string;
  quantity: string;
  unit: string;
  unit_price_inr: string;
  tax_percent: string;
  line_total_inr: string;
}

export interface PurchasePayment {
  id: string;
  amount_inr: string;
  payment_mode: string;
  paid_on: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseInvoiceSummary {
  id: string;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  po_reference: string | null;
  total_inr: string;
  paid_inr: string;
  balance_inr: string;
  tax_inr: string;
  payment_status: PurchasePaymentStatus;
  status: string;
  stock_applied: boolean;
  line_count: number;
  created_by_name: string | null;
  created_at: string;
}

export interface PurchaseInvoiceDetail extends PurchaseInvoiceSummary {
  outlet_id: string;
  vendor_phone: string | null;
  vendor_gstin: string | null;
  subtotal_inr: string;
  discount_inr: string;
  other_charges_inr: string;
  payment_mode: string | null;
  notes: string | null;
  lines: PurchaseLine[];
  payments: PurchasePayment[];
}

export interface PurchaseListTotals {
  invoice_count: number;
  total_inr: string;
  paid_inr: string;
  outstanding_inr: string;
  tax_inr: string;
}

export interface PurchaseListResponse {
  from_date: string | null;
  to_date: string | null;
  totals: PurchaseListTotals;
  vendors: string[];
  invoices: PurchaseInvoiceSummary[];
}

export type StockAdjustReason = "purchase" | "wastage" | "opening" | "adjustment";

export interface ItemQtyRow {
  menu_item_id: string | null;
  item_name: string;
  quantity: string;
}

export interface SalesByDateRow {
  date: string;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesByWeekdayRow {
  weekday: string;
  is_weekend: boolean;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesByMonthRow {
  month: string;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesByYearRow {
  year: string;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesByWeekRow {
  week: string;
  week_start: string;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesByQuarterRow {
  quarter: string;
  year: number;
  quarter_num: number;
  total_quantity: string;
  items: ItemQtyRow[];
}

export interface SalesWeekendSplit {
  weekday_total: string;
  weekend_total: string;
  weekday_items: ItemQtyRow[];
  weekend_items: ItemQtyRow[];
}

export interface SalesOverview {
  menu_items_in_catalog: number;
  open_item_names: number;
  order_lines_counted: number;
  active_sale_days: number;
  total_units_sold: string;
  weekday_units: string;
  weekend_units: string;
}

export interface ItemSalesSummaryRow {
  menu_item_id: string | null;
  item_name: string;
  total_quantity: string;
  by_weekday: ItemQtyRow[];
  weekend_quantity: string;
  weekday_quantity: string;
}

export interface InventorySalesAnalytics {
  from_date: string;
  to_date: string;
  overview: SalesOverview;
  by_day: SalesByDateRow[];
  by_weekday: SalesByWeekdayRow[];
  by_week: SalesByWeekRow[];
  by_month: SalesByMonthRow[];
  by_quarter: SalesByQuarterRow[];
  by_year: SalesByYearRow[];
  weekend_split: SalesWeekendSplit;
  by_item: ItemSalesSummaryRow[];
  top_items: ItemSalesSummaryRow[];
}

export interface PosKot {
  id: string;
  kot_number: number;
  status: string;
  notes: string | null;
  created_at: string;
  lines?: PosKotLine[];
}

export type TaxScheme = "gst" | "vat" | "other";
export type GstSlab = "gst_5" | "gst_18" | "gst_40" | "igst" | "custom";
export type TaxMethod = "forward" | "backward" | "tax_on_tax";

export interface TaxProfile {
  id: string;
  outlet_id: string;
  name: string;
  scheme: TaxScheme;
  gst_slab: GstSlab | null;
  rate_percent: string;
  cgst_percent: string;
  sgst_percent: string;
  igst_percent: string;
  title: string;
  cgst_title: string | null;
  sgst_title: string | null;
  igst_title: string | null;
  title_suffix: string | null;
  method: TaxMethod;
  applies_dine_in: boolean;
  applies_takeaway: boolean;
  applies_delivery: boolean;
  is_active: boolean;
  scope: "venue" | "items";
  menu_item_ids: string[];
  sort_order: number;
  notes: string | null;
}

export interface TaxProfileWrite {
  name: string;
  scheme: TaxScheme;
  gst_slab?: GstSlab | null;
  rate_percent: number;
  method: TaxMethod;
  title?: string;
  cgst_title?: string | null;
  sgst_title?: string | null;
  igst_title?: string | null;
  title_suffix?: string | null;
  applies_dine_in: boolean;
  applies_takeaway: boolean;
  applies_delivery: boolean;
  is_active: boolean;
  scope?: "venue" | "items";
  menu_item_ids?: string[];
  notes?: string | null;
}

export interface TaxPreview {
  amount_inr: string;
  method: string;
  tax_label: string | null;
  tax_percent: string;
  tax_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  guest_pays: string;
  lines: { title: string; amount_inr: string }[];
  applied: boolean;
  note: string;
}
