import { apiRequest } from "./client";
import type {
  ExpenditureCategory,
  ExpenditureEntry,
  ExpenditureSummary,
  TerritoryAnalytics,
  TerritoryRevenueAnalytics,
  CollectionVenueOption,
  CollectionRecord,
  CollectionCallingList,
  RestaurantCollectionList,
  CollectionHistory,
  PlatformAdminProfile,
  PlatformTokenResponse,
  SalesEmployee,
  SalesEmployeeDetail,
  SalesBehaviorStatus,
  SalesEmploymentStatus,
  SalesProfessionalStatus,
  TenantDetail,
  TenantOnboardingPayload,
  TenantOnboardingResult,
  TenantStatus,
  TenantSummary,
  TenantUpdatePayload,
} from "../types/platform";

function expenditureQuery(opts: {
  fromDate?: string;
  toDate?: string;
  salesEmployeeId?: string;
  category?: ExpenditureCategory;
}): string {
  const params = new URLSearchParams();
  if (opts.fromDate) params.set("from_date", opts.fromDate);
  if (opts.toDate) params.set("to_date", opts.toDate);
  if (opts.salesEmployeeId) params.set("sales_employee_id", opts.salesEmployeeId);
  if (opts.category) params.set("category", opts.category);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function platformLogin(username: string, password: string) {
  return apiRequest<PlatformTokenResponse>("/platform/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    auth: false,
  });
}

export function platformMe() {
  return apiRequest<PlatformAdminProfile>("/platform/auth/me");
}

export function listTenants() {
  return apiRequest<TenantSummary[]>("/platform/onboarding/tenants");
}

export function getTenant(businessId: string) {
  return apiRequest<TenantDetail>(`/platform/onboarding/tenants/${businessId}`);
}

export function updateTenant(businessId: string, body: TenantUpdatePayload) {
  return apiRequest<TenantDetail>(`/platform/onboarding/tenants/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createTenant(payload: TenantOnboardingPayload) {
  return apiRequest<TenantOnboardingResult>("/platform/onboarding/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listSalesEmployees(activeOnly = true) {
  return apiRequest<SalesEmployee[]>(
    `/platform/employees/sales-employees?active_only=${activeOnly}`,
  );
}

export function getSalesEmployee(id: string) {
  return apiRequest<SalesEmployeeDetail>(`/platform/employees/sales-employees/${id}`);
}

export function createSalesEmployee(body: {
  employee_code: string;
  full_name: string;
  mobile: string;
  aadhaar_number: string;
  pan_number: string;
  date_of_joining?: string;
  employment_status?: SalesEmploymentStatus;
  behavior_status?: SalesBehaviorStatus;
  professional_status?: SalesProfessionalStatus;
}) {
  return apiRequest<SalesEmployee>("/platform/employees/sales-employees", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSalesEmployee(
  id: string,
  body: Partial<{
    full_name: string;
    mobile: string;
    aadhaar_number: string;
    pan_number: string;
    date_of_joining: string;
    employment_status: SalesEmploymentStatus;
    behavior_status: SalesBehaviorStatus;
    professional_status: SalesProfessionalStatus;
    is_active: boolean;
  }>,
) {
  return apiRequest<SalesEmployee>(`/platform/employees/sales-employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function expenditureSummary(
  fromDate?: string,
  toDate?: string,
  salesEmployeeId?: string,
) {
  const q = expenditureQuery({ fromDate, toDate, salesEmployeeId });
  return apiRequest<ExpenditureSummary>(`/platform/expenditures/summary${q}`);
}

export function listExpenditures(opts: {
  category?: ExpenditureCategory;
  fromDate?: string;
  toDate?: string;
  salesEmployeeId?: string;
}) {
  const q = expenditureQuery(opts);
  return apiRequest<ExpenditureEntry[]>(`/platform/expenditures${q}`);
}

export function createExpenditure(body: {
  category: ExpenditureCategory;
  amount_inr: number;
  title: string;
  notes?: string | null;
  spent_at?: string;
  sales_employee_id?: string;
}) {
  return apiRequest<ExpenditureEntry>("/platform/expenditures", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteExpenditure(id: string) {
  return apiRequest<void>(`/platform/expenditures/${id}`, { method: "DELETE" });
}

export function territoryAnalytics(fromDate?: string, toDate?: string) {
  const q = expenditureQuery({ fromDate, toDate });
  return apiRequest<TerritoryAnalytics>(`/platform/territory/analytics${q}`);
}

export function territoryRevenueAnalytics(fromDate?: string, toDate?: string) {
  const q = expenditureQuery({ fromDate, toDate });
  return apiRequest<TerritoryRevenueAnalytics>(`/platform/territory/revenue/analytics${q}`);
}

export function listCollectionVenues() {
  return apiRequest<CollectionVenueOption[]>("/platform/collections/venues");
}

export function createCollection(body: {
  business_id: string;
  amount_inr: number;
  payment_date?: string;
  next_payment_date: string;
  tenure_months: number;
  notes?: string | null;
}) {
  return apiRequest<CollectionRecord>("/platform/collections", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function collectionCalling() {
  return apiRequest<CollectionCallingList>("/platform/collections/calling");
}

export function restaurantCollections() {
  return apiRequest<RestaurantCollectionList>("/platform/collections/restaurants");
}

export function venueCollectionHistory(businessId: string) {
  return apiRequest<CollectionHistory>(`/platform/collections/businesses/${businessId}/history`);
}

export function updateTenantStatus(
  businessId: string,
  status: TenantStatus,
  confirm?: { username: string; password: string },
) {
  return apiRequest<TenantSummary>(`/platform/onboarding/tenants/${businessId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      ...(confirm
        ? { confirm_username: confirm.username, confirm_password: confirm.password }
        : {}),
    }),
  });
}
