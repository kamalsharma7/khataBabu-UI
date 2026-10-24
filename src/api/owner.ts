import { getOwnerToken, ownerApiRequest } from "./ownerClient";
import type {
  FloorStatusResponse,
  MenuAddonGroupInput,
  MenuAddonInput,
  MenuCategory,
  MenuItem,
  MenuVariationInput,
  OutletSummary,
  PaymentMethod,
  PosBill,
  PosBillDetail,
  PosBillListEntry,
  PosKot,
  PosOrder,
  SplitBillPreview,
  TaxPreview,
  TaxProfile,
  TaxProfileWrite,
  VenueArea,
  VenueTable,
} from "../types/owner";

export interface OwnerTokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  must_change_password: boolean;
}

export interface OwnerProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  mobile: string;
  business_id: string;
  business_name: string;
  business_status: string;
  must_change_password: boolean;
  role?: string;
  permissions?: string[];
  can_manage_permissions?: boolean;
  support_contact_name?: string | null;
  support_contact_mobile?: string | null;
}

export function ownerLogin(username: string, password: string) {
  return ownerApiRequest<OwnerTokenResponse>("/owner/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    auth: false,
  });
}

export function ownerMe() {
  return ownerApiRequest<OwnerProfile>("/owner/auth/me");
}

export function ownerChangePassword(current: string, newPassword: string) {
  return ownerApiRequest<void>("/owner/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: current, new_password: newPassword }),
  });
}

export function ownerForgotPassword(username: string) {
  return ownerApiRequest<void>("/owner/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ username }),
    auth: false,
  });
}

export function ownerResetPassword(token: string, newPassword: string) {
  return ownerApiRequest<void>("/owner/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
    auth: false,
  });
}

export function listOutlets() {
  return ownerApiRequest<OutletSummary[]>("/owner/outlets");
}

export function listAreas(outletId: string) {
  return ownerApiRequest<VenueArea[]>(`/owner/outlets/${outletId}/areas`);
}

export function createArea(
  outletId: string,
  body: {
    name: string;
    sort_order?: number;
    billing_mode?: "dine_in" | "time_based";
    operating_start?: string | null;
    operating_end?: string | null;
    hourly_rate?: number | null;
    initial_table_count?: number;
    table_label_prefix?: string;
  },
) {
  return ownerApiRequest<VenueArea>(`/owner/outlets/${outletId}/areas`, {
    method: "POST",
    body: JSON.stringify({
      sort_order: 0,
      table_label_prefix: "Table",
      ...body,
    }),
  });
}

export function bulkCreateTables(
  outletId: string,
  areaId: string,
  body: { count: number; table_label_prefix?: string; start_number?: number },
) {
  return ownerApiRequest<VenueTable[]>(
    `/owner/outlets/${outletId}/areas/${areaId}/tables/bulk`,
    {
      method: "POST",
      body: JSON.stringify({ table_label_prefix: "Table", ...body }),
    },
  );
}

export function updateArea(
  outletId: string,
  areaId: string,
  data: {
    name?: string;
    sort_order?: number;
    billing_mode?: "dine_in" | "time_based";
    operating_start?: string | null;
    operating_end?: string | null;
    hourly_rate?: number | null;
  },
) {
  return ownerApiRequest<VenueArea>(`/owner/outlets/${outletId}/areas/${areaId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteArea(outletId: string, areaId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/areas/${areaId}`, { method: "DELETE" });
}

export function listTables(outletId: string, areaId: string) {
  return ownerApiRequest<VenueTable[]>(`/owner/outlets/${outletId}/areas/${areaId}/tables`);
}

export function createTable(
  outletId: string,
  areaId: string,
  body: {
    label: string;
    capacity?: number | null;
    resource_kind: string;
    hourly_rate?: number | null;
    sort_order?: number;
  },
) {
  return ownerApiRequest<VenueTable>(`/owner/outlets/${outletId}/areas/${areaId}/tables`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTable(
  outletId: string,
  tableId: string,
  body: Record<string, unknown>,
) {
  return ownerApiRequest<VenueTable>(`/owner/outlets/${outletId}/tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTable(outletId: string, tableId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/tables/${tableId}`, { method: "DELETE" });
}

export function listMenuCategories(outletId: string) {
  return ownerApiRequest<MenuCategory[]>(`/owner/outlets/${outletId}/menu/categories`);
}

export function createMenuCategory(outletId: string, name: string, sortOrder = 0) {
  return ownerApiRequest<MenuCategory>(`/owner/outlets/${outletId}/menu/categories`, {
    method: "POST",
    body: JSON.stringify({ name, sort_order: sortOrder }),
  });
}

export function deleteMenuCategory(outletId: string, categoryId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/menu/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export function listMenuItems(outletId: string) {
  return ownerApiRequest<MenuItem[]>(`/owner/outlets/${outletId}/menu/items`);
}

export function createMenuItem(
  outletId: string,
  body: {
    category_id: string;
    name: string;
    description?: string | null;
    price: number;
    short_code?: string | null;
    is_veg?: boolean;
    food_type?: "veg" | "non_veg" | "egg";
    is_available?: boolean;
    sort_order?: number;
    gst_applicable?: boolean;
    cgst_percent?: number;
    sgst_percent?: number;
    variations?: MenuVariationInput[];
    addons?: MenuAddonInput[];
    addon_groups?: MenuAddonGroupInput[];
  },
) {
  return ownerApiRequest<MenuItem>(`/owner/outlets/${outletId}/menu/items`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function replaceMenuItemModifiers(
  outletId: string,
  itemId: string,
  body: {
    variations: MenuVariationInput[];
    addons: MenuAddonInput[];
    addon_groups?: MenuAddonGroupInput[];
  },
) {
  return ownerApiRequest<MenuItem>(`/owner/outlets/${outletId}/menu/items/${itemId}/modifiers`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function updateMenuItem(outletId: string, itemId: string, body: Record<string, unknown>) {
  return ownerApiRequest<MenuItem>(`/owner/outlets/${outletId}/menu/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteMenuItem(outletId: string, itemId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/menu/items/${itemId}`, { method: "DELETE" });
}

export function posFloor(outletId: string) {
  return ownerApiRequest<FloorStatusResponse>(`/owner/outlets/${outletId}/pos/floor`);
}

export interface PosBillingSettings {
  gst_registered: boolean;
  gstin: string | null;
  default_tax_percent: string;
  tax_enabled?: boolean;
  default_method?: string;
  tax_label?: string | null;
  apply_tax?: boolean;
}

export function posBillingSettings(outletId: string) {
  return ownerApiRequest<PosBillingSettings>(`/owner/outlets/${outletId}/pos/billing-settings`);
}

export function posListBills(outletId: string, billStatus: "settled" | "open" | "void" = "settled") {
  const q = billStatus ? `?bill_status=${billStatus}` : "";
  return ownerApiRequest<PosBillListEntry[]>(`/owner/outlets/${outletId}/pos/bills${q}`);
}

export function posGetBillDetail(outletId: string, billId: string) {
  return ownerApiRequest<PosBillDetail>(`/owner/outlets/${outletId}/pos/bills/${billId}/detail`);
}

export function posGetBill(outletId: string, orderId: string) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/orders/${orderId}/bill`);
}

export function posCreateOrder(
  outletId: string,
  body: {
    order_type?: "dine_in" | "takeaway" | "delivery";
    venue_table_id?: string | null;
    guest_count?: number;
    notes?: string | null;
  },
) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders`, {
    method: "POST",
    body: JSON.stringify({ order_type: "dine_in", ...body }),
  });
}

export function posListOrders(outletId: string, orderStatus: "open" | "settled" | "cancelled" = "open") {
  return ownerApiRequest<PosOrder[]>(
    `/owner/outlets/${outletId}/pos/orders?order_status=${orderStatus}`,
  );
}

export function posGetOrder(outletId: string, orderId: string) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}`);
}

export function posUpdateOrder(
  outletId: string,
  orderId: string,
  body: {
    guest_count?: number;
    order_type?: string;
    customer_name?: string | null;
    customer_mobile?: string | null;
    customer_locality?: string | null;
    customer_relation?: string | null;
    pay_later?: boolean;
    notes?: string | null;
    time_duration_minutes?: number;
    time_start_now?: boolean;
    time_end_now?: boolean;
    time_session_start?: string;
    time_session_end?: string;
    clear_time_session?: boolean;
    time_billing_excluded?: boolean;
  },
) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function posAddLine(
  outletId: string,
  orderId: string,
  body: {
    menu_item_id: string;
    variation_id?: string | null;
    quantity: number;
    addon_ids?: string[];
    notes?: string | null;
  },
) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}/lines`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function posAddOpenLine(
  outletId: string,
  orderId: string,
  body: {
    description: string;
    unit_price: number;
    quantity?: number;
    notes?: string | null;
    menu_item_id?: string | null;
  },
) {
  return ownerApiRequest<PosOrder>(
    `/owner/outlets/${outletId}/pos/orders/${orderId}/open-lines`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function posUpdateLine(
  outletId: string,
  orderId: string,
  lineId: string,
  body: { quantity?: number; notes?: string | null; unit_price?: number },
) {
  return ownerApiRequest<PosOrder>(
    `/owner/outlets/${outletId}/pos/orders/${orderId}/lines/${lineId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function posRemoveLine(outletId: string, orderId: string, lineId: string) {
  return ownerApiRequest<PosOrder>(
    `/owner/outlets/${outletId}/pos/orders/${orderId}/lines/${lineId}`,
    { method: "DELETE" },
  );
}

export function posCancelLine(outletId: string, orderId: string, lineId: string) {
  return ownerApiRequest<PosOrder>(
    `/owner/outlets/${outletId}/pos/orders/${orderId}/lines/${lineId}/cancel`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function posSendKot(outletId: string, orderId: string, notes?: string) {
  return ownerApiRequest<PosKot>(`/owner/outlets/${outletId}/pos/orders/${orderId}/kot`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}

export function posListKots(outletId: string, orderId: string) {
  return ownerApiRequest<PosKot[]>(`/owner/outlets/${outletId}/pos/orders/${orderId}/kots`);
}

export function posAddBillPayment(
  outletId: string,
  billId: string,
  body: { method: PaymentMethod; amount: number; reference?: string | null },
) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function posSplitBillPreview(
  outletId: string,
  orderId: string,
  body: {
    parts: number;
    discount_amount?: number;
    discount_percent?: number;
    tax_percent?: number;
    apply_tax?: boolean;
    round_to_rupee?: boolean;
  },
) {
  return ownerApiRequest<SplitBillPreview>(
    `/owner/outlets/${outletId}/pos/orders/${orderId}/bill/split-preview`,
    {
      method: "POST",
      body: JSON.stringify({
        discount_amount: 0,
        discount_percent: 0,
        tax_percent: 0,
        round_to_rupee: true,
        ...body,
      }),
    },
  );
}

export function posSaveBill(
  outletId: string,
  orderId: string,
  body: {
    discount_amount?: number;
    discount_percent?: number;
    tax_percent?: number;
    apply_tax?: boolean;
    tip_amount?: number;
    round_to_rupee?: boolean;
    print_after_save?: boolean;
  },
) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/orders/${orderId}/save-bill`, {
    method: "POST",
    body: JSON.stringify({
      discount_amount: 0,
      discount_percent: 0,
      tax_percent: 0,
      tip_amount: 0,
      round_to_rupee: true,
      print_after_save: false,
      ...body,
    }),
  });
}

export function posCreateBill(
  outletId: string,
  orderId: string,
  body: {
    discount_amount?: number;
    discount_percent?: number;
    tax_percent?: number;
    apply_tax?: boolean;
    tip_amount?: number;
    round_to_rupee?: boolean;
  },
) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/orders/${orderId}/bill`, {
    method: "POST",
    body: JSON.stringify({
      discount_amount: 0,
      discount_percent: 0,
      tax_percent: 0,
      round_to_rupee: true,
      ...body,
    }),
  });
}

export function posSettleBill(
  outletId: string,
  billId: string,
  body: {
    discount_amount?: number;
    discount_percent?: number;
    tax_percent?: number;
    apply_tax?: boolean;
    tip_amount?: number;
    round_to_rupee?: boolean;
    manager_approval_pin?: string;
    payments: { method: PaymentMethod; amount: number; reference?: string | null }[];
  },
) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/bills/${billId}/settle`, {
    method: "POST",
    body: JSON.stringify({
      discount_amount: 0,
      discount_percent: 0,
      tax_percent: 0,
      tip_amount: 0,
      round_to_rupee: true,
      ...body,
    }),
  });
}

export function posCancelOrder(outletId: string, orderId: string, reason?: string) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

export function analyticsStatus(outletId: string) {
  return ownerApiRequest<import("../types/owner").AnalyticsStatus>(
    `/owner/outlets/${outletId}/analytics/status`,
  );
}

export function analyticsUnlock(
  outletId: string,
  body: { pin?: string; login_password?: string; new_pin?: string },
) {
  return ownerApiRequest<import("../types/owner").AnalyticsUnlockResult>(
    `/owner/outlets/${outletId}/analytics/unlock`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

function analyticsQuery(from: string, to: string): string {
  return `from_datetime=${encodeURIComponent(from)}&to_datetime=${encodeURIComponent(to)}`;
}

export function analyticsSummary(
  outletId: string,
  fromIso: string,
  toIso: string,
  analyticsToken: string,
) {
  return ownerApiRequest<import("../types/owner").AnalyticsSummary>(
    `/owner/outlets/${outletId}/analytics/summary?${analyticsQuery(fromIso, toIso)}`,
    { analyticsToken },
  );
}

export function listInventoryItems(
  outletId: string,
  kind: import("../types/owner").InventoryKind = "all",
) {
  const q = kind === "all" ? "" : `?kind=${kind}`;
  return ownerApiRequest<import("../types/owner").InventoryItem[]>(
    `/owner/outlets/${outletId}/inventory${q}`,
  );
}

export function createInventoryItem(
  outletId: string,
  body: {
    name: string;
    unit?: string;
    daily_par?: number;
    tracks_daily?: boolean;
    category?: string;
    cost_per_unit?: number | null;
    notes?: string | null;
    low_stock_threshold?: number | null;
    opening_stock?: number;
  },
) {
  return ownerApiRequest<import("../types/owner").InventoryItem>(
    `/owner/outlets/${outletId}/inventory`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function updateInventoryItem(
  outletId: string,
  itemId: string,
  body: {
    name?: string;
    unit?: string;
    category?: string;
    cost_per_unit?: number | null;
    notes?: string | null;
    low_stock_threshold?: number | null;
  },
) {
  return ownerApiRequest<import("../types/owner").InventoryItem>(
    `/owner/outlets/${outletId}/inventory/${itemId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function adjustInventoryStock(
  outletId: string,
  itemId: string,
  body: {
    reason: import("../types/owner").StockAdjustReason;
    quantity: number;
    notes?: string | null;
  },
) {
  return ownerApiRequest<import("../types/owner").InventoryItem>(
    `/owner/outlets/${outletId}/inventory/${itemId}/adjust`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function listInventoryTransactions(outletId: string, itemId: string) {
  return ownerApiRequest<import("../types/owner").InventoryTransaction[]>(
    `/owner/outlets/${outletId}/inventory/${itemId}/transactions`,
  );
}

export function listPurchases(
  outletId: string,
  filters: {
    fromDate?: string;
    toDate?: string;
    vendor?: string;
    invoiceNumber?: string;
    paymentStatus?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("from_date", filters.fromDate);
  if (filters.toDate) params.set("to_date", filters.toDate);
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.invoiceNumber) params.set("invoice_number", filters.invoiceNumber);
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    params.set("payment_status", filters.paymentStatus);
  }
  const q = params.toString();
  return ownerApiRequest<import("../types/owner").PurchaseListResponse>(
    `/owner/outlets/${outletId}/purchases${q ? `?${q}` : ""}`,
  );
}

export function getPurchase(outletId: string, invoiceId: string) {
  return ownerApiRequest<import("../types/owner").PurchaseInvoiceDetail>(
    `/owner/outlets/${outletId}/purchases/${invoiceId}`,
  );
}

export function createPurchase(
  outletId: string,
  body: import("../types/owner").PurchaseInvoiceCreate,
) {
  return ownerApiRequest<import("../types/owner").PurchaseInvoiceDetail>(
    `/owner/outlets/${outletId}/purchases`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function updatePurchase(
  outletId: string,
  invoiceId: string,
  body: {
    vendor_name?: string;
    vendor_phone?: string | null;
    vendor_gstin?: string | null;
    invoice_number?: string | null;
    invoice_date?: string;
    po_reference?: string | null;
    notes?: string | null;
  },
) {
  return ownerApiRequest<import("../types/owner").PurchaseInvoiceDetail>(
    `/owner/outlets/${outletId}/purchases/${invoiceId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function deletePurchase(outletId: string, invoiceId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/purchases/${invoiceId}`, {
    method: "DELETE",
  });
}

export function addPurchasePayment(
  outletId: string,
  invoiceId: string,
  body: {
    amount_inr: number;
    payment_mode: import("../types/owner").PurchasePaymentMode;
    paid_on?: string;
    reference?: string | null;
    notes?: string | null;
  },
) {
  return ownerApiRequest<import("../types/owner").PurchaseInvoiceDetail>(
    `/owner/outlets/${outletId}/purchases/${invoiceId}/payments`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function applyPurchaseStock(outletId: string, invoiceId: string) {
  return ownerApiRequest<import("../types/owner").PurchaseInvoiceDetail>(
    `/owner/outlets/${outletId}/purchases/${invoiceId}/apply-stock`,
    { method: "POST" },
  );
}

// ---- CRM / customers ----

export function lookupCustomer(outletId: string, phone: string) {
  return ownerApiRequest<import("../types/owner").CustomerLookupResponse>(
    `/owner/outlets/${outletId}/customers/lookup?phone=${encodeURIComponent(phone)}`,
  );
}

export function searchCustomers(outletId: string, q: string) {
  return ownerApiRequest<import("../types/owner").CustomerSummary[]>(
    `/owner/outlets/${outletId}/customers/search?q=${encodeURIComponent(q)}`,
  );
}

export function listCustomers(
  outletId: string,
  filters: { q?: string; segment?: string; sort?: string; tag?: string; limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.segment && filters.segment !== "all") params.set("segment", filters.segment);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  const q = params.toString();
  return ownerApiRequest<import("../types/owner").CustomerListResponse>(
    `/owner/outlets/${outletId}/customers${q ? `?${q}` : ""}`,
  );
}

export function getCustomer(outletId: string, customerId: string) {
  return ownerApiRequest<import("../types/owner").CustomerDetail>(
    `/owner/outlets/${outletId}/customers/${customerId}`,
  );
}

export function createCustomer(outletId: string, body: import("../types/owner").CustomerWrite) {
  return ownerApiRequest<import("../types/owner").CustomerDetail>(
    `/owner/outlets/${outletId}/customers`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function updateCustomer(
  outletId: string,
  customerId: string,
  body: import("../types/owner").CustomerWrite,
) {
  return ownerApiRequest<import("../types/owner").CustomerDetail>(
    `/owner/outlets/${outletId}/customers/${customerId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function deleteCustomer(outletId: string, customerId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/customers/${customerId}`, {
    method: "DELETE",
  });
}

export function crmInsights(outletId: string) {
  return ownerApiRequest<import("../types/owner").CrmInsights>(
    `/owner/outlets/${outletId}/customers/insights`,
  );
}

export function backfillCustomers(outletId: string) {
  return ownerApiRequest<import("../types/owner").CustomerBackfillResult>(
    `/owner/outlets/${outletId}/customers/backfill`,
    { method: "POST" },
  );
}

export function myOutletPermissions(outletId: string) {
  return ownerApiRequest<import("../types/owner").MyPermissions>(
    `/owner/outlets/${outletId}/my-permissions`,
  );
}

export function staffPermissionMatrix(outletId: string) {
  return ownerApiRequest<import("../types/owner").StaffPermissionMatrix>(
    `/owner/outlets/${outletId}/staff-permissions`,
  );
}

export function saveStaffPermissions(
  outletId: string,
  staffId: string,
  body: { grants: Record<string, boolean>; apply_to_all_outlets?: boolean },
) {
  return ownerApiRequest<import("../types/owner").StaffPermissionMatrix>(
    `/owner/outlets/${outletId}/staff-permissions/${staffId}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function replaceRecipeBom(
  outletId: string,
  menuItemId: string,
  lines: { inventory_item_id: string; qty_per_serve: number }[],
) {
  return ownerApiRequest<void>(
    `/owner/outlets/${outletId}/inventory/menu-items/${menuItemId}/recipe-bom`,
    { method: "PUT", body: JSON.stringify({ lines }) },
  );
}

export function setInventoryDailyStock(
  outletId: string,
  itemId: string,
  quantity: number,
) {
  return ownerApiRequest<import("../types/owner").InventoryItem>(
    `/owner/outlets/${outletId}/inventory/${itemId}/daily-stock`,
    { method: "POST", body: JSON.stringify({ quantity }) },
  );
}

export function linkMenuInventory(
  outletId: string,
  menuItemId: string,
  body: { inventory_item_id: string; qty_per_serve?: number },
) {
  return ownerApiRequest<void>(
    `/owner/outlets/${outletId}/inventory/menu-items/${menuItemId}/link`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function trackMenuInventory(
  outletId: string,
  body: {
    menu_item_id: string;
    unit?: string;
    qty_per_kot?: number;
    today_quantity: number;
  },
) {
  return ownerApiRequest<import("../types/owner").InventoryItem>(
    `/owner/outlets/${outletId}/inventory/track-menu`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function deleteInventoryItem(outletId: string, itemId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/inventory/${itemId}`, {
    method: "DELETE",
  });
}

export function unlinkMenuInventory(
  outletId: string,
  menuItemId: string,
  inventoryItemId: string,
) {
  return ownerApiRequest<void>(
    `/owner/outlets/${outletId}/inventory/menu-items/${menuItemId}/link/${inventoryItemId}`,
    { method: "DELETE" },
  );
}

export function bulkSetInventoryDailyStock(
  outletId: string,
  items: { inventory_item_id: string; quantity: number }[],
) {
  return ownerApiRequest<import("../types/owner").InventoryItem[]>(
    `/owner/outlets/${outletId}/inventory/daily-stock/bulk`,
    { method: "POST", body: JSON.stringify({ items }) },
  );
}

export function fetchInventorySalesAnalytics(outletId: string, days = 30) {
  return ownerApiRequest<import("../types/owner").InventorySalesAnalytics>(
    `/owner/outlets/${outletId}/inventory/sales-analytics?days=${days}`,
  );
}

export function analyticsOrders(
  outletId: string,
  fromIso: string,
  toIso: string,
  analyticsToken: string,
  offset = 0,
  limit = 50,
) {
  return ownerApiRequest<import("../types/owner").AnalyticsOrdersPage>(
    `/owner/outlets/${outletId}/analytics/orders?${analyticsQuery(fromIso, toIso)}&offset=${offset}&limit=${limit}`,
    { analyticsToken },
  );
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "/api/v1" : "http://localhost:8000/api/v1");

export function fetchBusinessSettings() {
  return ownerApiRequest<import("../types/owner").BusinessSettings>("/owner/business/settings");
}

export function updateBusinessProfile(body: Partial<import("../types/owner").BusinessSettings>) {
  return ownerApiRequest<import("../types/owner").BusinessSettings>("/owner/business/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updatePosPolicy(body: {
  worker_max_discount_percent: number;
  max_discount_percent: number;
}) {
  return ownerApiRequest<import("../types/owner").BusinessSettings>("/owner/business/settings/policy", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function setManagerPin(pin: string) {
  return ownerApiRequest<import("../types/owner").BusinessSettings>("/owner/business/settings/manager-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export function fetchDiscountPolicy(outletId: string) {
  return ownerApiRequest<import("../types/owner").DiscountPolicy>(
    `/owner/outlets/${outletId}/pos/discount-policy`,
  );
}

export function fetchAuditLog(outletId: string, limit = 100) {
  return ownerApiRequest<{ items: import("../types/owner").AuditLogEntry[] }>(
    `/owner/outlets/${outletId}/audit-log?limit=${limit}`,
  );
}

export function createBillRefund(
  outletId: string,
  billId: string,
  body: { amount: number; method: string; reason: string; manager_approval_pin?: string },
) {
  return ownerApiRequest<{
    id: string;
    refunded_total: string;
  }>(`/owner/outlets/${outletId}/pos/bills/${billId}/refunds`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listTaxProfiles(outletId: string) {
  return ownerApiRequest<TaxProfile[]>(`/owner/outlets/${outletId}/tax`);
}

export function createTaxProfile(outletId: string, body: TaxProfileWrite) {
  return ownerApiRequest<TaxProfile>(`/owner/outlets/${outletId}/tax`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTaxProfile(outletId: string, profileId: string, body: Partial<TaxProfileWrite>) {
  return ownerApiRequest<TaxProfile>(`/owner/outlets/${outletId}/tax/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTaxProfile(outletId: string, profileId: string) {
  return ownerApiRequest<void>(`/owner/outlets/${outletId}/tax/${profileId}`, { method: "DELETE" });
}

export function setTaxEnabled(outletId: string, enabled: boolean) {
  return ownerApiRequest<TaxProfile[]>(`/owner/outlets/${outletId}/tax/enabled`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

export function previewTax(
  outletId: string,
  body: { amount_inr?: number; order_type?: "dine_in" | "takeaway" | "delivery"; apply_tax?: boolean },
) {
  return ownerApiRequest<TaxPreview>(`/owner/outlets/${outletId}/tax/preview`, {
    method: "POST",
    body: JSON.stringify({ amount_inr: 100, order_type: "dine_in", apply_tax: true, ...body }),
  });
}

export async function openBillInvoice(outletId: string, billId: string) {
  const token = getOwnerToken();
  const res = await fetch(`${API_BASE}/owner/outlets/${outletId}/pos/bills/${billId}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not load invoice");
  const html = await res.text();
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
