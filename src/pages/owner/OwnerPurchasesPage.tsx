import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPurchasePayment,
  applyPurchaseStock,
  createPurchase,
  deletePurchase,
  getPurchase,
  listInventoryItems,
  listPurchases,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { PurchaseCreateModal } from "../../components/owner/purchases/PurchaseCreateModal";
import { PurchaseInvoiceModal } from "../../components/owner/purchases/PurchaseInvoiceModal";
import {
  fmtDate,
  inr,
  isoDaysAgo,
  isoToday,
  num,
  paymentStatusLabel,
} from "../../components/owner/purchases/purchaseUtils";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type {
  InventoryItem,
  PurchaseInvoiceCreate,
  PurchaseInvoiceDetail,
  PurchaseListResponse,
  PurchasePaymentMode,
} from "../../types/owner";

type Preset = "7d" | "30d" | "month" | "all" | "custom";

function startOfMonthIso(): string {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const tz = new Date(first.getTime() - first.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function OwnerPurchasesPage() {
  const { outlet } = useOwnerOutlet();
  const { profile } = useOwnerAuth();

  const [fromDate, setFromDate] = useState(() => isoDaysAgo(30));
  const [toDate, setToDate] = useState(isoToday);
  const [preset, setPreset] = useState<Preset>("30d");
  const [vendorDraft, setVendorDraft] = useState("");
  const [invoiceDraft, setInvoiceDraft] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [applied, setApplied] = useState({ vendor: "", invoiceNumber: "" });

  const [data, setData] = useState<PurchaseListResponse | null>(null);
  const [rawMaterials, setRawMaterials] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoiceDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const [list, materials] = await Promise.all([
        listPurchases(outlet.id, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          vendor: applied.vendor || undefined,
          invoiceNumber: applied.invoiceNumber || undefined,
          paymentStatus,
        }),
        listInventoryItems(outlet.id, "raw").catch(() => [] as InventoryItem[]),
      ]);
      setData(list);
      setRawMaterials(materials);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load purchases");
    } finally {
      setLoading(false);
    }
  }, [outlet, fromDate, toDate, applied, paymentStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInvoice = useCallback(
    async (invoiceId: string) => {
      if (!outlet) return;
      setViewId(invoiceId);
      setViewLoading(true);
      try {
        setViewInvoice(await getPurchase(outlet.id, invoiceId));
      } catch (err) {
        setError(err instanceof OwnerApiError ? err.message : "Could not load invoice");
        setViewId(null);
      } finally {
        setViewLoading(false);
      }
    },
    [outlet],
  );

  const closeInvoice = () => {
    setViewId(null);
    setViewInvoice(null);
  };

  const applyPreset = (next: Preset) => {
    setPreset(next);
    if (next === "7d") {
      setFromDate(isoDaysAgo(7));
      setToDate(isoToday());
    } else if (next === "30d") {
      setFromDate(isoDaysAgo(30));
      setToDate(isoToday());
    } else if (next === "month") {
      setFromDate(startOfMonthIso());
      setToDate(isoToday());
    } else if (next === "all") {
      setFromDate("");
      setToDate("");
    }
  };

  const search = () => setApplied({ vendor: vendorDraft.trim(), invoiceNumber: invoiceDraft.trim() });
  const clear = () => {
    setVendorDraft("");
    setInvoiceDraft("");
    setPaymentStatus("all");
    setApplied({ vendor: "", invoiceNumber: "" });
    applyPreset("30d");
  };

  const handleCreate = async (body: PurchaseInvoiceCreate) => {
    if (!outlet) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createPurchase(outlet.id, body);
      setCreateOpen(false);
      await load();
      setViewId(created.id);
      setViewInvoice(created);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save purchase bill");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (body: {
    amount_inr: number;
    payment_mode: PurchasePaymentMode;
    paid_on: string;
    reference: string | null;
  }) => {
    if (!outlet || !viewId) return;
    setSaving(true);
    try {
      setViewInvoice(await addPurchasePayment(outlet.id, viewId, body));
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyStock = async () => {
    if (!outlet || !viewId) return;
    setSaving(true);
    try {
      setViewInvoice(await applyPurchaseStock(outlet.id, viewId));
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not add stock");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!outlet || !viewId) return;
    setSaving(true);
    try {
      await deletePurchase(outlet.id, viewId);
      closeInvoice();
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not delete bill");
    } finally {
      setSaving(false);
    }
  };

  const totals = data?.totals;
  const invoices = data?.invoices ?? [];
  const vendors = data?.vendors ?? [];

  const periodLabel = useMemo(() => {
    if (!fromDate && !toDate) return "All time";
    if (fromDate && toDate) return `${fmtDate(fromDate)} → ${fmtDate(toDate)}`;
    return "Selected period";
  }, [fromDate, toDate]);

  if (!outlet) return <p className="muted">Select an outlet to see purchases.</p>;

  return (
    <div className="page pur-page">
      <header className="ir-page__head">
        <div>
          <h1>Purchases</h1>
          <p className="muted">
            Every vendor bill for <strong>{outlet.name}</strong> — paneer, oil, packaging. Open a row to
            see the invoice, pay the vendor, or add stock.
          </p>
        </div>
        <div className="ir-page__head-actions">
          <span className="terr-hero__badge">{periodLabel}</span>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + Create new
          </button>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="card ir-filters">
        <div className="terr-presets pur-presets">
          {(
            [
              ["7d", "Last 7 days"],
              ["30d", "Last 30 days"],
              ["month", "This month"],
              ["all", "All time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`terr-preset-btn ${preset === key ? "terr-preset-btn--active" : ""}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ir-filters__row">
          <label className="field ir-filter-field">
            <span>Start date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPreset("custom");
                setFromDate(e.target.value);
              }}
            />
          </label>
          <label className="field ir-filter-field">
            <span>End date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPreset("custom");
                setToDate(e.target.value);
              }}
            />
          </label>
          <label className="field ir-filter-field">
            <span>From (vendor)</span>
            <input
              list="pur-filter-vendors"
              value={vendorDraft}
              onChange={(e) => setVendorDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="All vendors"
            />
            <datalist id="pur-filter-vendors">
              {vendors.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <label className="field ir-filter-field">
            <span>Invoice no.</span>
            <input
              value={invoiceDraft}
              onChange={(e) => setInvoiceDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Any"
            />
          </label>
          <label className="field ir-filter-field">
            <span>Payment</span>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <div className="pur-filter-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={search}>
              Search
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="pur-stats">
        <div className="pur-stat">
          <span>Total purchase invoice amount recorded</span>
          <strong>{totals ? inr(totals.total_inr) : "—"}</strong>
          <small className="muted">{totals?.invoice_count ?? 0} bills</small>
        </div>
        <div className={`pur-stat ${totals && num(totals.outstanding_inr) > 0 ? "pur-stat--due" : ""}`}>
          <span>Total outstanding payment</span>
          <strong>{totals ? inr(totals.outstanding_inr) : "—"}</strong>
          <small className="muted">Paid {totals ? inr(totals.paid_inr) : "—"}</small>
        </div>
        <div className="pur-stat">
          <span>Tax paid to sellers</span>
          <strong>{totals ? inr(totals.tax_inr) : "—"}</strong>
          <small className="muted">GST on bills in period</small>
        </div>
      </section>

      <section className="card ir-table-card">
        <div className="table-wrap">
          <table className="data-table ir-table pur-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Invoice date</th>
                <th>Invoice number</th>
                <th>PO reference</th>
                <th className="terr-num pur-col-total">Total (₹)</th>
                <th>Payment</th>
                <th>Created by</th>
                <th>Status</th>
                <th className="ir-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="muted ir-empty-cell">Loading…</td>
                </tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted ir-empty-cell">
                    No purchase bills in this period. Click <strong>Create new</strong> to record your first vendor bill.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="pur-row" onClick={() => void openInvoice(inv.id)}>
                  <td>
                    <strong>{inv.vendor_name}</strong>
                    <div className="ir-menu-link muted">{inv.line_count} item(s)</div>
                  </td>
                  <td>{fmtDate(inv.invoice_date)}</td>
                  <td>{inv.invoice_number ?? <span className="muted">—</span>}</td>
                  <td>{inv.po_reference ?? <span className="muted">—</span>}</td>
                  <td className="terr-num pur-col-total">
                    <strong>{inr(inv.total_inr)}</strong>
                  </td>
                  <td>
                    <div className="pur-pay-cell">
                      <span>{inr(inv.paid_inr)}</span>
                      <span className={`pur-pay-pill pur-pay-pill--${inv.payment_status}`}>
                        {paymentStatusLabel(inv.payment_status)}
                      </span>
                    </div>
                  </td>
                  <td>{inv.created_by_name ?? <span className="muted">—</span>}</td>
                  <td>
                    <span className="pur-status-pill">Saved</span>
                    {inv.stock_applied && <span className="pur-stock-tag">stock</span>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="ir-row-actions">
                      <button type="button" className="ir-icon-btn" onClick={() => void openInvoice(inv.id)}>
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="ir-table-footer muted">
          Showing {invoices.length} bill(s) · {periodLabel}
        </footer>
      </section>

      <PurchaseCreateModal
        open={createOpen}
        rawMaterials={rawMaterials}
        vendors={vendors}
        saving={saving}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {viewId && (
        <PurchaseInvoiceModal
          invoice={viewInvoice}
          loading={viewLoading}
          saving={saving}
          businessName={profile?.business_name}
          outletName={outlet.name}
          onClose={closeInvoice}
          onAddPayment={handleAddPayment}
          onApplyStock={handleApplyStock}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
