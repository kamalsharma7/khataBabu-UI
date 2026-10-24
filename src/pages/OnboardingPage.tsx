import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { createTenant, listSalesEmployees } from "../api/platform";
import { CredentialsModal } from "../components/CredentialsModal";
import type {
  BusinessType,
  OperatingModel,
  PlanTier,
  TenantOnboardingPayload,
  SalesEmployee,
  TenantOnboardingResult,
  VenueKind,
} from "../types/platform";
import { StateCitySelect } from "../components/platform/StateCitySelect";
import { DEFAULT_INDIAN_STATE, defaultCityForState } from "../data/indiaTerritory";
import { labelFor, EMPLOYMENT_STATUS_OPTIONS } from "../utils/platformLabels";

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "restaurant_and_snooker", label: "Restaurant + snooker" },
  { value: "cafe", label: "Café" },
  { value: "bar", label: "Bar" },
  { value: "multi_venue", label: "Multi-venue" },
  { value: "other", label: "Other" },
];

const PLANS: { value: PlanTier; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const OPERATING: { value: OperatingModel; label: string }[] = [
  { value: "dine_in", label: "Dine-in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];

const VENUES: { value: VenueKind; label: string }[] = [
  { value: "dining", label: "Dining" },
  { value: "snooker_pool", label: "Snooker / pool" },
  { value: "private_rooms", label: "Private rooms" },
  { value: "banquet", label: "Banquet" },
  { value: "bar", label: "Bar area" },
  { value: "gaming", label: "Gaming" },
  { value: "other", label: "Other" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TenantOnboardingResult | null>(null);

  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [state, setState] = useState(DEFAULT_INDIAN_STATE);
  const [city, setCity] = useState(() => defaultCityForState(DEFAULT_INDIAN_STATE));
  const [gstRegistered, setGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");
  const [fssai, setFssai] = useState("");
  const [pan, setPan] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier>("basic");
  const [internalNotes, setInternalNotes] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(true);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");

  const [outletName, setOutletName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [pincode, setPincode] = useState("");
  const [outletPhone, setOutletPhone] = useState("");
  const [operatingModels, setOperatingModels] = useState<OperatingModel[]>(["dine_in"]);
  const [venueKinds, setVenueKinds] = useState<VenueKind[]>(["dining"]);
  const [timeBasedBilling, setTimeBasedBilling] = useState(false);
  const [roughScale, setRoughScale] = useState("");
  const [salesEmployees, setSalesEmployees] = useState<SalesEmployee[]>([]);
  const [assignedSalesId, setAssignedSalesId] = useState("");

  useEffect(() => {
    void listSalesEmployees(true)
      .then(setSalesEmployees)
      .catch(() => setSalesEmployees([]));
  }, []);

  const toggleOperating = (value: OperatingModel) => {
    setOperatingModels((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleVenue = (value: VenueKind) => {
    setVenueKinds((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const buildPayload = (): TenantOnboardingPayload => ({
    business: {
      legal_name: legalName.trim(),
      business_type: businessType,
      primary_phone: primaryPhone.trim(),
      primary_email: primaryEmail.trim(),
      city: city.trim(),
      state: state.trim(),
      gst_registered: gstRegistered,
      gstin: gstRegistered ? gstin.trim().toUpperCase() : null,
      fssai: fssai.trim() || null,
      pan: pan.trim().toUpperCase() || null,
      plan_tier: planTier,
      internal_notes: internalNotes.trim() || null,
      activate_immediately: activateImmediately,
    },
    owner: {
      full_name: ownerName.trim(),
      email: ownerEmail.trim(),
      mobile: ownerMobile.trim(),
    },
    outlet: {
      name: outletName.trim(),
      address_line: addressLine.trim(),
      pincode: pincode.trim(),
      outlet_phone: outletPhone.trim() || null,
      operating_models: operatingModels,
      venue_kinds: venueKinds,
      time_based_billing_enabled: timeBasedBilling,
      rough_scale_notes: roughScale.trim() || null,
    },
    assigned_sales_employee_id: assignedSalesId || null,
  });

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!legalName.trim()) return "Business name is required";
      if (!primaryPhone.trim()) return "Business phone is required";
      if (!primaryEmail.trim()) return "Business email is required";
      if (!city.trim() || !state.trim()) return "Select state and city";
      if (gstRegistered && gstin.trim().length !== 15) return "GSTIN must be 15 characters";
    }
    if (s === 2) {
      if (!ownerName.trim()) return "Owner name is required";
      if (!ownerEmail.trim()) return "Owner email is required";
      if (!ownerMobile.trim()) return "Owner mobile is required";
    }
    if (s === 3) {
      if (!outletName.trim()) return "Outlet name is required";
      if (!addressLine.trim()) return "Address is required";
      if (pincode.trim().length < 6) return "Valid pincode is required";
      if (operatingModels.length === 0) return "Select at least one operating model";
      if (venueKinds.length === 0) return "Select at least one venue type";
    }
    return null;
  };

  const next = () => {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const msg = validateStep(3);
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createTenant(buildPayload());
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <h1>New customer onboarding</h1>
      <p className="muted">Collect details from the customer call, then create their business and owner access.</p>

      <div className="steps">
        {["Business", "Owner", "Outlet"].map((label, i) => (
          <div key={label} className={`step ${step === i + 1 ? "step--active" : ""} ${step > i + 1 ? "step--done" : ""}`}>
            <span className="step__num">{i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <form className="card form-card" onSubmit={onSubmit}>
        {step === 1 && (
          <div className="form-grid">
            <label className="field field--full">
              <span>Legal / brand name</span>
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Business type</span>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)}>
                {BUSINESS_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Plan</span>
              <select value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTier)}>
                {PLANS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Primary phone</span>
              <input value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} placeholder="10-digit mobile" />
            </label>
            <label className="field">
              <span>Primary email</span>
              <input type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} />
            </label>
            <StateCitySelect
              state={state}
              city={city}
              onStateChange={setState}
              onCityChange={setCity}
            />
            <label className="field field--checkbox field--full">
              <input type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} />
              <span>GST registered — prints GSTIN on invoices. Tax on bills is set later under Tax, not from this number.</span>
            </label>
            {gstRegistered && (
              <label className="field field--full">
                <span>GSTIN</span>
                <input value={gstin} onChange={(e) => setGstin(e.target.value)} maxLength={15} />
              </label>
            )}
            <label className="field">
              <span>FSSAI (optional)</span>
              <input value={fssai} onChange={(e) => setFssai(e.target.value)} />
            </label>
            <label className="field">
              <span>PAN (optional)</span>
              <input value={pan} onChange={(e) => setPan(e.target.value)} maxLength={10} />
            </label>
            <label className="field field--full">
              <span>Internal notes</span>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
            </label>
            <label className="field field--checkbox field--full">
              <input type="checkbox" checked={activateImmediately} onChange={(e) => setActivateImmediately(e.target.checked)} />
              <span>Activate immediately (active status)</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <label className="field field--full">
              <span>Owner full name</span>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Owner email</span>
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>Owner mobile</span>
              <input value={ownerMobile} onChange={(e) => setOwnerMobile(e.target.value)} placeholder="10-digit" />
            </label>
            <p className="field-hint field--full">
              A unique username and temporary password will be generated automatically after you submit.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="form-grid">
            <label className="field field--full">
              <span>Outlet name</span>
              <input value={outletName} onChange={(e) => setOutletName(e.target.value)} placeholder="e.g. Rohtak branch" />
            </label>
            <label className="field field--full">
              <span>Address</span>
              <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
            </label>
            <label className="field">
              <span>Pincode</span>
              <input value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </label>
            <label className="field">
              <span>Outlet phone (optional)</span>
              <input value={outletPhone} onChange={(e) => setOutletPhone(e.target.value)} />
            </label>
            <div className="field field--full">
              <span>Operating models</span>
              <div className="chip-group">
                {OPERATING.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`chip ${operatingModels.includes(o.value) ? "chip--on" : ""}`}
                    onClick={() => toggleOperating(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field field--full">
              <span>Venue types at this outlet</span>
              <div className="chip-group">
                {VENUES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    className={`chip ${venueKinds.includes(v.value) ? "chip--on" : ""}`}
                    onClick={() => toggleVenue(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field field--checkbox field--full">
              <input type="checkbox" checked={timeBasedBilling} onChange={(e) => setTimeBasedBilling(e.target.checked)} />
              <span>Enable time-based billing (snooker / pool sessions)</span>
            </label>
            <label className="field field--full">
              <span>Rough scale (optional)</span>
              <input value={roughScale} onChange={(e) => setRoughScale(e.target.value)} placeholder="e.g. 12 tables, 3 snooker tables" />
            </label>
            <label className="field field--full">
              <span>Assigned sales / support contact</span>
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
              >
                <option value="">— Not assigned —</option>
                {salesEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_code}) · {labelFor(EMPLOYMENT_STATUS_OPTIONS, e.employment_status)}
                  </option>
                ))}
              </select>
              {salesEmployees.length === 0 && (
                <span className="field-hint">Add employees under Platform → Sales team first.</span>
              )}
            </label>
            <div className="cred-auto-card field--full">
              <h3>Logins created automatically</h3>
              <ul>
                <li>
                  <strong>Owner (admin)</strong> — full access; details from step 2. Username &amp; password
                  shown once after submit.
                </li>
                <li>
                  <strong>Receptionist (employee)</strong> — POS billing only; one extra login generated
                  automatically. Role is stored at sign-in for menu restrictions.
                </li>
              </ul>
            </div>
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={back}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" className="btn btn-primary" onClick={next}>
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create customer"}
            </button>
          )}
        </div>
      </form>

      {result && (
        <CredentialsModal
          result={result}
          onClose={() => {
            setResult(null);
            setStep(1);
            navigate("/platform/tenants", { replace: true });
          }}
        />
      )}
    </div>
  );
}
