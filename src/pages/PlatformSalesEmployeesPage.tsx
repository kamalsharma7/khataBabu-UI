import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  createSalesEmployee,
  listSalesEmployees,
} from "../api/platform";
import type { SalesEmployee } from "../types/platform";

export function PlatformSalesEmployeesPage() {
  const [employees, setEmployees] = useState<SalesEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!code.trim() || !fullName.trim() || !mobile.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSalesEmployee({
        employee_code: code.trim(),
        full_name: fullName.trim(),
        mobile: mobile.trim(),
      });
      setCode("");
      setFullName("");
      setMobile("");
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
        Onboard KhataBabu employees who are assigned to restaurants at customer onboarding.
        Their mobile appears in the owner app header as support contact.
      </p>

      <form className="card form-card" onSubmit={onSubmit}>
        <h2>Add employee</h2>
        <div className="form-grid">
          <label className="field">
            <span>Employee code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. KS-101"
              required
            />
          </label>
          <label className="field">
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Mobile (support number)</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit" required />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Add employee"}
        </button>
      </form>

      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Team directory</h2>
        {loading && <p className="muted">Loading…</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td><code>{e.employee_code}</code></td>
                <td>{e.full_name}</td>
                <td>{e.mobile}</td>
                <td>{e.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && employees.length === 0 && <p className="muted">No employees yet.</p>}
      </section>
    </div>
  );
}
