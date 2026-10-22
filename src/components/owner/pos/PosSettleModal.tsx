import type { DiscountPolicy, PaymentMethod, PosBill } from "../../../types/owner";
import { fmt, money } from "./posUtils";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
];

type PaymentRow = { method: PaymentMethod; amount: string; reference: string };

type Props = {
  bill: PosBill;
  tableLabel: string;
  gstHint: string | null;
  busy: boolean;
  discountPercent: string;
  discountAmount: string;
  taxPercent: string;
  tipAmount: string;
  payments: PaymentRow[];
  onDiscountPercent: (v: string) => void;
  onDiscountAmount: (v: string) => void;
  onTaxPercent: (v: string) => void;
  onTipAmount: (v: string) => void;
  onApplyAdjustments: () => void;
  onPaymentsChange: (rows: PaymentRow[]) => void;
  onClose: () => void;
  onComplete: () => void;
  discountPolicy: DiscountPolicy | null;
  managerPin: string;
  onManagerPin: (v: string) => void;
};

export function PosSettleModal({
  bill,
  tableLabel,
  gstHint,
  busy,
  discountPercent,
  discountAmount,
  taxPercent,
  tipAmount,
  payments,
  onDiscountPercent,
  onDiscountAmount,
  onTaxPercent,
  onTipAmount,
  onApplyAdjustments,
  onPaymentsChange,
  onClose,
  onComplete,
  discountPolicy,
  managerPin,
  onManagerPin,
}: Props) {
  const discPct = parseFloat(discountPercent) || 0;
  const workerCap = discountPolicy ? parseFloat(discountPolicy.worker_max_discount_percent) : 100;
  const needsPin = discountPolicy && discPct > workerCap && discountPolicy.manager_pin_configured;

  const paymentTotal = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const billDue = money(bill.balance_due ?? bill.grand_total);
  const paidOk = money(paymentTotal) === billDue;

  const updatePayment = (idx: number, patch: Partial<PaymentRow>) => {
    const next = [...payments];
    next[idx] = { ...next[idx], ...patch };
    onPaymentsChange(next);
  };

  return (
    <div className="modal-backdrop pos-settle-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pos-settle-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-settle-title"
      >
        <header className="pos-settle-sheet__head">
          <div>
            <p className="pos-settle-sheet__eyebrow">{tableLabel}</p>
            <h2 id="pos-settle-title">Collect payment</h2>
            <p className="pos-settle-sheet__meta">Bill #{bill.bill_number}</p>
          </div>
          <button type="button" className="pos-settle-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="pos-settle-sheet__body">
          <section className="pos-settle-block">
            <h3 className="pos-settle-block__title">Discount &amp; tax</h3>
            <div className="pos-settle-fields">
              <label className="field">
                <span>Discount %</span>
                <input
                  value={discountPercent}
                  onChange={(e) => {
                    onDiscountPercent(e.target.value);
                    onDiscountAmount("0");
                  }}
                  onBlur={onApplyAdjustments}
                />
              </label>
              <label className="field">
                <span>Discount ₹</span>
                <input
                  value={discountAmount}
                  onChange={(e) => {
                    onDiscountAmount(e.target.value);
                    onDiscountPercent("0");
                  }}
                  onBlur={onApplyAdjustments}
                />
              </label>
              <label className="field">
                <span>Tax %</span>
                <input value={taxPercent} onChange={(e) => onTaxPercent(e.target.value)} onBlur={onApplyAdjustments} />
              </label>
              <label className="field">
                <span>Tip ₹</span>
                <input value={tipAmount} onChange={(e) => onTipAmount(e.target.value)} onBlur={onApplyAdjustments} />
              </label>
            </div>
            {gstHint && <p className="pos-settle-gst-hint">{gstHint}</p>}
            {needsPin && (
              <label className="field pos-settle-manager-pin">
                <span>Manager PIN (discount above {workerCap}%)</span>
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => onManagerPin(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
          </section>

          <section className="pos-settle-block pos-settle-summary">
            <h3 className="pos-settle-block__title">Bill summary</h3>
            <dl className="pos-bill-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>{fmt(bill.subtotal)}</dd>
              </div>
              {money(bill.discount_amount) > 0 && (
                <div>
                  <dt>Discount</dt>
                  <dd>−{fmt(bill.discount_amount)}</dd>
                </div>
              )}
              {money(bill.tax_amount) > 0 && (
                <div>
                  <dt>Tax ({bill.tax_percent}%)</dt>
                  <dd>{fmt(bill.tax_amount)}</dd>
                </div>
              )}
              {(bill.cgst_amount || bill.sgst_amount) && (
                <div>
                  <dt>CGST / SGST</dt>
                  <dd>
                    {fmt(bill.cgst_amount ?? "0")} / {fmt(bill.sgst_amount ?? "0")}
                  </dd>
                </div>
              )}
              {money(bill.tip_amount ?? "0") > 0 && (
                <div>
                  <dt>Tip</dt>
                  <dd>{fmt(bill.tip_amount ?? "0")}</dd>
                </div>
              )}
              {money(bill.round_off ?? "0") !== 0 && (
                <div>
                  <dt>Round off</dt>
                  <dd>{fmt(bill.round_off ?? "0")}</dd>
                </div>
              )}
              <div className="pos-bill-summary__grand">
                <dt>Grand total</dt>
                <dd>{fmt(bill.grand_total)}</dd>
              </div>
            </dl>
            {parseFloat(bill.amount_paid ?? "0") > 0 && (
              <p className="muted pos-settle-paid-so-far">
                Already paid {fmt(bill.amount_paid!)} · balance {fmt(bill.balance_due ?? bill.grand_total)}
              </p>
            )}
          </section>

          <section className="pos-settle-block">
            <h3 className="pos-settle-block__title">Payment</h3>
            {payments.map((p, idx) => (
              <div key={idx} className="pos-settle-pay-row">
                <select
                  value={p.method}
                  onChange={(e) => updatePayment(idx, { method: e.target.value as PaymentMethod })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={p.amount}
                  onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Ref (optional)"
                  value={p.reference}
                  onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm pos-settle-split"
              onClick={() => onPaymentsChange([...payments, { method: "cash", amount: "", reference: "" }])}
            >
              + Split payment
            </button>
            <p className={paidOk ? "pos-settle-pay-status" : "pos-settle-pay-status pos-settle-pay-status--bad"}>
              Paying <strong>{fmt(paymentTotal)}</strong> of <strong>{fmt(billDue)}</strong> due
            </p>
          </section>
        </div>

        <footer className="pos-settle-sheet__foot">
          <button type="button" className="pos-picker-btn pos-picker-btn--ghost" onClick={onClose}>
            Continue ordering
          </button>
          <button
            type="button"
            className="pos-picker-btn pos-picker-btn--primary"
            disabled={busy || !paidOk}
            onClick={onComplete}
          >
            Complete &amp; free table
          </button>
        </footer>
      </div>
    </div>
  );
}
