import type { SalesEmploymentStatus, SalesEmployee } from "../types/platform";

/** Sales staff who can receive salary / commission in business expenditure. */
export const SALARY_ELIGIBLE_EMPLOYMENT_STATUSES: readonly SalesEmploymentStatus[] = [
  "active",
  "part_time",
  "probation",
];

export function isSalaryEligibleSalesEmployee(employee: SalesEmployee): boolean {
  return SALARY_ELIGIBLE_EMPLOYMENT_STATUSES.includes(employee.employment_status);
}

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "suspended", label: "Suspended" },
  { value: "left", label: "Left" },
  { value: "part_time", label: "Part-time" },
  { value: "probation", label: "Probation" },
  { value: "on_leave", label: "On leave" },
] as const;

export const BEHAVIOR_STATUS_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "in_doubt", label: "In doubt" },
  { value: "angry", label: "Angry" },
  { value: "sharp", label: "Sharp" },
  { value: "cooperative", label: "Cooperative" },
  { value: "needs_attention", label: "Needs attention" },
] as const;

export const PROFESSIONAL_STATUS_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "sales_expert", label: "Sales expert" },
  { value: "sharp", label: "Sharp" },
  { value: "fresher", label: "Fresher" },
  { value: "rising_star", label: "Rising star" },
  { value: "mentor", label: "Mentor" },
] as const;

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export const EXPENDITURE_CATEGORIES = [
  { value: "sales_team_salary", label: "Sales team salary", short: "Salary", accent: "#4f46e5" },
  { value: "ca_expenses", label: "CA expenses", short: "CA", accent: "#0891b2" },
  { value: "it_cost", label: "IT cost", short: "IT", accent: "#7c3aed" },
  { value: "marketing_cost", label: "Marketing cost", short: "Marketing", accent: "#db2777" },
  { value: "travel_cost", label: "Travel cost", short: "Travel", accent: "#ea580c" },
  { value: "other", label: "Others", short: "Other", accent: "#64748b" },
] as const;

export type ExpenditureCategoryValue = (typeof EXPENDITURE_CATEGORIES)[number]["value"];

export function expenditureCategoryLabel(value: string): string {
  return EXPENDITURE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function ownerRoleLabel(role: string): string {
  if (role === "owner") return "Owner (admin)";
  if (role === "admin") return "Admin";
  if (role === "employee") return "Receptionist / employee";
  if (role === "worker") return "Employee";
  return role;
}
