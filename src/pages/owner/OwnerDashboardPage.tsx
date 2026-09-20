import { Link } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";

export function OwnerDashboardPage() {
  const { profile } = useOwnerAuth();
  const { outlet, loading, error } = useOwnerOutlet();

  return (
    <div className="page owner-welcome">
      <h1>Welcome, {profile?.full_name}</h1>
      <p className="muted">Choose where to go — or click <strong>KhataBabu</strong> in the header anytime to return here.</p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading outlet…</p>}

      {outlet && (
        <>
          <section id="overview" className="card owner-overview-panel">
            <h2>Overview</h2>
            <dl className="owner-overview-dl">
              <div>
                <dt>Business</dt>
                <dd>{profile?.business_name}</dd>
              </div>
              <div>
                <dt>Outlet</dt>
                <dd>{outlet.name}</dd>
              </div>
              <div>
                <dt>Ref code</dt>
                <dd>{outlet.ref_code}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`status-pill status-${profile?.business_status}`}>
                    {profile?.business_status}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <div className="owner-quick-grid">
            <Link to="/app#overview" className="owner-quick-card card">
              <h2>Overview</h2>
              <p className="muted">Outlet summary and account status at a glance.</p>
              <span className="owner-quick-card__cta">View overview →</span>
            </Link>
            <Link to="/app/pos" className="owner-quick-card card owner-quick-card--highlight">
              <h2>Billing</h2>
              <p className="muted">Take orders, send KOT, and settle tables — main POS screen.</p>
              <span className="owner-quick-card__cta">Open billing →</span>
            </Link>
            <Link to="/app/floor" className="owner-quick-card card">
              <h2>Table setup</h2>
              <p className="muted">Add areas and tables to match your floor plan.</p>
              <span className="owner-quick-card__cta">Open table setup →</span>
            </Link>
            <Link to="/app/menu" className="owner-quick-card card">
              <h2>Menu</h2>
              <p className="muted">Categories and items for POS and kitchen.</p>
              <span className="owner-quick-card__cta">Manage menu →</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
