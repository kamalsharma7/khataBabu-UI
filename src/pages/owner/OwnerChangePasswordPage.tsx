import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ownerChangePassword } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerAuth } from "../../context/OwnerAuthContext";

export function OwnerChangePasswordPage() {
  const { profile, loading, refreshProfile } = useOwnerAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/app/login" replace />;
  }

  if (!profile.must_change_password) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ownerChangePassword(current, newPass);
      await refreshProfile();
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <span className="platform-logo platform-logo--light">KhataBabu</span>
      </header>
      <div className="login-content">
        <div className="login-card card">
          <h1>Set a new password</h1>
          <p className="muted">Your temporary password must be changed before continuing.</p>
          <form onSubmit={onSubmit} className="form-stack">
            <label className="field">
              <span>Current (temporary) password</span>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>New password (min 12 characters)</span>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                minLength={12}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
