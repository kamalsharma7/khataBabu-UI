import { ownerApiRequest } from "./ownerClient";
import type {
  FloorStatusResponse,
  MenuAddonInput,
  MenuCategory,
  MenuItem,
  MenuVariationInput,
  OutletSummary,
  PaymentMethod,
  PosBill,
  PosBillListEntry,
  PosKot,
  PosOrder,
  SplitBillPreview,
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

export function updateArea(outletId: string, areaId: string, data: { name?: string; sort_order?: number }) {
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
    variations?: MenuVariationInput[];
    addons?: MenuAddonInput[];
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
}

export function posBillingSettings(outletId: string) {
  return ownerApiRequest<PosBillingSettings>(`/owner/outlets/${outletId}/pos/billing-settings`);
}

export function posListBills(outletId: string, billStatus: "settled" | "open" | "void" = "settled") {
  const q = billStatus ? `?bill_status=${billStatus}` : "";
  return ownerApiRequest<PosBillListEntry[]>(`/owner/outlets/${outletId}/pos/bills${q}`);
}

export function posGetBill(outletId: string, orderId: string) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/orders/${orderId}/bill`);
}

export function posCreateOrder(
  outletId: string,
  body: { order_type?: string; venue_table_id: string; guest_count?: number },
) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders`, {
    method: "POST",
    body: JSON.stringify({ order_type: "dine_in", ...body }),
  });
}

export function posGetOrder(outletId: string, orderId: string) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}`);
}

export function posUpdateOrder(
  outletId: string,
  orderId: string,
  body: {
    guest_count?: number;
    customer_name?: string | null;
    customer_mobile?: string | null;
    pay_later?: boolean;
    notes?: string | null;
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

export function posUpdateLine(
  outletId: string,
  orderId: string,
  lineId: string,
  body: { quantity?: number; notes?: string | null },
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

export function posCreateBill(
  outletId: string,
  orderId: string,
  body: {
    discount_amount?: number;
    discount_percent?: number;
    tax_percent?: number;
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
    round_to_rupee?: boolean;
    payments: { method: PaymentMethod; amount: number; reference?: string | null }[];
  },
) {
  return ownerApiRequest<PosBill>(`/owner/outlets/${outletId}/pos/bills/${billId}/settle`, {
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

export function posCancelOrder(outletId: string, orderId: string, reason?: string) {
  return ownerApiRequest<PosOrder>(`/owner/outlets/${outletId}/pos/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}
