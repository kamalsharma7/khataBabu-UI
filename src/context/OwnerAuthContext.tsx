import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ownerLogin, ownerMe, type OwnerProfile } from "../api/owner";
import { getOwnerToken, setOwnerToken } from "../api/ownerClient";
import { normalizeOwnerUsername } from "../utils/ownerUsername";

interface OwnerAuthContextValue {
  profile: OwnerProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<OwnerProfile>;
  refreshProfile: () => Promise<OwnerProfile>;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthContextValue | null>(null);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getOwnerToken()) {
        setLoading(false);
        return;
      }
      try {
        setProfile(await ownerMe());
      } catch {
        setOwnerToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await ownerLogin(normalizeOwnerUsername(username), password.trim());
    setOwnerToken(tokens.access_token);
    const me = await ownerMe();
    setProfile(me);
    return me;
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await ownerMe();
    setProfile(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    setOwnerToken(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, loading, login, refreshProfile, logout }),
    [profile, loading, login, refreshProfile, logout],
  );

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth requires OwnerAuthProvider");
  return ctx;
}
