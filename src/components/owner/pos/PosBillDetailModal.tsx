import type { PosBillDetail } from "../../../types/owner";
import { fmt } from "./posUtils";

type Props = {
  detail: PosBillDetail;
  onClose: () => void;
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

export function PosBillDetailModal({ detail, onClose }: Props) {
  const { bill } = detail;
  const activeLines = detail.lines.filter((l) => l.status !== "cancelled");

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
            <h2 id="bill-detail-title">Bill #{bill.bill_number}</h2>
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
          {detail.customer_mobile && <span><strong>Mobile:</strong> {detail.customer_mobile}</span>}
          {detail.guest_count != null && <span><strong>Guests:</strong> {detail.guest_count}</span>}
          {detail.pay_later && <span className="pp-bill-detail__tag">Pay later</span>}
          <span><strong>Order opened:</strong> {formatDt(detail.order_created_at)}</span>
          <span><strong>Settled:</strong> {formatDt(detail.settled_at)}</span>
          {detail.order_notes && <span><strong>Notes:</strong> {detail.order_notes}</span>}
        </section>

        <section className="pp-bill-detail__section">
          <h3>Kitchen tickets ({detail.kots.length})</h3>
          {detail.kots.length === 0 ? (
            <p className="muted">No KOTs recorded for this order.</p>
          ) : (
            <ul className="pp-bill-detail__kot-list">
              {detail.kots.map((kot) => (
                <li key={kot.id} className="pp-bill-detail__kot">
                  <div className="pp-bill-detail__kot-head">
                    <strong>KOT #{kot.kot_number}</strong>
                    <span className="muted">{formatDt(kot.created_at)}</span>
                    <span className="pp-bill-detail__kot-status">{kot.status}</span>
                  </div>
                  {kot.notes && <p className="muted pp-bill-detail__kot-notes">{kot.notes}</p>}
                  <ul>
                    {(kot.lines ?? []).map((kl) => (
                      <li key={kl.id}>
                        {kl.quantity}× {kl.variation_name ? `${kl.item_name} (${kl.variation_name})` : kl.item_name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pp-bill-detail__section">
          <h3>All items ({activeLines.length})</h3>
          <table className="pp-bill-detail__table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Add-ons</th>
                <th>Line total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.id} className={line.status === "cancelled" ? "pp-bill-detail__line--void" : ""}>
                  <td>{lineLabel(line)}</td>
                  <td>{line.quantity}</td>
                  <td>{fmt(line.unit_price)}</td>
                  <td>{line.addons_total !== "0" && line.addons_total !== "0.00" ? fmt(line.addons_total) : "—"}</td>
                  <td>{fmt(line.line_total)}</td>
                  <td>{line.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pp-bill-detail__totals">
          <h3>Bill summary</h3>
          <dl className="pp-bill-detail__dl">
            <div><dt>Subtotal</dt><dd>{fmt(bill.subtotal)}</dd></div>
            <div><dt>Discount ({bill.discount_percent}%)</dt><dd>− {fmt(bill.discount_amount)}</dd></div>
            <div><dt>Tax ({bill.tax_percent}%)</dt><dd>{fmt(bill.tax_amount)}</dd></div>
            <div><dt>Round off</dt><dd>{fmt(bill.round_off)}</dd></div>
            <div className="pp-bill-detail__grand"><dt>Grand total</dt><dd>{fmt(bill.grand_total)}</dd></div>
          </dl>
        </section>

        <section className="pp-bill-detail__section">
          <h3>Payments</h3>
          {bill.payments.length === 0 ? (
            <p className="muted">No payment rows stored.</p>
          ) : (
            <ul className="pp-bill-detail__payments">
              {bill.payments.map((p) => (
                <li key={p.id}>
                  <strong>{p.method.toUpperCase()}</strong> {fmt(p.amount)}
                  {p.reference && <span className="muted"> · {p.reference}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
