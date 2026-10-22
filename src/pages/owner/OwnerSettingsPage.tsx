import { useEffect, useState } from "react";
import {
  fetchBusinessSettings,
  setManagerPin,
  updateBusinessProfile,
  updatePosPolicy,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import type { BusinessSettings } from "../../types/owner";

export function OwnerSettingsPage() {
  const [data, setData] = useState<BusinessSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    void fetchBusinessSettings()
      .then(setData)
      .catch((e) => setError(e instanceof OwnerApiError ? e.message : "Failed to load"));
  }, []);

  const saveProfile = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      setData(await updateBusinessProfile(data));
    } catch (e) {
      setError(e instanceof OwnerApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!data) return;
    setSaving(true);
    try {
      setData(
        await updatePosPolicy({
          worker_max_discount_percent: parseFloat(data.worker_max_discount_percent),
          max_discount_percent: parseFloat(data.max_discount_percent),
        }),
      );
    } catch (e) {
      setError(e instanceof OwnerApiError ? e.message : "Policy save failed");
    } finally {
      setSaving(false);
    }
  };

  const savePin = async () => {
    setSaving(true);
    try {
      setData(await setManagerPin(pin));
      setPin("");
    } catch (e) {
      setError(e instanceof OwnerApiError ? e.message : "PIN update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <p className="muted">{error ?? "Loading settings…"}</p>;

  return (
    <div className="owner-settings card">
      <h1>Business &amp; invoice settings</h1>
      <p className="muted">GST details appear on tax invoices. Set manager PIN for discount and refund approvals.</p>
      {error && <p className="form-error">{error}</p>}

      <section className="owner-settings__section">
        <h2>Legal &amp; GST</h2>
        <div className="owner-settings__grid">
          <label className="field"><span>Legal name</span>
            <input value={data.legal_name} onChange={(e) => setData({ ...data, legal_name: e.target.value })} />
          </label>
          <label className="field"><span>Trading name (on bill)</span>
            <input value={data.trading_name ?? ""} onChange={(e) => setData({ ...data, trading_name: e.target.value })} />
          </label>
          <label className="field"><span>GSTIN</span>
            <input value={data.gstin ?? ""} onChange={(e) => setData({ ...data, gstin: e.target.value })} />
          </label>
          <label className="field"><span>FSSAI</span>
            <input value={data.fssai ?? ""} onChange={(e) => setData({ ...data, fssai: e.target.value })} />
          </label>
          <label className="field owner-settings__full"><span>Registered address</span>
            <textarea value={data.registered_address ?? ""} onChange={(e) => setData({ ...data, registered_address: e.target.value })} rows={2} />
          </label>
          <label className="field"><span>Invoice prefix</span>
            <input value={data.invoice_prefix} onChange={(e) => setData({ ...data, invoice_prefix: e.target.value })} />
          </label>
          <label className="field">
            <span>GST registered</span>
            <input type="checkbox" checked={data.gst_registered} onChange={(e) => setData({ ...data, gst_registered: e.target.checked })} />
          </label>
        </div>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveProfile()}>Save profile</button>
      </section>

      <section className="owner-settings__section">
        <h2>Discount policy</h2>
        <div className="owner-settings__grid">
          <label className="field"><span>Staff max discount %</span>
            <input type="number" value={data.worker_max_discount_percent} onChange={(e) => setData({ ...data, worker_max_discount_percent: e.target.value })} />
          </label>
          <label className="field"><span>Absolute max discount %</span>
            <input type="number" value={data.max_discount_percent} onChange={(e) => setData({ ...data, max_discount_percent: e.target.value })} />
          </label>
        </div>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void savePolicy()}>Save policy</button>
      </section>

      <section className="owner-settings__section">
        <h2>Manager approval PIN</h2>
        <p className="muted">Status: {data.manager_pin_configured ? "Configured" : "Not set"}</p>
        <label className="field"><span>New PIN (4–12 digits)</span>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary" disabled={saving || pin.length < 4} onClick={() => void savePin()}>Update PIN</button>
      </section>
    </div>
  );
}
