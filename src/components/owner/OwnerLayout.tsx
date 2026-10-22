import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";

export function OwnerLayout() {
  const { profile, logout } = useOwnerAuth();
  const { outlets, outlet, setOutletId, loading } = useOwnerOutlet();
  const navigate = useNavigate();
  const location = useLocation();
  const isPos = location.pathname.startsWith("/app/pos");
  const perms = profile?.permissions ?? [];
  const canOverview = perms.includes("analytics.overview");
  const canMenu = perms.includes("pos.menu");
  const canInventory = perms.includes("pos.inventory");
  const canFloor = perms.includes("pos.floor");
  const canSettings = perms.includes("settings.view") || perms.includes("settings.all");
  const canAudit = perms.includes("audit.view");

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
          {profile?.support_contact_mobile && (
            <a
              className="owner-support-chip"
              href={`tel:${profile.support_contact_mobile}`}
              title={profile.support_contact_name ?? "KhataBabu support"}
            >
              Support {profile.support_contact_mobile}
            </a>
          )}
          {profile?.role && (
            <span className="owner-role-chip" title="Access level">{profile.role}</span>
          )}
          <span className="platform-header__user">{profile?.full_name}</span>
          {!profile?.must_change_password && (
            <Link to="/app/change-password" className="btn btn-ghost btn-sm">
              Password
            </Link>
          )}
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
              Welcome
            </NavLink>
            {canOverview && (
            <NavLink to="/app/overview" className="platform-nav__link">
              Overview
            </NavLink>
            )}
            <NavLink to="/app/pos" className="platform-nav__link platform-nav__link--primary">
              Billing
            </NavLink>
            {canFloor && (
            <NavLink to="/app/floor" className="platform-nav__link">
              Table setup
            </NavLink>
            )}
            {canMenu && (
            <NavLink to="/app/menu" className="platform-nav__link">
              Menu
            </NavLink>
            )}
            {canMenu && (
            <NavLink to="/app/recipes" className="platform-nav__link">
              Item recipes
            </NavLink>
            )}
            {canInventory && (
            <NavLink to="/app/raw-materials" className="platform-nav__link">
              Raw materials
            </NavLink>
            )}
            {canInventory && (
            <NavLink to="/app/purchases" className="platform-nav__link">
              Purchases
            </NavLink>
            )}
            {canOverview && (
            <NavLink to="/app/customers" className="platform-nav__link">
              Customers (CRM)
            </NavLink>
            )}
            {canSettings && (
            <NavLink to="/app/settings" className="platform-nav__link">
              Settings
            </NavLink>
            )}
            {canAudit && (
            <NavLink to="/app/audit" className="platform-nav__link">
              Audit log
            </NavLink>
            )}
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
