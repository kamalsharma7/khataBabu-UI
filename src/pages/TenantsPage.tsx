import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { listTenants, updateTenantStatus } from "../api/platform";
import { TenantDetailModal } from "../components/platform/TenantDetailModal";
import type { TenantStatus, TenantSummary } from "../types/platform";

export function TenantsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TenantSummary | null>(null);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTenants(await listTenants());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (tenant: TenantSummary, status: TenantStatus) => {
    if (status === "suspended") {
      setSuspendTarget(tenant);
      setConfirmUsername("");
      setConfirmPassword("");
      setSuspendError(null);
      return;
    }
    try {
      await updateTenantStatus(tenant.business_id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Update failed");
    }
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendError(null);
    try {
      await updateTenantStatus(suspendTarget.business_id, "suspended", {
        username: confirmUsername.trim().toLowerCase(),
        password: confirmPassword,
      });
      setSuspendTarget(null);
      await load();
    } catch (err) {
      setSuspendError(err instanceof ApiError ? err.message : "Suspend failed");
    }
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <h1>Onboarded venues</h1>
          <p className="muted">Businesses you created via platform onboarding.</p>
        </div>
        <Link to="/platform/onboard" className="btn btn-primary">+ New onboarding</Link>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && tenants.length === 0 && (
        <div className="empty-state card">
          <p>No venues onboarded yet.</p>
          <Link to="/platform/onboard" className="btn btn-primary">Onboard first customer</Link>
        </div>
      )}

      {tenants.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table data-table--clickable">
            <thead>
              <tr>
                <th>Business</th>
                <th>Outlet</th>
                <th>REF</th>
                <th>Location</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.business_id}
                  onClick={() => setDetailId(t.business_id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setDetailId(t.business_id)}
                >
                  <td>
                    <strong>{t.legal_name}</strong>
                    <div className="table-sub">{t.primary_email}</div>
                  </td>
                  <td>{t.outlet_name}</td>
                  <td><code>{t.outlet_ref_code}</code></td>
                  <td>{t.city}, {t.state}</td>
                  <td className="capitalize">{t.plan_tier}</td>
                  <td>
                    <span className={`status-pill status-${t.status}`}>{t.status}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select-sm"
                      value={t.status}
                      onChange={(e) => changeStatus(t, e.target.value as TenantStatus)}
                      aria-label={`Status for ${t.legal_name}`}
                    >
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailId && (
        <TenantDetailModal
          businessId={detailId}
          onClose={() => setDetailId(null)}
          onSaved={() => void load()}
        />
      )}

      {suspendTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal card">
            <h2>Confirm suspend</h2>
            <p className="muted">
              Re-enter your platform credentials to suspend <strong>{suspendTarget.legal_name}</strong>.
              The owner will not be able to sign in while suspended.
            </p>
            <div className="form-stack">
              <label className="field">
                <span>Your username</span>
                <input
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="field">
                <span>Your password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {suspendError && <p className="form-error">{suspendError}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSuspendTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmSuspend}>
                Suspend venue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
