const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "/api/v1" : "http://localhost:8000/api/v1");

const TOKEN_KEY = "khatababu_owner_token";

export function getOwnerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setOwnerToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function formatApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join("; ");
  }
  return fallback;
}

export class OwnerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function analyticsStorageKey(outletId: string): string {
  return `khatababu_analytics_${outletId}`;
}

export function getAnalyticsToken(outletId: string): string | null {
  return sessionStorage.getItem(analyticsStorageKey(outletId));
}

export function setAnalyticsToken(outletId: string, token: string | null): void {
  if (token) sessionStorage.setItem(analyticsStorageKey(outletId), token);
  else sessionStorage.removeItem(analyticsStorageKey(outletId));
}

export async function ownerApiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean; analyticsToken?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false) {
    const token = getOwnerToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.analyticsToken) {
    headers.set("X-Analytics-Token", options.analyticsToken);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new OwnerApiError(
      0,
      `Cannot reach the API at ${API_BASE}. Start Postgres, then from khataBabu run: source .venv/bin/activate && alembic upgrade head && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`,
    );
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = formatApiErrorDetail(body.detail, detail);
    } catch {
      if (response.status >= 500) {
        detail =
          "Server error — if you recently updated the app, run database migrations (alembic upgrade head) and restart the API.";
      }
    }
    throw new OwnerApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
