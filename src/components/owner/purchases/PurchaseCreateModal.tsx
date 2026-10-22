import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  InventoryItem,
  PurchaseInvoiceCreate,
  PurchasePaymentMode,
} from "../../../types/owner";
import { inr, isoToday, num, PAYMENT_MODES, PURCHASE_UNITS } from "./purchaseUtils";

type LineDraft = {
  key: string;
  inventory_item_id: string;
  item_name: string;
  quantity: string;
  unit: string;
  unit_price_inr: string;
  tax_percent: string;
};

type Props = {
  open: boolean;
  rawMaterials: InventoryItem[];
  vendors: string[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (body: PurchaseInvoiceCreate) => Promise<void>;
};

const newLine = (): LineDraft => ({
  key: crypto.randomUUID(),
  inventory_item_id: "",
  item_name: "",
  quantity: "",
  unit: "kg",
  unit_price_inr: "",
  tax_percent: "0",
});

export function PurchaseCreateModal({ open, rawMaterials, vendors, saving, onClose, onSubmit }: Props) {
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(isoToday);
  const [poReference, setPoReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [otherCharges, setOtherCharges] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState<PurchasePaymentMode>("cash");
  const [notes, setNotes] = useState("");
  const [applyStock, setApplyStock] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVendorName("");
    setVendorPhone("");
    setVendorGstin("");
    setInvoiceNumber("");
    setInvoiceDate(isoToday());
    setPoReference("");
    setDiscount("");
    setOtherCharges("");
    setPaid("");
    setPaymentMode("cash");
    setNotes("");
    setApplyStock(true);
    setLines([newLine()]);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of lines) {
      const base = num(line.quantity) * num(line.unit_price_inr);
      subtotal += base;
      tax += (base * num(line.tax_percent)) / 100;
    }
    const total = Math.max(0, subtotal + tax - num(discount) + num(otherCharges));
    const paidAmt = Math.min(num(paid), total);
    return { subtotal, tax, total, paid: paidAmt, balance: Math.max(0, total - paidAmt) };
  }, [lines, discount, otherCharges, paid]);

  if (!open) return null;

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const pickMaterial = (key: string, materialId: string) => {
    const material = rawMaterials.find((m) => m.id === materialId);
    updateLine(key, {
      inventory_item_id: materialId,
      item_name: material ? material.name : "",
      unit: material ? material.unit : "kg",
      unit_price_inr: material?.cost_per_unit ?? "",
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }
    const filled = lines.filter((l) => l.item_name.trim() && num(l.quantity) > 0);
    if (filled.length === 0) {
      setError("Add at least one item with a quantity (e.g. Paneer 0.4 kg).");
      return;
    }
    if (num(paid) > totals.total) {
      setError("Paid amount cannot exceed the bill total.");
      return;
    }
    await onSubmit({
      vendor_name: vendorName.trim(),
      vendor_phone: vendorPhone.trim() || null,
      vendor_gstin: vendorGstin.trim() || null,
      invoice_number: invoiceNumber.trim() || null,
      invoice_date: invoiceDate,
      po_reference: poReference.trim() || null,
      discount_inr: num(discount),
      other_charges_inr: num(otherCharges),
      paid_inr: num(paid),
      payment_mode: num(paid) > 0 ? paymentMode : null,
      notes: notes.trim() || null,
      apply_stock: applyStock,
      lines: filled.map((l) => ({
        inventory_item_id: l.inventory_item_id || null,
        item_name: l.item_name.trim(),
        quantity: num(l.quantity),
        unit: l.unit || "pcs",
        unit_price_inr: num(l.unit_price_inr),
        tax_percent: num(l.tax_percent),
      })),
    });
  };

  return (
    <div className="ir-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ir-modal card pur-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pur-create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ir-modal__head">
          <div className="ir-modal__head-copy">
            <span className="ir-mode-badge ir-mode-badge--create">New</span>
            <h2 id="pur-create-title">New purchase bill</h2>
            <p className="ir-modal__subtitle">
              Record what you bought from a vendor. Linked raw materials get stock added automatically.
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="ir-form" onSubmit={submit} id="pur-create-form">
          <div className="ir-modal__body">
            {error && <p className="form-error ir-form-error" role="alert">{error}</p>}

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Vendor &amp; bill</h3>
              </div>
              <div className="ir-grid">
                <label className="field">
                  <span>Vendor</span>
                  <input
                    list="pur-vendor-list"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Vikas Traders"
                    autoFocus
                  />
                  <datalist id="pur-vendor-list">
                    {vendors.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </label>
                <label className="field">
                  <span>Invoice date</span>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </label>
                <label className="field">
                  <span>Invoice number <em>(optional)</em></span>
                  <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Vendor bill no." />
                </label>
                <label className="field">
                  <span>PO reference <em>(optional)</em></span>
                  <input value={poReference} onChange={(e) => setPoReference(e.target.value)} />
                </label>
                <label className="field">
                  <span>Vendor phone <em>(optional)</em></span>
                  <input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} inputMode="tel" />
                </label>
                <label className="field">
                  <span>Vendor GSTIN <em>(optional)</em></span>
                  <input value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())} maxLength={15} />
                </label>
              </div>
            </section>

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Items</h3>
                <span className="ir-section__count">{lines.length}</span>
              </div>
              <p className="ir-section__hint">
                Pick a raw material to auto-fill name and unit, or type a free item (packaging, misc).
              </p>
              <div className="pur-lines">
                <div className="pur-line pur-line--head" aria-hidden="true">
                  <span>Raw material</span>
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Rate ₹</span>
                  <span>Tax %</span>
                  <span>Total</span>
                  <span />
                </div>
                {lines.map((line, idx) => {
                  const base = num(line.quantity) * num(line.unit_price_inr);
                  const lineTotal = base + (base * num(line.tax_percent)) / 100;
                  return (
                    <div key={line.key} className="pur-line">
                      <select
                        value={line.inventory_item_id}
                        aria-label={`Line ${idx + 1} raw material`}
                        onChange={(e) => pickMaterial(line.key, e.target.value)}
                      >
                        <option value="">Free item</option>
                        {rawMaterials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <input
                        value={line.item_name}
                        aria-label={`Line ${idx + 1} item name`}
                        placeholder="Paneer"
                        onChange={(e) => updateLine(line.key, { item_name: e.target.value })}
                        readOnly={Boolean(line.inventory_item_id)}
                      />
                      <input
                        value={line.quantity}
                        aria-label={`Line ${idx + 1} quantity`}
                        placeholder="0.4"
                        inputMode="decimal"
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                      <select
                        value={line.unit}
                        aria-label={`Line ${idx + 1} unit`}
                        disabled={Boolean(line.inventory_item_id)}
                        onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                      >
                        {!PURCHASE_UNITS.includes(line.unit) && <option value={line.unit}>{line.unit}</option>}
                        {PURCHASE_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <input
                        value={line.unit_price_inr}
                        aria-label={`Line ${idx + 1} rate`}
                        placeholder="0"
                        inputMode="decimal"
                        onChange={(e) => updateLine(line.key, { unit_price_inr: e.target.value })}
                      />
                      <input
                        value={line.tax_percent}
                        aria-label={`Line ${idx + 1} tax percent`}
                        inputMode="decimal"
                        onChange={(e) => updateLine(line.key, { tax_percent: e.target.value })}
                      />
                      <span className="pur-line__total">{inr(lineTotal)}</span>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          className="ir-remove-btn"
                          aria-label={`Remove line ${idx + 1}`}
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        >
                          Remove
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm ir-add-line"
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                + Add item
              </button>
            </section>

            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Totals &amp; payment</h3>
              </div>
              <div className="pur-totals-grid">
                <div className="ir-grid pur-totals-inputs">
                  <label className="field">
                    <span>Discount ₹</span>
                    <input value={discount} inputMode="decimal" placeholder="0" onChange={(e) => setDiscount(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Other charges ₹</span>
                    <input value={otherCharges} inputMode="decimal" placeholder="Delivery, etc." onChange={(e) => setOtherCharges(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Paid now ₹</span>
                    <input value={paid} inputMode="decimal" placeholder="0" onChange={(e) => setPaid(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Payment mode</span>
                    <select
                      value={paymentMode}
                      disabled={num(paid) <= 0}
                      onChange={(e) => setPaymentMode(e.target.value as PurchasePaymentMode)}
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <dl className="pur-summary">
                  <div><dt>Subtotal</dt><dd>{inr(totals.subtotal)}</dd></div>
                  <div><dt>Tax</dt><dd>{inr(totals.tax)}</dd></div>
                  {num(discount) > 0 && <div><dt>Discount</dt><dd>- {inr(discount)}</dd></div>}
                  {num(otherCharges) > 0 && <div><dt>Other charges</dt><dd>{inr(otherCharges)}</dd></div>}
                  <div className="pur-summary__total"><dt>Bill total</dt><dd>{inr(totals.total)}</dd></div>
                  <div><dt>Paid</dt><dd>{inr(totals.paid)}</dd></div>
                  <div className={totals.balance > 0 ? "pur-summary__due" : ""}>
                    <dt>Balance due</dt><dd>{inr(totals.balance)}</dd>
                  </div>
                </dl>
              </div>
              <label className="field field--checkbox pur-apply-stock">
                <input type="checkbox" checked={applyStock} onChange={(e) => setApplyStock(e.target.checked)} />
                <span>Add purchased quantities to raw material stock</span>
              </label>
              <label className="field ir-notes-field">
                <span>Notes</span>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery remarks, quality notes…" />
              </label>
            </section>
          </div>
        </form>

        <footer className="ir-modal__foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="pur-create-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save bill"}
          </button>
        </footer>
      </div>
    </div>
  );
}
