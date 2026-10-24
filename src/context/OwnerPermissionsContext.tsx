import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { myOutletPermissions } from "../api/owner";
import { onOwnerPermissionDenied } from "../api/ownerClient";
import { useOwnerAuth } from "./OwnerAuthContext";
import { useOwnerOutlet } from "./OwnerOutletContext";

const DENIED = "You don't have permission for this operation.";

type OwnerPermissionsContextValue = {
  permissions: string[];
  source: string;
  loading: boolean;
  canManage: boolean;
  can: (code: string) => boolean;
  canAny: (...codes: string[]) => boolean;
  showDenied: (message?: string) => void;
  banner: string | null;
  dismissBanner: () => void;
  refresh: () => Promise<void>;
};

const OwnerPermissionsContext = createContext<OwnerPermissionsContextValue | null>(null);

export function OwnerPermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useOwnerAuth();
  const { outlet } = useOwnerOutlet();
  const [permissions, setPermissions] = useState<string[]>(profile?.permissions ?? []);
  const [source, setSource] = useState("role");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const canManage = Boolean(profile?.can_manage_permissions) || profile?.role === "owner" || profile?.role === "admin";

  const refresh = useCallback(async () => {
    if (!outlet) {
      setPermissions(profile?.permissions ?? []);
      setSource("role");
      return;
    }
    setLoading(true);
    try {
      const me = await myOutletPermissions(outlet.id);
      setPermissions(me.permissions);
      setSource(me.source);
    } catch {
      setPermissions(profile?.permissions ?? []);
    } finally {
      setLoading(false);
    }
  }, [outlet, profile?.permissions]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showDenied = useCallback((message?: string) => {
    setBanner(message?.trim() || DENIED);
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 5200);
    return () => window.clearTimeout(t);
  }, [banner]);

  useEffect(() => onOwnerPermissionDenied((msg) => showDenied(msg)), [showDenied]);

  const can = useCallback((code: string) => permissions.includes(code), [permissions]);
  const canAny = useCallback((...codes: string[]) => codes.some((c) => permissions.includes(c)), [permissions]);

  const value = useMemo(
    () => ({
      permissions,
      source,
      loading,
      canManage,
      can,
      canAny,
      showDenied,
      banner,
      dismissBanner,
      refresh,
    }),
    [permissions, source, loading, canManage, can, canAny, showDenied, banner, dismissBanner, refresh],
  );

  return (
    <OwnerPermissionsContext.Provider value={value}>{children}</OwnerPermissionsContext.Provider>
  );
}

export function useOwnerPermissions() {
  const ctx = useContext(OwnerPermissionsContext);
  if (!ctx) throw new Error("useOwnerPermissions requires OwnerPermissionsProvider");
  return ctx;
}
