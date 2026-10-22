import { useState } from "react";
import { createBillRefund, openBillInvoice } from "../../../api/owner";
import { OwnerApiError } from "../../../api/ownerClient";
import type { PosBillDetail } from "../../../types/owner";
import { fmt } from "./posUtils";

type Props = {
  detail: PosBillDetail;
  outletId: string;
  canRefund: boolean;
  onClose: () => void;
  onRefunded?: () => void;
};

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function lineLabel(line: PosBillDetail["lines"][0]): string {
  const base = line.variation_name ? `${line.item_name} (${line.variation_name})` : line.item_name;
  const addons =
    line.addons?.length > 0
      ? ` + ${line.addons.map((a) => `${a.name} ₹${a.price}`).join(", ")}`
      : "";
  return `${base}${addons}`;
}

export function PosBillDetailModal({ detail, outletId, canRefund, onClose, onRefunded }: Props) {
  const { bill } = detail;
  const activeLines = detail.lines.filter((l) => l.status !== "cancelled");
  const [refundAmt, setRefundAmt] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundPin, setRefundPin] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  const refunded = parseFloat(bill.refunded_total ?? "0") || 0;
  const remaining = parseFloat(bill.grand_total) - refunded;

  const submitRefund = async () => {
    setRefunding(true);
    setRefundError(null);
    try {
      await createBillRefund(outletId, bill.id, {
        amount: parseFloat(refundAmt) || 0,
        method: "cash",
        reason: refundReason,
        manager_approval_pin: refundPin || undefined,
      });
      onRefunded?.();
      onClose();
    } catch (e) {
      setRefundError(e instanceof OwnerApiError ? e.message : "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal pp-bill-detail"
        role="dialog"
        aria-labelledby="bill-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pp-bill-detail__head">
          <div>
            <h2 id="bill-detail-title">
              {bill.invoice_code ? `Invoice ${bill.invoice_code}` : `Bill #${bill.bill_number}`}
            </h2>
            <p className="muted pp-bill-detail__sub">
              Order #{detail.order_number} · Settled {formatDt(detail.settled_at)}
            </p>
          </div>
          <button type="button" className="pp-bill-detail__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <section className="pp-bill-detail__meta">
          {detail.table_label && <span><strong>Table:</strong> {detail.table_label}</span>}
          {detail.customer_name && <span><strong>Customer:</strong> {detail.customer_name}</span>}
          {refunded > 0 && <span><strong>Refunded:</strong> {fmt(String(refunded))}</span>}
        </section>

        <section className="pp-bill-detail__section">
          <h3>All items ({activeLines.length})</h3>
          <table className="pp-bill-detail__table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.id} className={line.status === "cancelled" ? "pp-bill-detail__line--void" : ""}>
                  <td>{lineLabel(line)}</td>
                  <td>{line.quantity}</td>
                  <td>{fmt(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pp-bill-detail__totals">
          <dl className="pp-bill-detail__dl">
            <div><dt>Grand total</dt><dd>{fmt(bill.grand_total)}</dd></div>
          </dl>
        </section>

        {canRefund && remaining > 0 && (
          <section className="pp-bill-detail__section">
            <h3>Refund</h3>
            {refundError && <p className="form-error">{refundError}</p>}
            <div className="pp-bill-detail__refund-row">
              <input placeholder={`Amount (max ${remaining})`} value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} />
              <input placeholder="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              <input placeholder="Manager PIN if asked" type="password" value={refundPin} onChange={(e) => setRefundPin(e.target.value)} />
              <button type="button" className="btn btn-secondary btn-sm" disabled={refunding} onClick={() => void submitRefund()}>
                Issue refund
              </button>
            </div>
          </section>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={() => void openBillInvoice(outletId, bill.id)}>
            GST invoice / Print
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
