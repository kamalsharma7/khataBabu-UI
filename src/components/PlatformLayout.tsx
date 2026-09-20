import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PlatformLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/platform/login", { replace: true });
  };

  return (
    <div className="platform-shell">
      <header className="platform-header">
        <div className="platform-header__brand">
          <span className="platform-logo">KhataBabu</span>
          <span className="platform-header__tag">Platform Console</span>
        </div>
        <div className="platform-header__meta">
          <span className="platform-header__user">{admin?.username}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="platform-body">
        <aside className="platform-sidebar">
          <nav className="platform-nav">
            <NavLink to="/platform/tenants" className="platform-nav__link">
              Onboarded venues
            </NavLink>
            <NavLink to="/platform/onboard" className="platform-nav__link">
              New onboarding
            </NavLink>
          </nav>
          <p className="platform-sidebar__note">
            Internal use only. Owner and staff apps do not include this console.
          </p>
        </aside>
        <main className="platform-main">
          <Outlet />
        </main>
      </div>

      <footer className="platform-footer">
        <span>KhataBabu — venue operations platform</span>
        <Link to="/platform/tenants">Support tenants</Link>
      </footer>
    </div>
  );
}
