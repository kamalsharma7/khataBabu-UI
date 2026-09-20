import { useCallback, useEffect, useRef, useState } from "react";
import { PosBillingNav, type PosBillingSection } from "../../components/owner/pos/PosBillingNav";
import { PosBillsPanel } from "../../components/owner/pos/PosBillsPanel";
import { PosOpenLineModal } from "../../components/owner/pos/PosOpenLineModal";
import { PosOrderScreen } from "../../components/owner/pos/PosOrderScreen";
import type { TimeSessionApplyPayload } from "../../components/owner/pos/PosTimeSessionEditor";
import { PosTableFloor } from "../../components/owner/pos/PosTableFloor";
import { OwnerFloorPage } from "./OwnerFloorPage";
import { OwnerMenuPage } from "./OwnerMenuPage";
import {
  optimisticAddLine,
  optimisticOpenLineUpdate,
  optimisticQtyLine,
  optimisticRemoveLine,
} from "../../components/owner/pos/posOrderCart";
import { fmt, money } from "../../components/owner/pos/posUtils";
import {
  listMenuCategories,
  listMenuItems,
  posAddBillPayment,
  posAddLine,
  posAddOpenLine,
  posCancelLine,
  posCancelOrder,
  posCreateBill,
  posCreateOrder,
  posBillingSettings,
  posFloor,
  posGetBill,
  posGetOrder,
  posListBills,
  posListKots,
  posRemoveLine,
  posSendKot,
  posSettleBill,
  posUpdateOrder,
  posSplitBillPreview,
  posUpdateLine,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type {
  FloorTableStatus,
  MenuItem,
  PaymentMethod,
  PosBill,
  PosBillListEntry,
  PosKot,
  PosOrder,
  PosOrderLine,
  SplitBillPreview,
} from "../../types/owner";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
];

export function OwnerPosPage() {
  const { outlet } = useOwnerOutlet();
  const [screen, setScreen] = useState<"floor" | "order">("floor");
  const [floor, setFloor] = useState<Awaited<ReturnType<typeof posFloor>> | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listMenuCategories>>>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableStatus | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [order, setOrder] = useState<PosOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [pickerVariationId, setPickerVariationId] = useState("");
  const [pickerAddonIds, setPickerAddonIds] = useState<string[]>([]);
  const [pickerQty, setPickerQty] = useState(1);
  const [openLineEdit, setOpenLineEdit] = useState<PosOrderLine | null | undefined>(undefined);

  const [settleOpen, setSettleOpen] = useState(false);
  const [bill, setBill] = useState<PosBill | null>(null);
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [gstHint, setGstHint] = useState<string | null>(null);
  const [payments, setPayments] = useState<
    { method: PaymentMethod; amount: string; reference: string }[]
  >([{ method: "cash", amount: "", reference: "" }]);
  const [kots, setKots] = useState<PosKot[]>([]);
  const orderMutationTail = useRef<Promise<void>>(Promise.resolve());

  const [payModal, setPayModal] = useState<{
    method: PaymentMethod;
    amount: string;
    reference: string;
  } | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitParts, setSplitParts] = useState("2");
  const [splitPreview, setSplitPreview] = useState<SplitBillPreview | null>(null);

  const [navOpen, setNavOpen] = useState(true);
  const [billingSection, setBillingSection] = useState<PosBillingSection>("tables");
  const [bills, setBills] = useState<PosBillListEntry[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const billPreviewBody = useCallback(
    () => ({
      tax_percent: parseFloat(taxPercent) || 0,
      discount_percent: parseFloat(discountPercent) || 0,
      discount_amount: parseFloat(discountAmount) || 0,
      round_to_rupee: true,
    }),
    [taxPercent, discountPercent, discountAmount],
  );

  const loadOrderExtras = useCallback(
    async (orderId: string) => {
      if (!outlet) return;
      const kotList = await posListKots(outlet.id, orderId);
      setKots(kotList);
      try {
        setBill(await posGetBill(outlet.id, orderId));
      } catch {
        setBill(null);
      }
    },
    [outlet],
  );

  const runOrderMutation = useCallback(
    async (
      orderId: string,
      applyOptimistic: (current: PosOrder) => PosOrder,
      callApi: () => Promise<unknown>,
    ) => {
      if (!outlet) return;
      const outletId = outlet.id;
      setOrder((prev) => (prev && prev.id === orderId ? applyOptimistic(prev) : prev));

      const work = async () => {
        await callApi();
        const fresh = await posGetOrder(outletId, orderId);
        setOrder(fresh);
        try {
          setBill(await posGetBill(outletId, orderId));
        } catch (err) {
          if (err instanceof OwnerApiError && err.status === 404) {
            /* no open bill for this order yet */
          }
        }
      };

      const task = orderMutationTail.current.then(work, work);
      orderMutationTail.current = task.then(
        () => undefined,
        () => undefined,
      );
      await task;
    },
    [outlet],
  );

  const saveOrderDetails = useCallback(
    async (patch: {
      customer_name?: string | null;
      customer_mobile?: string | null;
      pay_later?: boolean;
      notes?: string | null;
    }) => {
      if (!outlet || !order) return;
      setBusy(true);
      setError(null);
      try {
        const updated = await posUpdateOrder(outlet.id, order.id, patch);
        setOrder(updated);
      } catch (err) {
        setError(err instanceof OwnerApiError ? err.message : "Could not save");
      } finally {
        setBusy(false);
      }
    },
    [outlet, order],
  );

  const refreshFloor = useCallback(async () => {
    if (!outlet) return;
    setFloor(await posFloor(outlet.id));
  }, [outlet]);

  const applyTimeSession = useCallback(
    async (patch: TimeSessionApplyPayload) => {
      if (!outlet || !order) return;
      setBusy(true);
      setError(null);
      try {
        const updated = await posUpdateOrder(outlet.id, order.id, patch);
        setOrder(updated);
        await refreshFloor();
        if (bill) {
          try {
            const b = await posCreateBill(outlet.id, order.id, {
              discount_amount: parseFloat(discountAmount) || 0,
              discount_percent: parseFloat(discountPercent) || 0,
              tax_percent: parseFloat(taxPercent) || 0,
              round_to_rupee: true,
            });
            setBill(b);
          } catch {
            /* bill refresh optional */
          }
        }
      } catch (err) {
        setError(err instanceof OwnerApiError ? err.message : "Could not update session");
      } finally {
        setBusy(false);
      }
    },
    [outlet, order, bill, discountAmount, discountPercent, taxPercent, refreshFloor],
  );

  const loadCatalog = useCallback(async () => {
    if (!outlet) return;
    const [cats, items] = await Promise.all([
      listMenuCategories(outlet.id),
      listMenuItems(outlet.id),
    ]);
    setCategories(cats);
    setMenuItems(items.filter((i) => i.is_available));
  }, [outlet]);

  const loadBillingSettings = useCallback(async () => {
    if (!outlet) return;
    try {
      const s = await posBillingSettings(outlet.id);
      const tax = parseFloat(s.default_tax_percent) || 0;
      setTaxPercent(String(tax));
      if (s.gst_registered && s.gstin) {
        setGstHint(`GST ${s.gstin} · tax ${tax}%`);
      } else {
        setGstHint(null);
      }
    } catch {
      setGstHint(null);
    }
  }, [outlet]);

  const loadAll = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([refreshFloor(), loadCatalog(), loadBillingSettings()]);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [outlet, refreshFloor, loadCatalog, loadBillingSettings]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openTable = async (table: FloorTableStatus, areaName: string) => {
    if (!outlet) return;
    setBusy(true);
    setError(null);
    setSelectedTable(table);
    setSelectedAreaName(areaName);
    try {
      let o: PosOrder;
      if (table.current_order_id) {
        o = await posGetOrder(outlet.id, table.current_order_id);
      } else {
        o = await posCreateOrder(outlet.id, { venue_table_id: table.table_id });
        await refreshFloor();
      }
      setOrder(o);
      setScreen("order");
      try {
        await loadOrderExtras(o.id);
      } catch {
        setKots([]);
        setBill(null);
      }
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not open table");
    } finally {
      setBusy(false);
    }
  };

  const handleSelectTable = (table: FloorTableStatus) => {
    const area = floor?.areas.find((a) => a.area_id === table.area_id);
    void openTable(table, area?.name ?? "");
  };

  const goToTableView = async () => {
    setBillingSection("tables");
    setScreen("floor");
    await refreshFloor();
  };

  const backToFloor = async () => {
    setScreen("floor");
    setOrder(null);
    orderMutationTail.current = Promise.resolve();
    setKots([]);
    setBill(null);
    setSelectedTable(null);
    await refreshFloor();
  };

  const cancelCurrentOrder = useCallback(async () => {
    if (!outlet || !order) return;
    const hasTime =
      (parseFloat(order.time_charge ?? "0") || 0) > 0 ||
      order.time_session_start != null;
    const hasLines = order.lines.some((l) => l.status !== "cancelled");
    const msg = hasLines || hasTime
      ? "Cancel this order? Items and table time will be cleared and the table will be free."
      : "Cancel this order and free the table?";
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      await posCancelOrder(outlet.id, order.id);
      await backToFloor();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not cancel order");
    } finally {
      setBusy(false);
    }
  }, [outlet, order]);

  const loadBills = useCallback(async () => {
    if (!outlet) return;
    setBillsLoading(true);
    try {
      setBills(await posListBills(outlet.id, "settled"));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load bills");
    } finally {
      setBillsLoading(false);
    }
  }, [outlet]);

  const onBillingNavSelect = (section: PosBillingSection) => {
    setBillingSection(section);
    if (section === "tables") {
      void goToTableView();
    }
    if (section === "setup" || section === "menu" || section === "bills") {
      setScreen("floor");
    }
    if (section === "bills") {
      void loadBills();
    }
  };

  const addLineDirect = async (
    item: MenuItem,
    variationId: string | null,
    addonIds: string[],
    quantity: number,
  ) => {
    if (!outlet || !order) return;
    const orderId = order.id;
    setError(null);
    setPickerItem(null);
    setBusy(true);
    try {
      await runOrderMutation(
        orderId,
        (o) => optimisticAddLine(o, item, variationId, addonIds, quantity),
        () =>
          posAddLine(outlet.id, orderId, {
            menu_item_id: item.id,
            variation_id: variationId || null,
            quantity,
            addon_ids: addonIds,
          }),
      );
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Add failed");
      const fresh = await posGetOrder(outlet.id, orderId);
      setOrder(fresh);
    } finally {
      setBusy(false);
    }
  };

  const onMenuItemClick = (item: MenuItem) => {
    if (!order) return;
    const needsPicker =
      (item.variations?.length ?? 0) > 0 ||
      (item.addons?.filter((a) => a.is_available).length ?? 0) > 0;
    if (needsPicker) {
      const def = item.variations?.find((v) => v.is_default) ?? item.variations?.[0];
      setPickerItem(item);
      setPickerVariationId(def?.id ?? "");
      setPickerAddonIds([]);
      setPickerQty(1);
    } else {
      void addLineDirect(item, null, [], 1);
    }
  };

  const sendKot = async () => {
    if (!outlet || !order) return;
    setBusy(true);
    setError(null);
    try {
      await orderMutationTail.current;
      const orderId = order.id;
      const fresh = await posGetOrder(outlet.id, orderId);
      setOrder(fresh);
      const pending = fresh.lines.filter(
        (l) => l.status === "pending_kot" && !String(l.id).startsWith("opt-"),
      );
      if (pending.length === 0) {
        setError("No items pending for KOT. Wait for items to save or add new items.");
        return;
      }
      await posSendKot(outlet.id, orderId);
      await backToFloor();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "KOT failed");
    } finally {
      setBusy(false);
    }
  };

  const submitOpenLine = async (payload: {
    description: string;
    unit_price: number;
    quantity: number;
    notes: string | null;
    menu_item_id: string | null;
  }) => {
    if (!outlet || !order) return;
    const orderId = order.id;
    const editing = openLineEdit ?? null;
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await runOrderMutation(
          orderId,
          (o) => optimisticOpenLineUpdate(o, editing.id, payload),
          () =>
            posUpdateLine(outlet.id, orderId, editing.id, {
              quantity: payload.quantity,
              unit_price: payload.unit_price,
              notes: payload.notes,
            }),
        );
      } else {
        const updated = await posAddOpenLine(outlet.id, orderId, {
          description: payload.description,
          unit_price: payload.unit_price,
          quantity: payload.quantity,
          notes: payload.notes,
          menu_item_id: payload.menu_item_id,
        });
        setOrder(updated);
      }
      setOpenLineEdit(undefined);
      await loadOrderExtras(orderId);
      try {
        setBill(await posCreateBill(outlet.id, orderId, billPreviewBody()));
      } catch {
        setBill(null);
      }
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Open item failed");
    } finally {
      setBusy(false);
    }
  };

  const onQtyChange = async (line: PosOrderLine, qty: number) => {
    if (!outlet || !order || qty < 1 || line.id.startsWith("opt-")) return;
    const orderId = order.id;
    setError(null);
    setBusy(true);
    try {
      await runOrderMutation(
        orderId,
        (o) => optimisticQtyLine(o, line.id, qty),
        () => posUpdateLine(outlet.id, orderId, line.id, { quantity: qty }),
      );
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Update failed");
      setOrder(await posGetOrder(outlet.id, orderId));
    } finally {
      setBusy(false);
    }
  };

  const refreshBillPreview = async () => {
    if (!outlet || !order) return null;
    await orderMutationTail.current;
    const b = await posCreateBill(outlet.id, order.id, billPreviewBody());
    setBill(b);
    return b;
  };

  const syncPaymentsToBillBalance = useCallback((b: PosBill) => {
    const remaining = money(money(b.grand_total) - money(b.amount_paid ?? "0"));
    setPayments((prev) => {
      if (prev.length !== 1) return prev;
      return [{ ...prev[0], amount: remaining.toFixed(2) }];
    });
  }, []);

  const refreshSettleBill = async () => {
    const b = await refreshBillPreview();
    if (b) syncPaymentsToBillBalance(b);
    return b;
  };

  const openSettle = async () => {
    if (!outlet || !order) return;
    setBusy(true);
    setError(null);
    try {
      const b = await refreshBillPreview();
      if (b) {
        const due = money(b.balance_due ?? b.grand_total);
        setPayments([{ method: "cash", amount: due.toFixed(2), reference: "" }]);
        setSettleOpen(true);
      }
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Bill failed");
    } finally {
      setBusy(false);
    }
  };

  const paymentTotal = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const billDue = bill ? money(bill.balance_due ?? bill.grand_total) : 0;

  const applyDiscount = async () => {
    if (!outlet || !order) return;
    const hasItems = order.lines.some((l) => l.status !== "cancelled");
    if (!hasItems) return;
    setBusy(true);
    try {
      setBill(await posCreateBill(outlet.id, order.id, billPreviewBody()));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Discount failed");
    } finally {
      setBusy(false);
    }
  };

  const ensureBill = async (): Promise<PosBill | null> => refreshBillPreview();

  const openQuickPay = async (method: PaymentMethod) => {
    if (!outlet || !order) return;
    setBusy(true);
    try {
      const b = await ensureBill();
      if (!b) return;
      const due = parseFloat(b.balance_due ?? b.grand_total);
      setPayModal({ method, amount: String(due), reference: "" });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Bill failed");
    } finally {
      setBusy(false);
    }
  };

  const openPartPay = async () => {
    if (!outlet || !order) return;
    setBusy(true);
    try {
      const b = await ensureBill();
      if (!b) return;
      const due = parseFloat(b.balance_due ?? b.grand_total);
      setPayModal({ method: "cash", amount: String((due / 2).toFixed(2)), reference: "" });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Bill failed");
    } finally {
      setBusy(false);
    }
  };

  const submitPayModal = async () => {
    if (!outlet || !order || !payModal) return;
    const amt = money(parseFloat(payModal.amount));
    if (!amt || amt <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const b = await ensureBill();
      if (!b) return;
      const updated = await posAddBillPayment(outlet.id, b.id, {
        method: payModal.method,
        amount: amt,
        reference: payModal.reference.trim() || null,
      });
      setBill(updated);
      setPayModal(null);
      if (updated.status === "settled") {
        setBill(null);
        await backToFloor();
      }
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const openSplit = async () => {
    if (!outlet || !order) return;
    setBusy(true);
    try {
      await ensureBill();
      setSplitOpen(true);
      setSplitPreview(null);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Bill failed");
    } finally {
      setBusy(false);
    }
  };

  const runSplitPreview = async () => {
    if (!outlet || !order) return;
    const parts = parseInt(splitParts, 10);
    if (parts < 2) return;
    setBusy(true);
    try {
      setSplitPreview(
        await posSplitBillPreview(outlet.id, order.id, { parts, ...billPreviewBody() }),
      );
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Split failed");
    } finally {
      setBusy(false);
    }
  };

  const collectSplitShare = () => {
    if (!splitPreview) return;
    setSplitOpen(false);
    setPayModal({
      method: "cash",
      amount: String(parseFloat(splitPreview.amount_per_part).toFixed(2)),
      reference: "",
    });
  };

  const settle = async () => {
    if (!outlet || !order) return;
    setBusy(true);
    setError(null);
    try {
      await orderMutationTail.current;
      const latest = await refreshBillPreview();
      if (!latest) {
        setError("Could not create bill for this order");
        return;
      }
      const alreadyPaid = money(latest.amount_paid ?? "0");
      const remaining = money(money(latest.grand_total) - alreadyPaid);
      let payRows = payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          method: p.method,
          amount: money(parseFloat(p.amount)),
          reference: p.reference.trim() || null,
        }));
      if (payRows.length === 1 && money(payRows[0].amount) !== remaining) {
        payRows = [{ ...payRows[0], amount: remaining }];
      }
      const newPaid = payRows.reduce((s, p) => s + p.amount, 0);
      const grand = money(latest.grand_total);
      if (money(alreadyPaid + newPaid) !== grand) {
        setError(
          `Payments must equal ${fmt(grand)} (already paid ${fmt(alreadyPaid)}, paying now ${fmt(newPaid)}).`,
        );
        return;
      }
      if (payRows.length === 0 && alreadyPaid < grand) {
        setError("Enter payment amount(s) before completing settle");
        return;
      }
      await posSettleBill(outlet.id, latest.id, {
        ...billPreviewBody(),
        payments: payRows,
      });
      setSettleOpen(false);
      setBill(null);
      await backToFloor();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  };

  if (!outlet) return <p className="muted">No outlet selected.</p>;

  const showOrderScreen =
    billingSection === "tables" && screen === "order" && order && selectedTable;
  const selectedAreaMeta = floor?.areas.find((a) => a.area_id === selectedTable?.area_id);
  const isTimeTable =
    selectedTable?.resource_kind === "time_based" ||
    selectedAreaMeta?.billing_mode === "time_based";

  return (
    <div className="pp-root pp-billing-layout">
      <PosBillingNav
        open={navOpen}
        active={billingSection}
        onToggle={() => setNavOpen((o) => !o)}
        onSelect={onBillingNavSelect}
      />
      <div className="pp-billing-main">
        {error && <p className="form-error pp-root-error">{error}</p>}

        {billingSection === "setup" && <OwnerFloorPage embedded />}

        {billingSection === "menu" && <OwnerMenuPage embedded />}

        {billingSection === "bills" && (
          <PosBillsPanel
            outletId={outlet.id}
            bills={bills}
            loading={billsLoading}
            onRefresh={() => void loadBills()}
          />
        )}

        {billingSection === "tables" && !showOrderScreen && (
          <PosTableFloor
            areas={floor?.areas ?? []}
            loading={loading}
            onSelectTable={handleSelectTable}
            onViewOrder={handleSelectTable}
          />
        )}

        {showOrderScreen && (
        <PosOrderScreen
          tableLabel={selectedTable.label}
          areaName={selectedAreaName}
          order={order}
          categories={categories}
          menuItems={menuItems}
          busy={busy}
          onBack={() => void goToTableView()}
          onItemClick={onMenuItemClick}
          onQtyChange={(line, qty) => void onQtyChange(line, qty)}
          onRemoveLine={(line) => {
            if (!outlet || !order || line.id.startsWith("opt-")) return;
            const orderId = order.id;
            setError(null);
            setBusy(true);
            void runOrderMutation(
              orderId,
              (o) => optimisticRemoveLine(o, line.id),
              () => posRemoveLine(outlet.id, orderId, line.id),
            )
              .catch((err) => {
                setError(err instanceof OwnerApiError ? err.message : "Remove failed");
                return posGetOrder(outlet.id, orderId).then(setOrder);
              })
              .finally(() => setBusy(false));
          }}
          onVoidLine={(line) => {
            if (!outlet || !order || line.id.startsWith("opt-")) return;
            const orderId = order.id;
            setError(null);
            setBusy(true);
            void runOrderMutation(
              orderId,
              (o) => optimisticRemoveLine(o, line.id),
              () => posCancelLine(outlet.id, orderId, line.id),
            )
              .catch((err) => {
                setError(err instanceof OwnerApiError ? err.message : "Void failed");
                return posGetOrder(outlet.id, orderId).then(setOrder);
              })
              .finally(() => setBusy(false));
          }}
          onOpenItem={() => setOpenLineEdit(null)}
          onEditOpenLine={(line) => setOpenLineEdit(line)}
          onKot={() => void sendKot()}
          onKotPrint={() => void sendKot()}
          onSettle={() => void openSettle()}
          kots={kots}
          bill={bill}
          discountPercent={discountPercent}
          taxPercent={taxPercent}
          onDiscountChange={(v) => {
            setDiscountPercent(v);
            setDiscountAmount("0");
          }}
          onDiscountApply={() => void applyDiscount()}
          gstHint={gstHint}
          onQuickPay={(m) => void openQuickPay(m)}
          onPartPay={() => void openPartPay()}
          onSplitBill={() => void openSplit()}
          onSaveOrderDetails={(patch) => void saveOrderDetails(patch)}
          isTimeBased={isTimeTable}
          tableHourlyRate={selectedTable.hourly_rate}
          onTimeSessionApply={(patch) => void applyTimeSession(patch)}
          onCancelOrder={() => void cancelCurrentOrder()}
        />
        )}
      </div>

      {openLineEdit !== undefined && (
        <PosOpenLineModal
          menuItems={menuItems}
          editLine={openLineEdit}
          busy={busy}
          onClose={() => setOpenLineEdit(undefined)}
          onSubmit={(payload) => void submitOpenLine(payload)}
        />
      )}

      {pickerItem && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPickerItem(null)}>
          <div className="card modal pos-picker-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>{pickerItem.name}</h2>
            {(pickerItem.variations?.length ?? 0) > 0 && (
              <label className="field">
                <span>Variation</span>
                <select value={pickerVariationId} onChange={(e) => setPickerVariationId(e.target.value)}>
                  {(pickerItem.variations ?? []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name} — {fmt(v.price)}</option>
                  ))}
                </select>
              </label>
            )}
            {(pickerItem.addons ?? []).filter((a) => a.is_available).map((a) => (
              <label key={a.id} className="field field--checkbox">
                <input
                  type="checkbox"
                  checked={pickerAddonIds.includes(a.id)}
                  onChange={(e) =>
                    setPickerAddonIds((ids) =>
                      e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id),
                    )
                  }
                />
                <span>{a.name} (+{fmt(a.price)})</span>
              </label>
            ))}
            <label className="field">
              <span>Qty</span>
              <input
                type="number"
                min={1}
                value={pickerQty}
                onChange={(e) => setPickerQty(parseInt(e.target.value, 10) || 1)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPickerItem(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void addLineDirect(
                    pickerItem,
                    pickerVariationId || null,
                    pickerAddonIds,
                    pickerQty,
                  )
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {settleOpen && bill && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSettleOpen(false)}>
          <div className="card modal pos-settle-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Settle — Bill #{bill.bill_number}</h2>
            <div className="pos-settle-grid">
              <label className="field">
                <span>Discount %</span>
                <input
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(e.target.value);
                    setDiscountAmount("0");
                  }}
                  onBlur={() => void refreshSettleBill()}
                />
              </label>
              <label className="field">
                <span>Discount ₹</span>
                <input
                  value={discountAmount}
                  onChange={(e) => {
                    setDiscountAmount(e.target.value);
                    setDiscountPercent("0");
                  }}
                  onBlur={() => void refreshSettleBill()}
                />
              </label>
              <label className="field">
                <span>Tax %</span>
                <input value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} onBlur={() => void refreshSettleBill()} />
              </label>
              <button type="button" className="btn btn-secondary btn-sm pos-settle-apply-disc" disabled={busy} onClick={() => void refreshSettleBill()}>
                Apply discount
              </button>
            </div>
            {gstHint && <p className="muted">{gstHint}</p>}
            <p className="muted">Subtotal {fmt(bill.subtotal)} · Disc {fmt(bill.discount_amount)} · Tax {fmt(bill.tax_amount)}</p>
            <p className="pp-settle-total">Total: <strong>{fmt(bill.grand_total)}</strong></p>
            {payments.map((p, idx) => (
              <div key={idx} className="pos-payment-row">
                <select
                  value={p.method}
                  onChange={(e) => {
                    const next = [...payments];
                    next[idx] = { ...p, method: e.target.value as PaymentMethod };
                    setPayments(next);
                  }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => {
                    const next = [...payments];
                    next[idx] = { ...p, amount: e.target.value };
                    setPayments(next);
                  }}
                />
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPayments([...payments, { method: "cash", amount: "", reference: "" }])}>
              + Split
            </button>
            {parseFloat(bill.amount_paid ?? "0") > 0 && (
              <p className="muted">Already paid {fmt(bill.amount_paid!)} · balance {fmt(bill.balance_due ?? bill.grand_total)}</p>
            )}
            <p className={money(paymentTotal) !== billDue ? "pos-pay-total--bad" : ""}>
              Paying {fmt(paymentTotal)} / {fmt(billDue)} due
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSettleOpen(false)}>Back</button>
              <button type="button" className="btn btn-primary" disabled={busy || money(paymentTotal) !== billDue} onClick={() => void settle()}>
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {payModal && bill && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPayModal(null)}>
          <div className="card modal pos-pay-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Record payment</h2>
            <label className="field">
              <span>Method</span>
              <select
                value={payModal.method}
                onChange={(e) =>
                  setPayModal({ ...payModal, method: e.target.value as PaymentMethod })
                }
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                value={payModal.amount}
                onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Reference (optional)</span>
              <input
                value={payModal.reference}
                onChange={(e) => setPayModal({ ...payModal, reference: e.target.value })}
              />
            </label>
            <p className="muted">Balance due: {fmt(bill.balance_due ?? bill.grand_total)}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submitPayModal()}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {splitOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSplitOpen(false)}>
          <div className="card modal pos-split-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Split bill</h2>
            <label className="field">
              <span>Number of parts</span>
              <input
                type="number"
                min={2}
                max={20}
                value={splitParts}
                onChange={(e) => setSplitParts(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void runSplitPreview()}>
              Preview
            </button>
            {splitPreview && (
              <p className="pp-split-result">
                {splitPreview.parts} × <strong>{fmt(splitPreview.amount_per_part)}</strong> = {fmt(splitPreview.grand_total)}
              </p>
            )}
            <p className="muted">Collect each share with Cash / UPI / Card (add multiple payments in Settle).</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSplitOpen(false)}>Close</button>
              {splitPreview && (
                <button type="button" className="btn btn-primary" onClick={collectSplitShare}>
                  Collect one share
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
