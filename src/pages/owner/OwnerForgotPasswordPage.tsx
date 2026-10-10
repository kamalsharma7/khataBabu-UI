import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ownerForgotPassword } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { normalizeOwnerUsername } from "../../utils/ownerUsername";

export function OwnerForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ownerForgotPassword(normalizeOwnerUsername(username));
      setSent(true);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Request failed");
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
          <h1>Reset password</h1>
          {sent ? (
            <>
              <p className="muted">
                If an account exists for that username, we have generated a reset link.
                In production this is sent by SMS to the registered mobile. For now, ask your
                KhataBabu support contact or check server logs in development.
              </p>
              <p className="muted">
                Already have a reset token?{" "}
                <Link to="/app/reset-password">Enter it here</Link>.
              </p>
              <Link to="/app/login" className="btn btn-secondary btn-block">Back to sign in</Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="form-stack">
              <p className="muted">Enter your venue username. We never confirm whether it exists (security).</p>
              <label className="field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset instructions"}
              </button>
              <Link to="/app/login" className="muted" style={{ textAlign: "center" }}>
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
