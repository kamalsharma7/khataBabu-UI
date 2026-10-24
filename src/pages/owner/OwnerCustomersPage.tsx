import { useCallback, useEffect, useMemo, useState } from "react";
import {
  backfillCustomers,
  createCustomer,
  crmInsights,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { CrmInsightsView } from "../../components/owner/crm/CrmInsightsView";
import { CustomerCreateModal } from "../../components/owner/crm/CustomerCreateModal";
import { CustomerDetailModal } from "../../components/owner/crm/CustomerDetailModal";
import {
  SEGMENT_META,
  SEGMENT_ORDER,
  daysAgoLabel,
  fmtDate,
  initials,
  inr,
  segmentLabel,
} from "../../components/owner/crm/crmUtils";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { useOwnerPermissions } from "../../context/OwnerPermissionsContext";
import type { CrmInsights, CustomerDetail, CustomerSummary, CustomerWrite } from "../../types/owner";

type Tab = "customers" | "insights";
const PAGE = 100;

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function OwnerCustomersPage() {
  const { outlet } = useOwnerOutlet();
  const { profile } = useOwnerAuth();
  const { can } = useOwnerPermissions();
  const canDelete = can("crm.delete");

  const [tab, setTab] = useState<Tab>("customers");
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState("last_visit");
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [insights, setInsights] = useState<CrmInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<CustomerDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadList = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listCustomers(outlet.id, { q, segment, sort, limit: PAGE, offset });
      setRows(res.customers);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, [outlet, q, segment, sort, offset]);

  const loadInsights = useCallback(async () => {
    if (!outlet) return;
    try {
      setInsights(await crmInsights(outlet.id));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load insights");
    }
  }, [outlet]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  // Debounce free-text search.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setOffset(0);
      setQ(qDraft.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [qDraft]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadList(), loadInsights()]);
  }, [loadList, loadInsights]);

  const openCustomer = useCallback(
    async (id: string) => {
      if (!outlet) return;
      setViewId(id);
      setViewLoading(true);
      try {
        setViewCustomer(await getCustomer(outlet.id, id));
      } catch (err) {
        setError(err instanceof OwnerApiError ? err.message : "Could not load customer");
        setViewId(null);
      } finally {
        setViewLoading(false);
      }
    },
    [outlet],
  );

  const closeCustomer = () => {
    setViewId(null);
    setViewCustomer(null);
  };

  const handleCreate = async (body: CustomerWrite) => {
    if (!outlet) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCustomer(outlet.id, body);
      setCreateOpen(false);
      setNotice(`Added ${created.name || created.phone || "customer"} to CRM.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not add customer");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (body: CustomerWrite) => {
    if (!outlet || !viewId) return;
    setSaving(true);
    setError(null);
    try {
      setViewCustomer(await updateCustomer(outlet.id, viewId, body));
      setNotice("Profile saved.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!outlet || !viewId) return;
    setSaving(true);
    try {
      await deleteCustomer(outlet.id, viewId);
      closeCustomer();
      setNotice("Customer removed from CRM.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not delete customer");
    } finally {
      setSaving(false);
    }
  };

  const handleBackfill = async () => {
    if (!outlet) return;
    setSaving(true);
    setError(null);
    try {
      const r = await backfillCustomers(outlet.id);
      setNotice(
        `Scanned ${r.orders_scanned} old bills · linked ${r.orders_linked} · ${r.customers_created} new customers · stats refreshed for ${r.customers_refreshed}.`,
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    if (!outlet) return;
    try {
      const all = await listCustomers(outlet.id, { q, segment, sort, limit: 500, offset: 0 });
      const header = [
        "Name", "Mobile", "Locality", "Segment", "Visits", "Total spend", "Avg bill", "Last visit",
        "First visit", "Khata due", "Birthday", "Anniversary", "Email", "Tags", "Offers OK",
      ];
      const lines = all.customers.map((c) =>
        [
          c.name, c.phone, c.locality, segmentLabel(c.segment), c.visit_count, c.total_spend_inr, c.avg_ticket_inr,
          c.last_visit_at ? fmtDate(c.last_visit_at) : "", c.first_visit_at ? fmtDate(c.first_visit_at) : "",
          c.khata_due_inr, c.birthday ?? "", c.anniversary ?? "", c.email, c.tags.join("|"), c.marketing_opt_in ? "yes" : "no",
        ].map(csvEscape).join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${outlet.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Export failed");
    }
  };

  const segmentCounts = useMemo(() => {
    const m = new Map<string, number>();
    insights?.segments.forEach((s) => m.set(s.segment, s.customers));
    return m;
  }, [insights]);

  if (!outlet) return <p className="muted">Select an outlet to see customers.</p>;

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);

  return (
    <div className="page crm-page">
      <header className="ir-page__head">
        <div>
          <h1>Customers</h1>
          <p className="muted">
            Everyone who gave a mobile number at billing lands here automatically — who they are, what they like, how
            often they come to <strong>{outlet.name}</strong>.
          </p>
        </div>
        <div className="ir-page__head-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleBackfill()} disabled={saving}>
            Import from past bills
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void exportCsv()} disabled={saving}>
            Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + Add customer
          </button>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && (
        <p className="crm-notice" role="status">
          {notice}
          <button type="button" className="crm-notice__x" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </p>
      )}

      <nav className="terr-mode-tabs crm-tabs">
        <button
          type="button"
          className={`terr-mode-tab ${tab === "customers" ? "terr-mode-tab--active" : ""}`}
          onClick={() => setTab("customers")}
        >
          <strong>Customer database</strong>
          <span>{insights ? `${insights.total_customers} customers` : "List, search, profiles"}</span>
        </button>
        <button
          type="button"
          className={`terr-mode-tab ${tab === "insights" ? "terr-mode-tab--active" : ""}`}
          onClick={() => setTab("insights")}
        >
          <strong>CRM insights</strong>
          <span>Segments, localities, frequency, win-back</span>
        </button>
      </nav>

      {tab === "insights" && (
        insights ? (
          <CrmInsightsView
            insights={insights}
            businessName={profile?.business_name}
            onOpenCustomer={(id) => void openCustomer(id)}
            onFilterSegment={(seg) => {
              setSegment(seg);
              setOffset(0);
              setTab("customers");
            }}
          />
        ) : (
          <p className="muted">Loading insights…</p>
        )
      )}

      {tab === "customers" && (
        <>
          <section className="card ir-filters crm-filters">
            <div className="crm-segchips">
              <button
                type="button"
                className={`crm-segchip ${segment === "all" ? "crm-segchip--active" : ""}`}
                onClick={() => { setSegment("all"); setOffset(0); }}
              >
                All <b>{insights?.total_customers ?? total}</b>
              </button>
              {SEGMENT_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`crm-segchip crm-segchip--${key} ${segment === key ? "crm-segchip--active" : ""}`}
                  title={SEGMENT_META[key].hint}
                  onClick={() => { setSegment(key); setOffset(0); }}
                >
                  {segmentLabel(key)} <b>{segmentCounts.get(key) ?? 0}</b>
                </button>
              ))}
            </div>
            <div className="ir-filters__row">
              <label className="field ir-filter-field crm-search">
                <span>Search</span>
                <input
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  placeholder="Name, mobile, locality or tag"
                />
              </label>
              <label className="field ir-filter-field">
                <span>Sort by</span>
                <select value={sort} onChange={(e) => { setSort(e.target.value); setOffset(0); }}>
                  <option value="last_visit">Last visit (recent first)</option>
                  <option value="visits">Most visits</option>
                  <option value="spend">Highest spend</option>
                  <option value="name">Name A–Z</option>
                  <option value="created">Recently added</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card ir-table-card">
            <div className="table-wrap">
              <table className="data-table ir-table crm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Locality</th>
                    <th className="terr-num">Visits</th>
                    <th className="terr-num">Total spend</th>
                    <th className="terr-num">Avg bill</th>
                    <th>Last visit</th>
                    <th>Segment</th>
                    <th className="terr-num">Khata</th>
                    <th>Occasions</th>
                    <th className="ir-actions-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={10} className="muted ir-empty-cell">Loading…</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="muted ir-empty-cell">
                        {q || segment !== "all"
                          ? "No customers match these filters."
                          : "No customers yet. Save a mobile number on any bill, or click “Import from past bills”."}
                      </td>
                    </tr>
                  )}
                  {rows.map((c) => (
                    <tr key={c.id} className="pur-row" onClick={() => void openCustomer(c.id)}>
                      <td>
                        <div className="crm-cell-id">
                          <span className={`crm-avatar crm-avatar--sm crm-avatar--${c.segment}`}>{initials(c.name, c.phone)}</span>
                          <div>
                            <strong>{c.name || "Guest"}</strong>
                            <div className="muted">{c.phone ?? "no mobile"}</div>
                            {c.tags.length > 0 && (
                              <div className="crm-tagrow">
                                {c.tags.slice(0, 3).map((t) => <span key={t} className="crm-tag">{t}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{c.locality ?? <span className="muted">—</span>}</td>
                      <td className="terr-num"><strong>{c.visit_count}</strong></td>
                      <td className="terr-num">{inr(c.total_spend_inr)}</td>
                      <td className="terr-num">{c.visit_count ? inr(c.avg_ticket_inr) : "—"}</td>
                      <td>
                        {daysAgoLabel(c.days_since_last_visit)}
                        {c.last_visit_at && <div className="muted">{fmtDate(c.last_visit_at)}</div>}
                      </td>
                      <td>
                        <span className={`crm-seg crm-seg--${c.segment}`} title={SEGMENT_META[c.segment].hint}>
                          {segmentLabel(c.segment)}
                        </span>
                      </td>
                      <td className={`terr-num ${Number(c.khata_due_inr) > 0 ? "crm-due" : "muted"}`}>
                        {Number(c.khata_due_inr) > 0 ? inr(c.khata_due_inr) : "—"}
                      </td>
                      <td className="crm-occ-cell">
                        {c.birthday && <span title={`Birthday ${fmtDate(c.birthday)}`}>🎂 {c.birthday.slice(5).replace("-", "/")}</span>}
                        {c.anniversary && <span title={`Anniversary ${fmtDate(c.anniversary)}`}>💍 {c.anniversary.slice(5).replace("-", "/")}</span>}
                        {!c.birthday && !c.anniversary && <span className="muted">—</span>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ir-row-actions">
                          <button type="button" className="ir-icon-btn" onClick={() => void openCustomer(c.id)}>
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="ir-table-footer muted crm-pager">
              <span>
                Showing {pageStart}–{pageEnd} of {total}
              </span>
              <span className="crm-pager__btns">
                <button type="button" className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                  ← Prev
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
                  Next →
                </button>
              </span>
            </footer>
          </section>
        </>
      )}

      <CustomerCreateModal open={createOpen} saving={saving} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />

      {viewId && (
        <CustomerDetailModal
          customer={viewCustomer}
          loading={viewLoading}
          saving={saving}
          canDelete={canDelete}
          businessName={profile?.business_name}
          onClose={closeCustomer}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
