import { useEffect, useState } from "react";
import type { PosBill, PosKot, PosOrder, PosOrderLine } from "../../../types/owner";
import { dietStripeClass, fmt } from "./posUtils";

export type CartPanel = "order" | "customer" | "comment" | "pay_later" | "payments";

type Props = {
  panel: CartPanel;
  order: PosOrder;
  kots: PosKot[];
  bill: PosBill | null;
  busy: boolean;
  tableLabel: string;
  areaName: string;
  onQtyChange: (line: PosOrderLine, qty: number) => void;
  onRemoveLine: (line: PosOrderLine) => void;
  onVoidLine: (line: PosOrderLine) => void;
  onSaveOrderDetails: (patch: {
    customer_name?: string | null;
    customer_mobile?: string | null;
    pay_later?: boolean;
    notes?: string | null;
  }) => void;
};

export function PosCartSidePanel({
  panel,
  order,
  kots,
  bill,
  busy,
  tableLabel,
  areaName,
  onQtyChange,
  onRemoveLine,
  onVoidLine,
  onSaveOrderDetails,
}: Props) {
  const [customerName, setCustomerName] = useState(order.customer_name ?? "");
  const [customerMobile, setCustomerMobile] = useState(order.customer_mobile ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [payLater, setPayLater] = useState(order.pay_later ?? false);

  useEffect(() => {
    setCustomerName(order.customer_name ?? "");
    setCustomerMobile(order.customer_mobile ?? "");
    setNotes(order.notes ?? "");
    setPayLater(order.pay_later ?? false);
  }, [order.id, order.customer_name, order.customer_mobile, order.notes, order.pay_later]);

  const formatKotTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (panel === "customer") {
    return (
      <div className="pp-cart-panel">
        <h3 className="pp-cart-panel__title">Customer</h3>
        <label className="field">
          <span>Name</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Guest name"
            disabled={busy}
          />
        </label>
        <label className="field">
          <span>Mobile</span>
          <input
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            placeholder="10-digit mobile"
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() =>
            onSaveOrderDetails({
              customer_name: customerName.trim() || null,
              customer_mobile: customerMobile.trim() || null,
            })
          }
        >
          Save customer
        </button>
      </div>
    );
  }

  if (panel === "comment") {
    return (
      <div className="pp-cart-panel">
        <h3 className="pp-cart-panel__title">Order comment</h3>
        <label className="field">
          <span>Notes for kitchen / reception</span>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => onSaveOrderDetails({ notes: notes.trim() || null })}
        >
          Save comment
        </button>
      </div>
    );
  }

  if (panel === "pay_later") {
    return (
      <div className="pp-cart-panel">
        <h3 className="pp-cart-panel__title">Pay later</h3>
        <p className="muted">Mark if the guest will pay at exit. Table stays active until Save &amp; Settle.</p>
        <label className="field field--checkbox">
          <input
            type="checkbox"
            checked={payLater}
            onChange={(e) => setPayLater(e.target.checked)}
            disabled={busy}
          />
          <span>Will pay later</span>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => onSaveOrderDetails({ pay_later: payLater })}
        >
          Save
        </button>
      </div>
    );
  }

  if (panel === "payments") {
    const paid = bill?.payments ?? [];
    return (
      <div className="pp-cart-panel">
        <h3 className="pp-cart-panel__title">Payments recorded</h3>
        {!bill && <p className="muted">No bill yet. Use Cash / UPI / Card / Part on the toolbar, or Save &amp; Settle.</p>}
        {bill && (
          <>
            <p className="muted">
              Bill #{bill.bill_number} · Total {fmt(bill.grand_total)} · Due {fmt(bill.balance_due ?? bill.grand_total)}
            </p>
            <ul className="pp-pay-list">
              {paid.length === 0 && <li className="muted">No payments yet.</li>}
              {paid.map((p) => (
                <li key={p.id}>
                  <strong>{p.method.toUpperCase()}</strong> {fmt(p.amount)}
                  {p.reference ? <span className="muted"> ({p.reference})</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="pp-cart-head">
        <span className="pp-cart-table-id">{tableLabel}</span>
        <span className="pp-cart-area-tag">{areaName}</span>
        <span className="pp-cart-order-no">#{order.order_number}</span>
        {order.customer_name && <span className="pp-cart-guest">{order.customer_name}</span>}
        {order.pay_later && <span className="pp-cart-pay-later">Pay later</span>}
      </div>
      <div className="pp-cart-cols">
        <span className="pp-cart-cols__items">Items</span>
        <span className="pp-cart-cols__qty">Qty.</span>
        <span className="pp-cart-cols__price">Price</span>
      </div>
      <ul className="pp-cart-lines">
        {order.lines.length === 0 && (
          <li className="pp-cart-empty muted">Tap items on the left to add them here.</li>
        )}
        {order.lines.map((line) => (
          <li
            key={line.id}
            className={`pp-cart-line ${line.status === "cancelled" ? "pp-cart-line--off" : ""} ${dietStripeClass(line.food_type)}`}
          >
            <button
              type="button"
              className="pp-cart-line__x"
              title="Remove item"
              disabled={busy || (line.status !== "pending_kot" && line.status !== "in_kot")}
              onClick={() =>
                line.status === "pending_kot" ? onRemoveLine(line) : onVoidLine(line)
              }
            >
              ×
            </button>
            <div className="pp-cart-line__info">
              <span className="pp-cart-line__name">
                {line.item_name}
                {line.variation_name ? ` (${line.variation_name})` : ""}
              </span>
              {line.addons.length > 0 && (
                <span className="pp-cart-line__addons">
                  + {line.addons.map((a) => a.name).join(", ")}
                </span>
              )}
            </div>
            <div className="pp-cart-line__qty">
              {line.status === "pending_kot" ? (
                <>
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={busy || line.quantity <= 1}
                    onClick={() => onQtyChange(line, line.quantity - 1)}
                  >
                    −
                  </button>
                  <input type="text" readOnly value={line.quantity} aria-label="Quantity" />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={busy}
                    onClick={() => onQtyChange(line, line.quantity + 1)}
                  >
                    +
                  </button>
                </>
              ) : (
                <span className="pp-cart-line__qty-fixed">{line.quantity}</span>
              )}
            </div>
            <span className="pp-cart-line__price">{fmt(line.line_total)}</span>
          </li>
        ))}
      </ul>
      {kots.length > 0 && (
        <div className="pp-kot-history" aria-label="KOT history">
          <span className="pp-kot-history__title">KOTs sent</span>
          <ul className="pp-kot-history__list">
            {kots.map((k) => (
              <li key={k.id}>
                <strong>KOT #{k.kot_number}</strong>
                <span>{formatKotTime(k.created_at)}</span>
                <span className="muted">
                  {(k.lines?.length ?? 0) > 0 ? `${k.lines!.length} item(s)` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
