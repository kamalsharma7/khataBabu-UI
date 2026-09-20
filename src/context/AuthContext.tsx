import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { platformLogin, platformMe } from "../api/platform";
import { getStoredToken, setStoredToken } from "../api/client";
import type { PlatformAdminProfile } from "../types/platform";

interface AuthContextValue {
  admin: PlatformAdminProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await platformMe();
      setAdmin(profile);
    } catch {
      setStoredToken(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await platformLogin(username, password);
    setStoredToken(tokens.access_token);
    const profile = await platformMe();
    setAdmin(profile);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, login, logout }),
    [admin, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
