import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  MenuCategory,
  MenuItem,
  PaymentMethod,
  PosBill,
  PosKot,
  PosOrder,
  PosOrderLine,
} from "../../../types/owner";
import { PosCartSidePanel, type CartPanel } from "./PosCartSidePanel";
import { PosTimeSessionEditor, type TimeSessionApplyPayload } from "./PosTimeSessionEditor";
import { dietStripeClass, fmt } from "./posUtils";

type Props = {
  tableLabel: string;
  areaName: string;
  order: PosOrder;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  busy: boolean;
  onBack: () => void;
  onItemClick: (item: MenuItem) => void;
  onQtyChange: (line: PosOrderLine, qty: number) => void;
  onRemoveLine: (line: PosOrderLine) => void;
  onVoidLine: (line: PosOrderLine) => void;
  onOpenItem: () => void;
  onEditOpenLine: (line: PosOrderLine) => void;
  onKot: () => void;
  onKotPrint: () => void;
  onSettle: () => void;
  kots: PosKot[];
  bill: PosBill | null;
  discountPercent: string;
  taxPercent: string;
  onDiscountChange: (value: string) => void;
  onDiscountApply: () => void;
  onQuickPay: (method: PaymentMethod) => void;
  onPartPay: () => void;
  onSplitBill: () => void;
  gstHint: string | null;
  onSaveOrderDetails: (patch: {
    customer_name?: string | null;
    customer_mobile?: string | null;
    pay_later?: boolean;
    notes?: string | null;
  }) => void;
  isTimeBased?: boolean;
  tableHourlyRate?: string | null;
  onTimeSessionApply?: (patch: TimeSessionApplyPayload) => void;
  onCancelOrder?: () => void;
};

export function PosOrderScreen({
  tableLabel,
  areaName,
  order,
  categories,
  menuItems,
  busy,
  onBack,
  onItemClick,
  onQtyChange,
  onRemoveLine,
  onVoidLine,
  onOpenItem,
  onEditOpenLine,
  onKot,
  onKotPrint,
  onSettle,
  kots,
  bill,
  discountPercent,
  taxPercent,
  onDiscountChange,
  onDiscountApply,
  onQuickPay,
  onPartPay,
  onSplitBill,
  gstHint,
  onSaveOrderDetails,
  isTimeBased = false,
  tableHourlyRate = null,
  onTimeSessionApply,
  onCancelOrder,
}: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [cartPanel, setCartPanel] = useState<CartPanel>("order");

  useEffect(() => {
    if (!activeCategoryId && categories[0]?.id) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  const items = useMemo(() => {
    let list = menuItems.filter((i) => i.category_id === activeCategoryId);
    const q = search.trim().toLowerCase();
    const code = shortCode.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    if (code) list = list.filter((i) => (i.short_code ?? "").toLowerCase().includes(code));
    return list;
  }, [menuItems, activeCategoryId, search, shortCode]);

  const activeLines = order.lines.filter((l) => l.status !== "cancelled");
  const timeCharge = parseFloat(order.time_charge ?? "0") || 0;
  const hasBillable = activeLines.length > 0 || (isTimeBased && timeCharge > 0);
  const canKot = order.lines.some(
    (l) => l.status === "pending_kot" && !String(l.id).startsWith("opt-"),
  );
  const navigate = useNavigate();
  const displayTotal = bill?.grand_total ?? order.running_subtotal;
  const balanceDue = bill?.balance_due ?? bill?.grand_total ?? order.running_subtotal;

  const cartRail: { id: CartPanel; label: string; title: string }[] = [
    { id: "order", label: "🛒", title: "Order" },
    { id: "customer", label: "👤", title: "Customer" },
    { id: "comment", label: "💬", title: "Comment" },
    { id: "pay_later", label: "⏳", title: "Pay later" },
    { id: "payments", label: "₹", title: "Payments" },
  ];

  return (
    <div className="pp-order">
      <header className="pp-order-topbar">
        <button type="button" className="pp-order-back" onClick={onBack}>
          ← Billing
        </button>
        <button
          type="button"
          className="pp-order-topbar__brand"
          onClick={() => navigate("/app")}
          title="Welcome home"
        >
          KhataBabu
        </button>
        <span className="pp-order-topbar__table">
          {isTimeBased ? "Time" : "Dine in"} · <strong>{tableLabel}</strong> · {areaName}
        </span>
        {onCancelOrder && (
          <button type="button" className="pp-order-cancel" disabled={busy} onClick={onCancelOrder}>
            Cancel order
          </button>
        )}
      </header>

      {isTimeBased && onTimeSessionApply && onCancelOrder && (
        <PosTimeSessionEditor
          order={order}
          hourlyRate={tableHourlyRate}
          busy={busy}
          onApply={onTimeSessionApply}
          onCancelOrder={onCancelOrder}
        />
      )}

      {/* 10% categories | 90% = items (left) + cart (right) */}
      <div className="pp-order-body">
        <nav className="pp-cat-nav" aria-label="Menu categories">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pp-cat-nav__item ${activeCategoryId === c.id ? "pp-cat-nav__item--on" : ""}`}
              onClick={() => setActiveCategoryId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </nav>

        <div className="pp-order-split">
          <section className="pp-items-pane" aria-label="Menu items">
            <div className="pp-items-toolbar">
              <h2 className="pp-items-toolbar__title">{activeCategory?.name ?? "Items"}</h2>
              <div className="pp-items-search">
                <input
                  placeholder="Search item"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <input
                  placeholder="Short code"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value)}
                />
                <button type="button" className="pp-items-open-btn" disabled={busy} onClick={onOpenItem}>
                  Open item
                </button>
              </div>
            </div>
            <div className="pp-items-grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`pp-item-tile ${dietStripeClass(item.food_type ?? (item.is_veg ? "veg" : "non_veg"))}`}
                  onClick={() => onItemClick(item)}
                  disabled={busy}
                >
                  <span className="pp-item-tile__name">{item.name}</span>
                </button>
              ))}
              {items.length === 0 && <p className="muted pp-items-empty">No items in this category</p>}
            </div>
          </section>

          <aside className="pp-cart-pane" aria-label="Current order">
            <div className="pp-cart-tabs">
              <span className="pp-cart-tabs__on">{isTimeBased ? "Time + order" : "Dine In"}</span>
            </div>
            <nav className="pp-cart-rail" aria-label="Order tools">
              {cartRail.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`pp-cart-rail__btn ${cartPanel === item.id ? "pp-cart-rail__btn--on" : ""}`}
                  title={item.title}
                  onClick={() => setCartPanel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="pp-cart-panel-wrap">
              <PosCartSidePanel
                panel={cartPanel}
                order={order}
                kots={kots}
                bill={bill}
                busy={busy}
                tableLabel={tableLabel}
                areaName={areaName}
                onQtyChange={onQtyChange}
                onRemoveLine={onRemoveLine}
                onVoidLine={onVoidLine}
                onEditOpenLine={onEditOpenLine}
                onSaveOrderDetails={onSaveOrderDetails}
              />
            </div>
            <div className="pp-cart-footer">
              <div className="pp-bill-toolbar">
                <label className="pp-bill-toolbar__disc">
                  <span>Disc %</span>
                  <input
                    value={discountPercent}
                    onChange={(e) => onDiscountChange(e.target.value)}
                    onBlur={() => onDiscountApply()}
                    disabled={busy || !hasBillable}
                  />
                </label>
                <span className="pp-bill-toolbar__tax muted">
                  {gstHint ? gstHint : `Tax ${taxPercent}%`}
                </span>
                <div className="pp-bill-toolbar__pay">
                  <button type="button" disabled={busy || !hasBillable} onClick={() => onQuickPay("cash")}>
                    Cash
                  </button>
                  <button type="button" disabled={busy || !hasBillable} onClick={() => onQuickPay("card")}>
                    Card
                  </button>
                  <button type="button" disabled={busy || !hasBillable} onClick={() => onQuickPay("upi")}>
                    UPI
                  </button>
                  <button type="button" disabled={busy || !hasBillable} onClick={onPartPay}>
                    Part
                  </button>
                  <button type="button" disabled={busy || !hasBillable} onClick={onSplitBill}>
                    Split
                  </button>
                </div>
              </div>
              <div className="pp-cart-total-box">
                <span>{bill ? "Bill total" : "Total"}</span>
                <strong>{fmt(displayTotal)}</strong>
              </div>
              {isTimeBased && timeCharge > 0 && (
                <p className="muted pp-cart-time-charge">Includes time: {fmt(timeCharge)}</p>
              )}
              {bill && parseFloat(bill.amount_paid ?? "0") > 0 && (
                <p className="pp-cart-balance">
                  Paid {fmt(bill.amount_paid!)} · Due <strong>{fmt(balanceDue)}</strong>
                </p>
              )}
              <div className="pp-cart-actions">
                <button type="button" className="pp-btn pp-btn--dark" disabled={busy || !canKot} onClick={onKot}>
                  KOT
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--dark"
                  disabled={busy || !canKot}
                  onClick={onKotPrint}
                >
                  KOT &amp; Print
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--primary"
                  disabled={busy || !hasBillable}
                  onClick={onSettle}
                >
                  Save &amp; Settle
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
