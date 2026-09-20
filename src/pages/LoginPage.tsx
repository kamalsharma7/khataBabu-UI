import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (admin) {
    return <Navigate to="/platform/tenants" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
      navigate("/platform/tenants", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <span className="platform-logo platform-logo--light">KhataBabu</span>
        <span className="login-header__subtitle">Platform access</span>
      </header>

      <div className="login-content">
        <div className="login-illustration" aria-hidden="true">
          <div className="login-illustration__screen">
            <div className="login-illustration__avatar" />
            <div className="login-illustration__dots">••••</div>
          </div>
        </div>

        <div className="login-card card">
          <h1>Sign in to Platform Console</h1>
          <p className="muted">Onboard restaurants, cafés, and snooker venues for your customers.</p>

          <form onSubmit={onSubmit} className="form-stack">
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
        <span>Need help? Contact KhataBabu support.</span>
      </footer>
    </div>
  );
}
