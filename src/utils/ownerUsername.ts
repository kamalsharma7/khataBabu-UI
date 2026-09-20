/** Match backend `normalize_login_username` (trim, lower, remove all spaces). */
export function normalizeOwnerUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
