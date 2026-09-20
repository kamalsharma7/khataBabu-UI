import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";

export function OwnerLayout() {
  const { profile, logout } = useOwnerAuth();
  const { outlets, outlet, setOutletId, loading } = useOwnerOutlet();
  const navigate = useNavigate();
  const location = useLocation();
  const isPos = location.pathname.startsWith("/app/pos");

  const handleLogout = () => {
    logout();
    navigate("/app/login", { replace: true });
  };

  return (
    <div className="platform-shell owner-app">
      <header className="platform-header">
        <div className="platform-header__brand">
          <Link to="/app" className="platform-logo-link" title="Welcome home">
            <span className="platform-logo platform-logo--light">KhataBabu</span>
          </Link>
          <span className="platform-header__tag">{profile?.business_name}</span>
        </div>
        <div className="owner-header-tools">
          {!loading && outlets.length > 1 && outlet && (
            <select
              className="owner-outlet-select"
              value={outlet.id}
              onChange={(e) => setOutletId(e.target.value)}
              aria-label="Select outlet"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.ref_code})
                </option>
              ))}
            </select>
          )}
          {!loading && outlets.length === 1 && outlet && (
            <span className="owner-ref-badge">REF {outlet.ref_code}</span>
          )}
        </div>
        <div className="platform-header__meta">
          <span className="platform-header__user">{profile?.full_name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className={`platform-body owner-body ${isPos ? "owner-body--pos" : ""}`}>
        {!isPos && (
        <aside className="platform-sidebar owner-sidebar">
          <nav className="platform-nav">
            <NavLink to="/app" end className="platform-nav__link">
              Overview
            </NavLink>
            <NavLink to="/app/pos" className="platform-nav__link platform-nav__link--primary">
              Billing
            </NavLink>
            <NavLink to="/app/floor" className="platform-nav__link">
              Table setup
            </NavLink>
            <NavLink to="/app/menu" className="platform-nav__link">
              Menu
            </NavLink>
          </nav>
          {outlet && (
            <p className="platform-sidebar__note">
              Outlet: <strong>{outlet.name}</strong>
            </p>
          )}
        </aside>
        )}
        <main className={`platform-main owner-main ${isPos ? "owner-main--pos" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
