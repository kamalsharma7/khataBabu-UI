import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ownerResetPassword } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerAuth } from "../../context/OwnerAuthContext";

export function OwnerResetPasswordPage() {
  const { profile } = useOwnerAuth();
  const [token, setToken] = useState("");
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (profile) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ownerResetPassword(token.trim(), newPass);
      setDone(true);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Reset failed");
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
          <h1>Set new password</h1>
          {done ? (
            <>
              <p className="muted">Your password has been updated. Sign in with your new password.</p>
              <Link to="/app/login" className="btn btn-primary btn-block">Sign in</Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="form-stack">
              <label className="field">
                <span>Reset token</span>
                <input value={token} onChange={(e) => setToken(e.target.value)} required />
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
              <Link to="/app/forgot-password" className="muted" style={{ textAlign: "center" }}>
                Request a new token
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
