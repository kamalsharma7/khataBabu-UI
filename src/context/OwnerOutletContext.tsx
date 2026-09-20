import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listOutlets } from "../api/owner";
import { OwnerApiError } from "../api/ownerClient";
import type { OutletSummary } from "../types/owner";
import { useOwnerAuth } from "./OwnerAuthContext";

const STORAGE_KEY = "khatababu_selected_outlet";

interface OwnerOutletContextValue {
  outlets: OutletSummary[];
  outlet: OutletSummary | null;
  setOutletId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refreshOutlets: () => Promise<void>;
}

const OwnerOutletContext = createContext<OwnerOutletContextValue | null>(null);

export function OwnerOutletProvider({ children }: { children: ReactNode }) {
  const { profile } = useOwnerAuth();
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [outletId, setOutletIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOutlets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOutlets();
      setOutlets(data);
      const stored = localStorage.getItem(STORAGE_KEY);
      const pick =
        data.find((o) => o.id === stored)?.id ??
        data[0]?.id ??
        null;
      setOutletIdState(pick);
      if (pick) localStorage.setItem(STORAGE_KEY, pick);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Failed to load outlets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      refreshOutlets();
    } else {
      setOutlets([]);
      setOutletIdState(null);
      setLoading(false);
    }
  }, [profile, refreshOutlets]);

  const setOutletId = useCallback((id: string) => {
    setOutletIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const outlet = useMemo(
    () => outlets.find((o) => o.id === outletId) ?? null,
    [outlets, outletId],
  );

  const value = useMemo(
    () => ({
      outlets,
      outlet,
      setOutletId,
      loading,
      error,
      refreshOutlets,
    }),
    [outlets, outlet, setOutletId, loading, error, refreshOutlets],
  );

  return <OwnerOutletContext.Provider value={value}>{children}</OwnerOutletContext.Provider>;
}

export function useOwnerOutlet() {
  const ctx = useContext(OwnerOutletContext);
  if (!ctx) throw new Error("useOwnerOutlet requires OwnerOutletProvider");
  return ctx;
}
