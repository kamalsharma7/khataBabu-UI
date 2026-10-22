export type BusinessType =
  | "restaurant"
  | "restaurant_and_snooker"
  | "cafe"
  | "bar"
  | "multi_venue"
  | "other";

export type PlanTier = "basic" | "pro" | "enterprise";

export type TenantStatus = "draft" | "active" | "suspended";

export type OperatingModel = "dine_in" | "takeaway" | "delivery";

export type VenueKind =
  | "dining"
  | "snooker_pool"
  | "private_rooms"
  | "banquet"
  | "bar"
  | "gaming"
  | "other";

export type SalesEmploymentStatus =
  | "active"
  | "blocked"
  | "suspended"
  | "left"
  | "part_time"
  | "probation"
  | "on_leave";

export type SalesBehaviorStatus =
  | "good"
  | "in_doubt"
  | "angry"
  | "sharp"
  | "cooperative"
  | "needs_attention";

export type SalesProfessionalStatus =
  | "good"
  | "sales_expert"
  | "sharp"
  | "fresher"
  | "rising_star"
  | "mentor";

export interface PlatformTokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
}

export interface PlatformAdminProfile {
  id: string;
  username: string;
  mobile: string;
}

export interface TenantOnboardingPayload {
  business: {
    legal_name: string;
    business_type: BusinessType;
    primary_phone: string;
    primary_email: string;
    city: string;
    state: string;
    gst_registered: boolean;
    gstin?: string | null;
    fssai?: string | null;
    pan?: string | null;
    plan_tier: PlanTier;
    internal_notes?: string | null;
    activate_immediately: boolean;
  };
  owner: {
    full_name: string;
    email: string;
    mobile: string;
  };
  outlet: {
    name: string;
    address_line: string;
    pincode: string;
    outlet_phone?: string | null;
    operating_models: OperatingModel[];
    venue_kinds: VenueKind[];
    time_based_billing_enabled: boolean;
    rough_scale_notes?: string | null;
  };
  assigned_sales_employee_id?: string | null;
}

export interface SalesEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  mobile: string;
  aadhaar_number: string;
  pan_number: string;
  is_active: boolean;
  date_of_joining: string;
  employment_status: SalesEmploymentStatus;
  behavior_status: SalesBehaviorStatus;
  professional_status: SalesProfessionalStatus;
  venues_onboarded_count: number;
}

export interface SalesEmployeeVenue {
  business_id: string;
  legal_name: string;
  outlet_name: string;
  outlet_ref_code: string;
  status: TenantStatus;
  city: string;
  state: string;
  created_at: string;
}

export interface SalesEmployeeDetail extends SalesEmployee {
  onboarded_venues: SalesEmployeeVenue[];
}

export interface OwnerCredentialOnce {
  username: string;
  temporary_password: string;
  must_change_password: boolean;
  role: string;
}

export interface TenantOnboardingResult {
  business_id: string;
  outlet_id: string;
  owner_id: string;
  outlet_ref_code: string;
  status: TenantStatus;
  owner_credentials: OwnerCredentialOnce;
  staff_credentials?: OwnerCredentialOnce[];
  message: string;
}

export interface TenantSummary {
  business_id: string;
  legal_name: string;
  status: TenantStatus;
  plan_tier: PlanTier;
  primary_email: string;
  city: string;
  state: string;
  outlet_ref_code: string;
  outlet_name: string;
  created_at: string;
}

export interface TenantDetail {
  business_id: string;
  outlet_id: string;
  status: TenantStatus;
  legal_name: string;
  business_type: BusinessType;
  primary_phone: string;
  primary_email: string;
  city: string;
  state: string;
  gst_registered: boolean;
  gstin: string | null;
  fssai: string | null;
  pan: string | null;
  plan_tier: PlanTier;
  internal_notes: string | null;
  assigned_sales_employee_id: string | null;
  assigned_sales_employee_name: string | null;
  outlet_name: string;
  address_line: string;
  pincode: string;
  outlet_phone: string | null;
  operating_models: OperatingModel[];
  venue_kinds: VenueKind[];
  time_based_billing_enabled: boolean;
  rough_scale_notes: string | null;
  outlet_ref_code: string;
  owner: {
    id: string;
    full_name: string;
    email: string;
    mobile: string;
    username: string;
    role: string;
  };
  created_at: string;
}

export type ExpenditureCategory =
  | "sales_team_salary"
  | "ca_expenses"
  | "it_cost"
  | "marketing_cost"
  | "travel_cost"
  | "other";

export interface ExpenditureEntry {
  id: string;
  category: ExpenditureCategory;
  amount_inr: string;
  title: string;
  notes: string | null;
  spent_at: string;
  recorded_by_admin_id: string | null;
  sales_employee_id: string | null;
  sales_employee_name: string | null;
  created_at: string;
}

export interface CategoryTotalRow {
  category: ExpenditureCategory;
  total_inr: string;
  entry_count: number;
}

export interface ExpenditureSummary {
  from_date: string | null;
  to_date: string | null;
  grand_total_inr: string;
  entry_count: number;
  by_category: CategoryTotalRow[];
}

export interface TerritoryOutletRow {
  outlet_id: string;
  outlet_name: string;
  outlet_ref_code: string;
  business_id: string;
  legal_name: string;
  city: string;
  state: string;
  status: TenantStatus;
  plan_tier: PlanTier;
  gross_sales_inr: string;
  settled_bill_count: number;
}

export interface TerritoryCityRow {
  city: string;
  state: string;
  outlet_count: number;
  active_outlet_count: number;
  gross_sales_inr: string;
  settled_bill_count: number;
  outlets: TerritoryOutletRow[];
}

export interface TerritoryStateRow {
  state: string;
  city_count: number;
  outlet_count: number;
  active_outlet_count: number;
  gross_sales_inr: string;
  settled_bill_count: number;
  cities: TerritoryCityRow[];
}

export interface TerritoryInsightRow {
  kind: string;
  state: string;
  city: string;
  outlet_count: number;
  gross_sales_inr: string;
  message: string;
}

export interface TerritoryAnalytics {
  from_date: string | null;
  to_date: string | null;
  total_outlets: number;
  total_states: number;
  total_cities: number;
  active_outlets: number;
  grand_sales_inr: string;
  settled_bill_count: number;
  states: TerritoryStateRow[];
  insights: TerritoryInsightRow[];
}

export interface TerritoryRevenueOutletRow {
  outlet_id: string;
  outlet_name: string;
  outlet_ref_code: string;
  business_id: string;
  legal_name: string;
  city: string;
  state: string;
  status: TenantStatus;
  plan_tier: PlanTier;
  collections_inr: string;
  collection_count: number;
}

export interface TerritoryRevenueCityRow {
  city: string;
  state: string;
  outlet_count: number;
  active_outlet_count: number;
  collections_inr: string;
  collection_count: number;
  outlets: TerritoryRevenueOutletRow[];
}

export interface TerritoryRevenueStateRow {
  state: string;
  city_count: number;
  outlet_count: number;
  active_outlet_count: number;
  collections_inr: string;
  collection_count: number;
  cities: TerritoryRevenueCityRow[];
}

export interface TerritoryRevenueInsightRow {
  kind: string;
  state: string;
  city: string;
  outlet_count: number;
  collections_inr: string;
  message: string;
}

export interface TerritoryRevenueAnalytics {
  from_date: string | null;
  to_date: string | null;
  total_outlets: number;
  total_states: number;
  total_cities: number;
  active_outlets: number;
  grand_collections_inr: string;
  collection_count: number;
  states: TerritoryRevenueStateRow[];
  insights: TerritoryRevenueInsightRow[];
}

export interface CollectionVenueOption {
  business_id: string;
  legal_name: string;
  outlet_name: string;
  outlet_ref_code: string;
  city: string;
  state: string;
  status: TenantStatus;
  joining_date: string;
}

export interface CollectionRecord {
  id: string;
  business_id: string;
  amount_inr: string;
  payment_date: string;
  next_payment_date: string;
  tenure_months: number;
  notes: string | null;
  recorded_by_admin_id: string | null;
  created_at: string;
}

export interface CollectionCallingRow {
  business_id: string;
  legal_name: string;
  outlet_name: string;
  outlet_ref_code: string;
  city: string;
  state: string;
  status: TenantStatus;
  owner_name: string | null;
  owner_mobile: string | null;
  venue_phone: string;
  amount_inr: string;
  tenure_months: number;
  payment_date: string;
  next_payment_date: string;
  days_until_due: number;
  is_overdue: boolean;
  collection_id: string;
}

export interface CollectionCallingList {
  as_of: string;
  due_within_days: number;
  rows: CollectionCallingRow[];
}

export interface RestaurantCollectionRow {
  business_id: string;
  legal_name: string;
  outlet_name: string;
  outlet_ref_code: string;
  city: string;
  state: string;
  status: TenantStatus;
  joining_date: string;
  plan_tier: PlanTier;
  has_collection: boolean;
  latest_amount_inr: string | null;
  tenure_months: number | null;
  latest_payment_date: string | null;
  next_payment_date: string | null;
  total_collected_inr: string;
  pack_count: number;
}

export interface RestaurantCollectionList {
  rows: RestaurantCollectionRow[];
}

export interface CollectionHistory {
  business_id: string;
  legal_name: string;
  outlet_name: string;
  outlet_ref_code: string;
  city: string;
  state: string;
  joining_date: string;
  total_collected_inr: string;
  entries: CollectionRecord[];
}

export type TenantUpdatePayload = Partial<{
  legal_name: string;
  business_type: BusinessType;
  primary_phone: string;
  primary_email: string;
  city: string;
  state: string;
  gst_registered: boolean;
  gstin: string | null;
  fssai: string | null;
  pan: string | null;
  plan_tier: PlanTier;
  internal_notes: string | null;
  assigned_sales_employee_id: string | null;
  outlet_name: string;
  address_line: string;
  pincode: string;
  outlet_phone: string | null;
  operating_models: OperatingModel[];
  venue_kinds: VenueKind[];
  time_based_billing_enabled: boolean;
  rough_scale_notes: string | null;
  owner_full_name: string;
  owner_email: string;
  owner_mobile: string;
}>;
