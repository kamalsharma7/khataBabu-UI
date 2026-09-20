import { apiRequest } from "./client";
import type {
  PlatformAdminProfile,
  PlatformTokenResponse,
  TenantOnboardingPayload,
  TenantOnboardingResult,
  TenantStatus,
  TenantSummary,
} from "../types/platform";

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

export function createTenant(payload: TenantOnboardingPayload) {
  return apiRequest<TenantOnboardingResult>("/platform/onboarding/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
