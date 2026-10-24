import { Link } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { useOwnerPermissions } from "../../context/OwnerPermissionsContext";

const CARDS: { to: string; title: string; copy: string; cta: string; perm?: string; highlight?: boolean }[] = [
  { to: "/app/overview", title: "Overview", copy: "Sales, collections, and orders — PIN protected for owners.", cta: "View overview →", perm: "analytics.overview" },
  { to: "/app/pos", title: "Billing", copy: "Take orders, send KOT, and settle tables — main POS screen.", cta: "Open billing →", perm: "pos.billing", highlight: true },
  { to: "/app/floor", title: "Table setup", copy: "Add areas and tables to match your floor plan.", cta: "Open table setup →", perm: "pos.floor" },
  { to: "/app/menu", title: "Menu", copy: "Categories and items for POS and kitchen.", cta: "Manage menu →", perm: "pos.menu" },
  { to: "/app/raw-materials", title: "Raw materials", copy: "Flour, oil, chicken, packaging — opening stock, purchase, wastage.", cta: "Manage stock →", perm: "pos.inventory" },
  { to: "/app/customers", title: "Customers (CRM)", copy: "Who comes, how often, what they like — built from the numbers you save at billing.", cta: "Open CRM →", perm: "crm.view" },
  { to: "/app/purchases", title: "Purchases", copy: "Vendor bills, payments due, and invoices — stock in from purchases.", cta: "View purchases →", perm: "purchases.manage" },
  { to: "/app/recipes", title: "Item recipes", copy: "BOM per dish. Linked recipes deduct raw materials on KOT.", cta: "Manage recipes →", perm: "recipes.manage" },
  { to: "/app/tax", title: "Add tax", copy: "GST / VAT on bills. Optional — GSTIN on the invoice does not turn this on.", cta: "Set tax →", perm: "tax.view" },
  { to: "/app/staff", title: "Staff permissions", copy: "Tick what the receptionist can do at this venue.", cta: "Set permissions →", perm: "staff.permissions" },
];

export function OwnerDashboardPage() {
  const { profile } = useOwnerAuth();
  const { outlet, loading, error } = useOwnerOutlet();
  const { can, canManage, showDenied } = useOwnerPermissions();

  return (
    <div className="page owner-welcome">
      <h1>Welcome, {profile?.full_name}</h1>
      <p className="muted">Choose where to go — or click <strong>KhataBabu</strong> in the header anytime to return here.</p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading outlet…</p>}

      {outlet && (
        <>
          <section className="card owner-overview-panel">
            <h2>Your outlet</h2>
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
            {CARDS.map((card) => {
              const ok =
                card.perm === "staff.permissions"
                  ? canManage
                  : card.perm === "tax.view"
                    ? can("tax.view") || can("tax.edit")
                    : !card.perm || can(card.perm);
              return (
                <Link
                  key={card.to}
                  to={card.to}
                  className={`owner-quick-card card ${card.highlight ? "owner-quick-card--highlight" : ""} ${ok ? "" : "owner-quick-card--locked"}`}
                  onClick={(e) => {
                    if (!ok) {
                      e.preventDefault();
                      showDenied();
                    }
                  }}
                >
                  <h2>{card.title}{!ok && " 🔒"}</h2>
                  <p className="muted">{card.copy}</p>
                  <span className="owner-quick-card__cta">{ok ? card.cta : "You don't have permission for this operation."}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
