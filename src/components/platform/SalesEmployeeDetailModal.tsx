import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { getSalesEmployee, updateSalesEmployee } from "../../api/platform";
import type { SalesEmployeeDetail } from "../../types/platform";
import {
  BEHAVIOR_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  PROFESSIONAL_STATUS_OPTIONS,
  labelFor,
} from "../../utils/platformLabels";

interface Props {
  employeeId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SalesEmployeeDetailModal({ employeeId, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<SalesEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getSalesEmployee(employeeId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employee");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError(null);
    try {
      await updateSalesEmployee(detail.id, {
        full_name: detail.full_name,
        mobile: detail.mobile,
        date_of_joining: detail.date_of_joining,
        employment_status: detail.employment_status,
        behavior_status: detail.behavior_status,
        professional_status: detail.professional_status,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop platform-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card platform-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="platform-detail-modal__head">
          <div>
            <h2>{detail?.full_name ?? "Sales employee"}</h2>
            {detail && (
              <p className="muted">
                <code>{detail.employee_code}</code> · Joined {detail.date_of_joining}
              </p>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </header>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="form-error">{error}</p>}

        {detail && !loading && (
          <>
            <div className="platform-stat-row">
              <div className="platform-stat">
                <span className="platform-stat__value">{detail.venues_onboarded_count}</span>
                <span className="platform-stat__label">Venues onboarded</span>
              </div>
              <div className="platform-badge-row">
                <span className="status-pill status-employment">
                  {labelFor(EMPLOYMENT_STATUS_OPTIONS, detail.employment_status)}
                </span>
                <span className="status-pill status-behavior">
                  {labelFor(BEHAVIOR_STATUS_OPTIONS, detail.behavior_status)}
                </span>
                <span className="status-pill status-professional">
                  {labelFor(PROFESSIONAL_STATUS_OPTIONS, detail.professional_status)}
                </span>
              </div>
            </div>

            <form className="platform-detail-form" onSubmit={onSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Full name</span>
                  <input
                    value={detail.full_name}
                    onChange={(e) => setDetail({ ...detail, full_name: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Mobile</span>
                  <input
                    value={detail.mobile}
                    onChange={(e) => setDetail({ ...detail, mobile: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Date of joining</span>
                  <input
                    type="date"
                    value={detail.date_of_joining}
                    onChange={(e) => setDetail({ ...detail, date_of_joining: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Employment status</span>
                  <select
                    value={detail.employment_status}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        employment_status: e.target.value as SalesEmployeeDetail["employment_status"],
                      })
                    }
                  >
                    {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Behaviour</span>
                  <select
                    value={detail.behavior_status}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        behavior_status: e.target.value as SalesEmployeeDetail["behavior_status"],
                      })
                    }
                  >
                    {BEHAVIOR_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Professional</span>
                  <select
                    value={detail.professional_status}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        professional_status: e.target.value as SalesEmployeeDetail["professional_status"],
                      })
                    }
                  >
                    {PROFESSIONAL_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>

            <section className="platform-venue-list">
              <h3>Onboarded venues</h3>
              {detail.onboarded_venues.length === 0 && (
                <p className="muted">No venues assigned yet.</p>
              )}
              <ul>
                {detail.onboarded_venues.map((v) => (
                  <li key={v.business_id}>
                    <strong>{v.legal_name}</strong>
                    <span className="muted"> · {v.outlet_name}</span>
                    <div className="table-sub">
                      <code>{v.outlet_ref_code}</code> · {v.city}, {v.state} ·{" "}
                      <span className={`status-pill status-${v.status}`}>{v.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
