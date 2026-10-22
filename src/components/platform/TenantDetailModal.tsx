import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { getTenant, listSalesEmployees, updateTenant } from "../../api/platform";
import type { TenantDetail, TenantUpdatePayload } from "../../types/platform";
import { StateCitySelect } from "./StateCitySelect";
import { coerceStateCity } from "../../data/indiaTerritory";

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function TenantDetailModal({ businessId, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [salesOptions, setSalesOptions] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, sales] = await Promise.all([
        getTenant(businessId),
        listSalesEmployees(false),
      ]);
      const territory = coerceStateCity(t.state, t.city);
      setDetail({ ...t, state: territory.state, city: territory.city });
      setSalesOptions(
        sales.map((s) => ({
          id: s.id,
          label: `${s.full_name} (${s.employee_code})`,
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load venue");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError(null);
    const body: TenantUpdatePayload = {
      legal_name: detail.legal_name,
      business_type: detail.business_type,
      primary_phone: detail.primary_phone,
      primary_email: detail.primary_email,
      city: detail.city,
      state: detail.state,
      gst_registered: detail.gst_registered,
      gstin: detail.gstin,
      fssai: detail.fssai,
      pan: detail.pan,
      plan_tier: detail.plan_tier,
      internal_notes: detail.internal_notes,
      assigned_sales_employee_id: detail.assigned_sales_employee_id,
      outlet_name: detail.outlet_name,
      address_line: detail.address_line,
      pincode: detail.pincode,
      outlet_phone: detail.outlet_phone,
      operating_models: detail.operating_models,
      venue_kinds: detail.venue_kinds,
      time_based_billing_enabled: detail.time_based_billing_enabled,
      rough_scale_notes: detail.rough_scale_notes,
      owner_full_name: detail.owner.full_name,
      owner_email: detail.owner.email,
      owner_mobile: detail.owner.mobile,
    };
    try {
      await updateTenant(businessId, body);
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
            <h2>{detail?.legal_name ?? "Venue details"}</h2>
            {detail && (
              <p className="muted">
                REF <code>{detail.outlet_ref_code}</code> ·{" "}
                <span className={`status-pill status-${detail.status}`}>{detail.status}</span>
              </p>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="form-error">{error}</p>}

        {detail && !loading && (
          <form className="platform-detail-form" onSubmit={onSubmit}>
            <section>
              <h3>Business</h3>
              <div className="form-grid">
                <label className="field field--full">
                  <span>Legal name</span>
                  <input
                    value={detail.legal_name}
                    onChange={(e) => setDetail({ ...detail, legal_name: e.target.value })}
                  />
                </label>
                <StateCitySelect
                  state={detail.state}
                  city={detail.city}
                  onStateChange={(state) => setDetail({ ...detail, state })}
                  onCityChange={(city) => setDetail({ ...detail, city })}
                />
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={detail.primary_phone}
                    onChange={(e) => setDetail({ ...detail, primary_phone: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={detail.primary_email}
                    onChange={(e) => setDetail({ ...detail, primary_email: e.target.value })}
                  />
                </label>
                <label className="field field--full">
                  <span>Internal notes</span>
                  <textarea
                    rows={2}
                    value={detail.internal_notes ?? ""}
                    onChange={(e) =>
                      setDetail({ ...detail, internal_notes: e.target.value || null })
                    }
                  />
                </label>
                <label className="field field--full">
                  <span>Assigned sales employee</span>
                  <select
                    value={detail.assigned_sales_employee_id ?? ""}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        assigned_sales_employee_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">— None —</option>
                    {salesOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h3>Outlet</h3>
              <div className="form-grid">
                <label className="field field--full">
                  <span>Outlet name</span>
                  <input
                    value={detail.outlet_name}
                    onChange={(e) => setDetail({ ...detail, outlet_name: e.target.value })}
                  />
                </label>
                <label className="field field--full">
                  <span>Address</span>
                  <input
                    value={detail.address_line}
                    onChange={(e) => setDetail({ ...detail, address_line: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Pincode</span>
                  <input
                    value={detail.pincode}
                    onChange={(e) => setDetail({ ...detail, pincode: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <section>
              <h3>Owner login</h3>
              <p className="field-hint">Username cannot be changed here. Password reset is owner self-service.</p>
              <div className="form-grid">
                <label className="field">
                  <span>Username</span>
                  <input value={detail.owner.username} readOnly className="input-readonly" />
                </label>
                <label className="field">
                  <span>Role</span>
                  <input value={detail.owner.role} readOnly className="input-readonly" />
                </label>
                <label className="field field--full">
                  <span>Full name</span>
                  <input
                    value={detail.owner.full_name}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        owner: { ...detail.owner, full_name: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={detail.owner.email}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        owner: { ...detail.owner, email: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Mobile</span>
                  <input
                    value={detail.owner.mobile}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        owner: { ...detail.owner, mobile: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </section>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
