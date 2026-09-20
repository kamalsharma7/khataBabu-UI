import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerAuth } from "../../context/OwnerAuthContext";

/** Match backend normalize_login_username (trim, lower, remove all spaces). */
function normalizeOwnerUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function OwnerLoginPage() {
  const { profile, login } = useOwnerAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (profile) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(normalizeOwnerUsername(username), password.trim());
      navigate(me.must_change_password ? "/app/change-password" : "/app", { replace: true });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <span className="platform-logo platform-logo--light">KhataBabu</span>
        <span className="login-header__subtitle">Owner sign in</span>
      </header>

      <div className="login-content">
        <div className="login-illustration" aria-hidden="true">
          <div className="login-illustration__screen">
            <div className="login-illustration__avatar" />
            <div className="login-illustration__dots">••••</div>
          </div>
        </div>

        <div className="login-card card">
          <h1>Sign in to your venue</h1>
          <p className="muted">
            Use the <strong>username</strong> and <strong>temporary password</strong> from onboarding.
            Outlet REF (e.g. KHB-…) is not used to sign in. Session stays active for 24 hours.
          </p>

          <form onSubmit={onSubmit} className="form-stack">
            <label className="field">
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <footer className="login-footer">
        <span>KhataBabu — for restaurant &amp; venue owners</span>
      </footer>
    </div>
  );
}
