import { useEffect, useState, type FormEvent } from "react";
import type { PurchaseInvoiceDetail, PurchasePaymentMode } from "../../../types/owner";
import {
  fmtDate,
  fmtDateTime,
  inr,
  isoToday,
  num,
  PAYMENT_MODES,
  paymentModeLabel,
  paymentStatusLabel,
  qty,
} from "./purchaseUtils";

type Props = {
  invoice: PurchaseInvoiceDetail | null;
  loading: boolean;
  saving: boolean;
  businessName: string | null | undefined;
  outletName: string | null | undefined;
  onClose: () => void;
  onAddPayment: (body: {
    amount_inr: number;
    payment_mode: PurchasePaymentMode;
    paid_on: string;
    reference: string | null;
  }) => Promise<void>;
  onApplyStock: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function PurchaseInvoiceModal({
  invoice,
  loading,
  saving,
  businessName,
  outletName,
  onClose,
  onAddPayment,
  onApplyStock,
  onDelete,
}: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PurchasePaymentMode>("cash");
  const [payDate, setPayDate] = useState(isoToday);
  const [payRef, setPayRef] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    setPayOpen(false);
    setPayAmount(invoice ? invoice.balance_inr : "");
    setPayMode("cash");
    setPayDate(isoToday());
    setPayRef("");
    setPayError(null);
  }, [invoice?.id, invoice?.balance_inr, invoice]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const amount = num(payAmount);
    if (amount <= 0) {
      setPayError("Enter an amount greater than 0.");
      return;
    }
    if (amount > num(invoice.balance_inr) + 0.005) {
      setPayError(`Only ${inr(invoice.balance_inr)} is due on this bill.`);
      return;
    }
    setPayError(null);
    await onAddPayment({
      amount_inr: amount,
      payment_mode: payMode,
      paid_on: payDate,
      reference: payRef.trim() || null,
    });
    setPayOpen(false);
  };

  const print = () => window.print();

  return (
    <div className="ir-modal-backdrop pur-invoice-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ir-modal card pur-modal pur-invoice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pur-invoice-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ir-modal__head pur-no-print">
          <div className="ir-modal__head-copy">
            <span className="ir-mode-badge ir-mode-badge--view">Invoice</span>
            <h2 id="pur-invoice-title">
              {invoice ? `Purchase from ${invoice.vendor_name}` : "Purchase invoice"}
            </h2>
            {invoice && (
              <p className="ir-modal__subtitle">
                {invoice.invoice_number ? `Invoice #${invoice.invoice_number} · ` : ""}
                {fmtDate(invoice.invoice_date)}
                {invoice.created_by_name ? ` · recorded by ${invoice.created_by_name}` : ""}
              </p>
            )}
          </div>
          <div className="pur-invoice-head-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={print} disabled={!invoice}>
              Print / PDF
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <div className="ir-modal__body pur-invoice-body">
          {loading && <p className="muted">Loading invoice…</p>}
          {!loading && invoice && (
            <article className="pur-invoice-sheet">
              <header className="pur-sheet-head">
                <div>
                  <p className="pur-sheet-label">Purchased by</p>
                  <h3>{businessName ?? "Your business"}</h3>
                  {outletName && <p className="muted">{outletName}</p>}
                </div>
                <div className="pur-sheet-head__right">
                  <p className="pur-sheet-label">Purchase invoice</p>
                  <p className="pur-sheet-strong">{invoice.invoice_number ? `#${invoice.invoice_number}` : "No vendor bill no."}</p>
                  <p className="muted">Dated {fmtDate(invoice.invoice_date)}</p>
                  {invoice.po_reference && <p className="muted">PO: {invoice.po_reference}</p>}
                </div>
              </header>

              <section className="pur-sheet-vendor">
                <p className="pur-sheet-label">Vendor</p>
                <p className="pur-sheet-strong">{invoice.vendor_name}</p>
                {(invoice.vendor_phone || invoice.vendor_gstin) && (
                  <p className="muted">
                    {invoice.vendor_phone ?? ""}
                    {invoice.vendor_phone && invoice.vendor_gstin ? " · " : ""}
                    {invoice.vendor_gstin ? `GSTIN ${invoice.vendor_gstin}` : ""}
                  </p>
                )}
              </section>

              <div className="ir-ing-table-wrap">
                <table className="ir-ing-table pur-sheet-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th className="terr-num">Qty</th>
                      <th className="terr-num">Rate</th>
                      <th className="terr-num">Tax</th>
                      <th className="terr-num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, idx) => (
                      <tr key={line.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{line.item_name}</strong>
                          {line.inventory_item_id && (
                            <span className="pur-stock-tag">stock</span>
                          )}
                        </td>
                        <td className="terr-num">{qty(line.quantity)} {line.unit}</td>
                        <td className="terr-num">{inr(line.unit_price_inr)}</td>
                        <td className="terr-num">{num(line.tax_percent) > 0 ? `${qty(line.tax_percent)}%` : "—"}</td>
                        <td className="terr-num">{inr(line.line_total_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pur-sheet-bottom">
                <div className="pur-sheet-notes">
                  {invoice.notes && (
                    <>
                      <p className="pur-sheet-label">Notes</p>
                      <p className="ir-notes-block">{invoice.notes}</p>
                    </>
                  )}
                  <p className="pur-sheet-label">Stock</p>
                  <p className="muted">
                    {invoice.stock_applied
                      ? "Quantities added to raw material stock."
                      : "Stock not yet added for this bill."}
                  </p>
                </div>
                <dl className="pur-summary pur-summary--sheet">
                  <div><dt>Subtotal</dt><dd>{inr(invoice.subtotal_inr)}</dd></div>
                  <div><dt>Tax</dt><dd>{inr(invoice.tax_inr)}</dd></div>
                  {num(invoice.discount_inr) > 0 && <div><dt>Discount</dt><dd>- {inr(invoice.discount_inr)}</dd></div>}
                  {num(invoice.other_charges_inr) > 0 && <div><dt>Other charges</dt><dd>{inr(invoice.other_charges_inr)}</dd></div>}
                  <div className="pur-summary__total"><dt>Total</dt><dd>{inr(invoice.total_inr)}</dd></div>
                  <div><dt>Paid</dt><dd>{inr(invoice.paid_inr)}</dd></div>
                  <div className={num(invoice.balance_inr) > 0 ? "pur-summary__due" : ""}>
                    <dt>Balance</dt><dd>{inr(invoice.balance_inr)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`pur-pay-pill pur-pay-pill--${invoice.payment_status}`}>
                        {paymentStatusLabel(invoice.payment_status)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <section className="pur-payments">
                <div className="ir-section__head">
                  <h3>Payments</h3>
                  <span className="ir-section__count">{invoice.payments.length}</span>
                </div>
                {invoice.payments.length === 0 ? (
                  <p className="ir-empty-note">No payments recorded.</p>
                ) : (
                  <div className="ir-ing-table-wrap">
                    <table className="ir-ing-table">
                      <thead>
                        <tr>
                          <th>Paid on</th>
                          <th>Mode</th>
                          <th>Reference</th>
                          <th className="terr-num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.payments.map((p) => (
                          <tr key={p.id}>
                            <td>{fmtDate(p.paid_on)}</td>
                            <td>{paymentModeLabel(p.payment_mode)}</td>
                            <td>{p.reference ?? p.notes ?? "—"}</td>
                            <td className="terr-num">{inr(p.amount_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="pur-sheet-footer muted">
                Recorded {fmtDateTime(invoice.created_at)} in KhataBabu.
              </p>
            </article>
          )}

          {invoice && payOpen && (
            <form className="ir-section pur-pay-form pur-no-print" onSubmit={submitPayment}>
              <div className="ir-section__head">
                <h3>Record payment</h3>
              </div>
              {payError && <p className="form-error ir-form-error">{payError}</p>}
              <div className="ir-grid">
                <label className="field">
                  <span>Amount ₹</span>
                  <input value={payAmount} inputMode="decimal" autoFocus onChange={(e) => setPayAmount(e.target.value)} />
                </label>
                <label className="field">
                  <span>Mode</span>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value as PurchasePaymentMode)}>
                    {PAYMENT_MODES.filter((m) => m.id !== "credit").map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Paid on</span>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </label>
                <label className="field">
                  <span>Reference <em>(optional)</em></span>
                  <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / cheque no." />
                </label>
              </div>
              <div className="ir-modal__foot pur-pay-form__foot">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPayOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  Save payment
                </button>
              </div>
            </form>
          )}
        </div>

        {invoice && (
          <footer className="ir-modal__foot pur-invoice-foot pur-no-print">
            <button
              type="button"
              className="ir-remove-btn"
              disabled={saving}
              onClick={() => {
                if (window.confirm("Delete this purchase bill? Added stock will be reversed.")) void onDelete();
              }}
            >
              Delete bill
            </button>
            <span className="pur-foot-spacer" />
            {!invoice.stock_applied && invoice.lines.some((l) => l.inventory_item_id) && (
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void onApplyStock()}>
                Add to stock
              </button>
            )}
            {num(invoice.balance_inr) > 0 && !payOpen && (
              <button type="button" className="btn btn-primary" onClick={() => setPayOpen(true)}>
                Record payment
              </button>
            )}
            {num(invoice.balance_inr) <= 0 && (
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
