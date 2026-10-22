import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  MenuCategory,
  MenuItem,
  OrderType,
  PosBill,
  PosKot,
  PosOrder,
  PosOrderLine,
} from "../../../types/owner";
import { PosCartSidePanel, type CartPanel } from "./PosCartSidePanel";
import { PosTimeSessionEditor, type TimeSessionApplyPayload } from "./PosTimeSessionEditor";
import { itemBaseFoodType } from "../menu/menuFoodType";
import { dietStripeClass, fmt } from "./posUtils";

const ALL_CAT = "__all__";

type Props = {
  tableLabel: string;
  areaName: string;
  order: PosOrder;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  busy: boolean;
  billSaved: boolean;
  onBack: () => void;
  onItemClick: (item: MenuItem) => void;
  onQtyChange: (line: PosOrderLine, qty: number) => void;
  onRemoveLine: (line: PosOrderLine) => void;
  onVoidLine: (line: PosOrderLine) => void;
  onOpenItem: () => void;
  onEditOpenLine: (line: PosOrderLine) => void;
  onKot: () => void;
  onKotPrint: () => void;
  onSave: () => void;
  onSaveAndKot: () => void;
  onSavePrint: () => void;
  onSettle: () => void;
  onOrderTypeChange: (type: OrderType) => void;
  kots: PosKot[];
  bill: PosBill | null;
  gstHint: string | null;
  onSaveOrderDetails: (patch: {
    customer_name?: string | null;
    customer_mobile?: string | null;
    customer_locality?: string | null;
    customer_relation?: string | null;
    pay_later?: boolean;
    notes?: string | null;
  }) => void;
  isTimeBased?: boolean;
  canManageTimeBilling?: boolean;
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
  billSaved,
  onBack,
  onItemClick,
  onQtyChange,
  onRemoveLine,
  onVoidLine,
  onOpenItem,
  onEditOpenLine,
  onKot,
  onKotPrint,
  onSave,
  onSaveAndKot,
  onSavePrint,
  onSettle,
  onOrderTypeChange,
  kots,
  bill,
  gstHint,
  onSaveOrderDetails,
  isTimeBased = false,
  canManageTimeBilling = false,
  onTimeSessionApply,
  onCancelOrder,
}: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CAT);
  const [search, setSearch] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [cartPanel, setCartPanel] = useState<CartPanel>("order");
  const prevLineCount = useRef(order.lines.length);

  useEffect(() => {
    if (order.lines.length > prevLineCount.current) {
      setCartPanel("order");
    }
    prevLineCount.current = order.lines.length;
  }, [order.lines.length]);

  const activeLines = order.lines.filter((l) => l.status !== "cancelled");
  const timeCharge =
    order.time_billing_excluded ? 0 : parseFloat(order.time_charge ?? "0") || 0;
  const hasBillable = activeLines.length > 0 || (isTimeBased && timeCharge > 0);
  const canKot = order.lines.some(
    (l) => l.status === "pending_kot" && !String(l.id).startsWith("opt-"),
  );
  const navigate = useNavigate();
  const displayTotal = bill?.grand_total ?? order.running_subtotal;

  const categoryNav = useMemo(
    () =>
      [...categories].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      ),
    [categories],
  );

  const items = useMemo(() => {
    let list =
      activeCategoryId === ALL_CAT
        ? menuItems
        : menuItems.filter((i) => i.category_id === activeCategoryId);
    const q = search.trim().toLowerCase();
    const code = shortCode.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    if (code) list = list.filter((i) => (i.short_code ?? "").toLowerCase().includes(code));
    return list;
  }, [menuItems, activeCategoryId, search, shortCode]);

  const activeCategoryName =
    activeCategoryId === ALL_CAT
      ? "All items"
      : categoryNav.find((c) => c.id === activeCategoryId)?.name ?? "Items";

  const cartRail: { id: CartPanel; label: string; title: string }[] = [
    { id: "order", label: "🛒", title: "Order" },
    { id: "customer", label: "👤", title: "Customer" },
    { id: "comment", label: "💬", title: "Comment" },
    { id: "pay_later", label: "⏳", title: "Pay later" },
  ];

  const orderTypeLabel = order.order_type === "delivery" ? "Delivery" : "Dine in";

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
          {orderTypeLabel} · <strong>{tableLabel}</strong> · {areaName}
          {billSaved && <span className="pp-order-saved-tag">Bill saved</span>}
        </span>
        <div className="pp-order-type-tabs">
          <button
            type="button"
            className={order.order_type === "dine_in" ? "pp-order-type-tabs__on" : ""}
            disabled={busy}
            onClick={() => onOrderTypeChange("dine_in")}
          >
            Dine in
          </button>
          <button
            type="button"
            className={order.order_type === "delivery" ? "pp-order-type-tabs__on" : ""}
            disabled={busy}
            onClick={() => onOrderTypeChange("delivery")}
          >
            Delivery
          </button>
        </div>
        {onCancelOrder && (
          <button type="button" className="pp-order-cancel" disabled={busy} onClick={onCancelOrder}>
            Cancel order
          </button>
        )}
      </header>

      {isTimeBased && onTimeSessionApply && (
        <PosTimeSessionEditor
          order={order}
          busy={busy}
          canManageTimeBilling={canManageTimeBilling}
          onApply={onTimeSessionApply}
        />
      )}

      <div className="pp-order-body pp-order-body--with-cats">
        <nav className="pp-cat-nav" aria-label="Menu categories">
          <button
            type="button"
            className={`pp-cat-nav__item ${activeCategoryId === ALL_CAT ? "pp-cat-nav__item--on" : ""}`}
            onClick={() => setActiveCategoryId(ALL_CAT)}
          >
            ALL
          </button>
          {categoryNav.map((c) => (
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
              <h2 className="pp-items-toolbar__title">{activeCategoryName}</h2>
              <div className="pp-items-search">
                <input
                  placeholder="Search all items"
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
                  className={`pp-item-tile ${dietStripeClass(itemBaseFoodType(item))}`}
                  onClick={() => onItemClick(item)}
                  disabled={busy}
                >
                  <span className="pp-item-tile__name">{item.name}</span>
                </button>
              ))}
              {items.length === 0 && <p className="muted pp-items-empty">No items match</p>}
            </div>
          </section>

          <aside className="pp-cart-pane" aria-label="Current order">
            <div className="pp-cart-tabs">
              <span className="pp-cart-tabs__on">{isTimeBased ? "Time + order" : orderTypeLabel}</span>
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
              {gstHint && <p className="muted pp-cart-gst-hint">{gstHint}</p>}
              <div className="pp-cart-total-box">
                <span>{bill ? "Bill total" : "Total"}</span>
                <strong>{fmt(displayTotal)}</strong>
              </div>
              {bill && (bill.cgst_amount || bill.sgst_amount) && (
                <p className="muted pp-cart-gst-breakup">
                  CGST {fmt(bill.cgst_amount ?? "0")} · SGST {fmt(bill.sgst_amount ?? "0")}
                </p>
              )}
              <div className="pp-cart-actions" aria-label="Order actions">
                <button
                  type="button"
                  className="pp-btn pp-btn--outline"
                  disabled={busy || !hasBillable}
                  onClick={onSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--dark"
                  disabled={busy || !canKot}
                  onClick={onKot}
                >
                  KOT
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--primary"
                  disabled={busy || (!hasBillable && !canKot)}
                  onClick={onSaveAndKot}
                >
                  Save &amp; KOT
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--outline pp-btn--compact"
                  disabled={busy || !hasBillable}
                  onClick={onSavePrint}
                >
                  Save &amp; Print
                </button>
                <button
                  type="button"
                  className="pp-btn pp-btn--outline pp-btn--compact"
                  disabled={busy || !canKot}
                  onClick={onKotPrint}
                >
                  KOT &amp; Print
                </button>
                {billSaved && (
                  <button
                    type="button"
                    className="pp-btn pp-btn--settle pp-btn--compact"
                    disabled={busy}
                    onClick={onSettle}
                  >
                    Settle &amp; pay
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
