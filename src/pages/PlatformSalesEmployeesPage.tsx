import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  createSalesEmployee,
  listSalesEmployees,
} from "../api/platform";
import { SalesEmployeeDetailModal } from "../components/platform/SalesEmployeeDetailModal";
import type { SalesBehaviorStatus, SalesEmployee, SalesEmploymentStatus, SalesProfessionalStatus } from "../types/platform";
import {
  BEHAVIOR_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  PROFESSIONAL_STATUS_OPTIONS,
  labelFor,
} from "../utils/platformLabels";

function normalizeAadhaarInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 12) return null;
  return digits;
}

function normalizePanInput(raw: string): string | null {
  const pan = raw.trim().toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return null;
  return pan;
}

export function PlatformSalesEmployeesPage() {
  const [employees, setEmployees] = useState<SalesEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employmentStatus, setEmploymentStatus] = useState<SalesEmploymentStatus>("active");
  const [behaviorStatus, setBehaviorStatus] = useState<SalesBehaviorStatus>("good");
  const [professionalStatus, setProfessionalStatus] = useState<SalesProfessionalStatus>("good");
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(await listSalesEmployees(false));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const aadhaarNorm = normalizeAadhaarInput(aadhaar);
    const panNorm = normalizePanInput(pan);
    if (!code.trim() || !fullName.trim() || !mobile.trim() || !aadhaarNorm || !panNorm) {
      setError("Fill all fields. Aadhaar = 12 digits, PAN = e.g. ABCDE1234F");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSalesEmployee({
        employee_code: code.trim(),
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        aadhaar_number: aadhaarNorm,
        pan_number: panNorm,
        date_of_joining: joinDate,
        employment_status: employmentStatus,
        behavior_status: behaviorStatus,
        professional_status: professionalStatus,
      });
      setCode("");
      setFullName("");
      setMobile("");
      setAadhaar("");
      setPan("");
      setEmploymentStatus("active");
      setBehaviorStatus("good");
      setProfessionalStatus("good");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <h1>Sales &amp; client success team</h1>
      <p className="muted">
        Track employment, behaviour, and venues onboarded. Click a row for full profile.
      </p>

      <form className="card form-card platform-employee-form" onSubmit={onSubmit}>
        <h2>Onboard sales employee</h2>
        <div className="form-grid">
          <label className="field">
            <span>Employee code</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KS-101" required />
          </label>
          <label className="field">
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Mobile</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit" required />
          </label>
          <label className="field">
            <span>Date of joining</span>
            <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Employment status</span>
            <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value as SalesEmploymentStatus)}>
              {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Behaviour status</span>
            <select value={behaviorStatus} onChange={(e) => setBehaviorStatus(e.target.value as SalesBehaviorStatus)}>
              {BEHAVIOR_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Professional status</span>
            <select value={professionalStatus} onChange={(e) => setProfessionalStatus(e.target.value as SalesProfessionalStatus)}>
              {PROFESSIONAL_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Aadhaar</span>
            <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} inputMode="numeric" required />
          </label>
          <label className="field">
            <span>PAN</span>
            <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} required />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Add employee"}
        </button>
      </form>

      <section className="card platform-employee-table-card">
        <h2>Team directory</h2>
        {loading && <p className="muted">Loading…</p>}
        <div className="table-wrap">
          <table className="data-table data-table--clickable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Employment</th>
                <th>Behaviour</th>
                <th>Professional</th>
                <th>Venues</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} onClick={() => setSelectedId(e.id)} tabIndex={0} onKeyDown={(ev) => ev.key === "Enter" && setSelectedId(e.id)}>
                  <td><code>{e.employee_code}</code></td>
                  <td><strong>{e.full_name}</strong></td>
                  <td>
                    <span className="status-pill status-employment">
                      {labelFor(EMPLOYMENT_STATUS_OPTIONS, e.employment_status)}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-behavior">
                      {labelFor(BEHAVIOR_STATUS_OPTIONS, e.behavior_status)}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-professional">
                      {labelFor(PROFESSIONAL_STATUS_OPTIONS, e.professional_status)}
                    </span>
                  </td>
                  <td>{e.venues_onboarded_count}</td>
                  <td>{e.mobile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && employees.length === 0 && <p className="muted">No employees yet.</p>}
      </section>

      {selectedId && (
        <SalesEmployeeDetailModal
          employeeId={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
