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
}

export interface TenantOnboardingResult {
  business_id: string;
  outlet_id: string;
  owner_id: string;
  outlet_ref_code: string;
  status: TenantStatus;
  owner_credentials: {
    username: string;
    temporary_password: string;
    must_change_password: boolean;
  };
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
