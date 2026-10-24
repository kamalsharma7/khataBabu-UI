import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { useOwnerPermissions } from "../../context/OwnerPermissionsContext";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  primary?: boolean;
  perm?: string;
  any?: string[];
  managerOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Welcome", end: true },
  { to: "/app/overview", label: "Overview", perm: "analytics.overview" },
  { to: "/app/pos", label: "Billing", perm: "pos.billing", primary: true },
  { to: "/app/floor", label: "Table setup", perm: "pos.floor" },
  { to: "/app/menu", label: "Menu", perm: "pos.menu" },
  { to: "/app/recipes", label: "Item recipes", perm: "recipes.manage" },
  { to: "/app/tax", label: "Tax", any: ["tax.view", "tax.edit"] },
  { to: "/app/raw-materials", label: "Raw materials", perm: "pos.inventory" },
  { to: "/app/purchases", label: "Purchases", perm: "purchases.manage" },
  { to: "/app/customers", label: "Customers (CRM)", perm: "crm.view" },
  { to: "/app/staff", label: "Staff permissions", perm: "staff.permissions", managerOnly: true },
  { to: "/app/settings", label: "Settings", any: ["settings.view", "settings.all"] },
  { to: "/app/audit", label: "Audit log", perm: "audit.view" },
];

export function OwnerLayout() {
  const { profile, logout } = useOwnerAuth();
  const { outlets, outlet, setOutletId, loading } = useOwnerOutlet();
  const { can, canAny, canManage, showDenied, banner, dismissBanner } = useOwnerPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const isPos = location.pathname.startsWith("/app/pos");

  const allowed = (item: NavItem) => {
    if (item.managerOnly) return canManage;
    if (item.any) return canAny(...item.any);
    if (item.perm) return can(item.perm);
    return true;
  };

  const onNav = (item: NavItem, e: MouseEvent<HTMLAnchorElement>) => {
    if (allowed(item)) return;
    e.preventDefault();
    showDenied();
  };

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

      {banner && (
        <div className="perm-banner" role="alert">
          <span>{banner}</span>
          <button type="button" onClick={dismissBanner} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className={`platform-body owner-body ${isPos ? "owner-body--pos" : ""}`}>
        {!isPos && (
        <aside className="platform-sidebar owner-sidebar">
          <nav className="platform-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={(e) => onNav(item, e)}
                className={({ isActive }) =>
                  [
                    "platform-nav__link",
                    item.primary ? "platform-nav__link--primary" : "",
                    isActive ? "active" : "",
                    !allowed(item) ? "platform-nav__link--locked" : "",
                  ].filter(Boolean).join(" ")
                }
                title={!allowed(item) ? "You don't have permission for this operation." : undefined}
              >
                {item.label}
                {!allowed(item) && <span className="perm-lock" aria-hidden>🔒</span>}
              </NavLink>
            ))}
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
