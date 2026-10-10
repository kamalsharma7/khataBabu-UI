import { useCallback, useEffect, useRef, useState } from "react";
import { PosBillingNav, type PosBillingSection } from "../../components/owner/pos/PosBillingNav";
import { PosBillsPanel } from "../../components/owner/pos/PosBillsPanel";
import { PosOpenLineModal } from "../../components/owner/pos/PosOpenLineModal";
import { PosItemPickerModal } from "../../components/owner/pos/PosItemPickerModal";
import { PosOrderScreen } from "../../components/owner/pos/PosOrderScreen";
import { PosSettleModal } from "../../components/owner/pos/PosSettleModal";
import { OwnerInventoryPage } from "./OwnerInventoryPage";
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
  posAddLine,
  posAddOpenLine,
  posCancelLine,
  posCancelOrder,
  posCreateBill,
  posSaveBill,
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
} from "../../types/owner";

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
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);
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
  const [tipAmount, setTipAmount] = useState("0");
  const [gstHint, setGstHint] = useState<string | null>(null);
  const [payments, setPayments] = useState<
    { method: PaymentMethod; amount: string; reference: string }[]
  >([{ method: "cash", amount: "", reference: "" }]);
  const [kots, setKots] = useState<PosKot[]>([]);
  const orderMutationTail = useRef<Promise<void>>(Promise.resolve());

  const [navOpen, setNavOpen] = useState(true);
  const [billingSection, setBillingSection] = useState<PosBillingSection>("tables");
  const [bills, setBills] = useState<PosBillListEntry[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  const billPreviewBody = useCallback(
    () => ({
      tax_percent: parseFloat(taxPercent) || 0,
      discount_percent: parseFloat(discountPercent) || 0,
      discount_amount: parseFloat(discountAmount) || 0,
      tip_amount: parseFloat(tipAmount) || 0,
      round_to_rupee: true,
    }),
    [taxPercent, discountPercent, discountAmount, tipAmount],
  );

  const loadOrderExtras = useCallback(
    async (orderId: string): Promise<PosBill | null> => {
      if (!outlet) return null;
      const kotList = await posListKots(outlet.id, orderId);
      setKots(kotList);
      try {
        const b = await posGetBill(outlet.id, orderId);
        setBill(b);
        return b;
      } catch {
        setBill(null);
        return null;
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
        const apiResult = await callApi();
        const fresh =
          apiResult &&
          typeof apiResult === "object" &&
          "order_number" in apiResult &&
          "lines" in apiResult
            ? (apiResult as PosOrder)
            : await posGetOrder(outletId, orderId);
        if (fresh.warnings?.length) {
          setInventoryNotice(fresh.warnings.join(" · "));
        }
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
      customer_locality?: string | null;
      customer_relation?: string | null;
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
      setSettleOpen(false);
      try {
        await loadCatalog();
        const loadedBill = await loadOrderExtras(o.id);
        if (o.bill_saved_at) {
          if (loadedBill) {
            syncPaymentsToBillBalance(loadedBill);
            setSettleOpen(true);
          } else {
            const b = await posCreateBill(outlet.id, o.id, billPreviewBody());
            setBill(b);
            const due = money(b.balance_due ?? b.grand_total);
            setPayments([{ method: "cash", amount: due.toFixed(2), reference: "" }]);
            setSettleOpen(true);
          }
        }
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

  const openDeliveryOrder = async (existing?: PosOrder) => {
    if (!outlet) return;
    setBusy(true);
    setError(null);
    setInventoryNotice(null);
    setSelectedTable(null);
    setSelectedAreaName("Delivery");
    try {
      const o = existing ?? (await posCreateOrder(outlet.id, { order_type: "delivery" }));
      if (!existing) {
        await refreshFloor();
      }
      setOrder(o);
      setScreen("order");
      setSettleOpen(false);
      try {
        await loadCatalog();
        const loadedBill = await loadOrderExtras(o.id);
        if (o.bill_saved_at) {
          if (loadedBill) {
            syncPaymentsToBillBalance(loadedBill);
            setSettleOpen(true);
          } else {
            const b = await posCreateBill(outlet.id, o.id, billPreviewBody());
            setBill(b);
            const due = money(b.balance_due ?? b.grand_total);
            setPayments([{ method: "cash", amount: due.toFixed(2), reference: "" }]);
            setSettleOpen(true);
          }
        }
      } catch {
        setKots([]);
        setBill(null);
      }
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not open delivery order");
    } finally {
      setBusy(false);
    }
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
    setInventoryNotice(null);
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
    if (section === "setup" || section === "menu" || section === "bills" || section === "inventory") {
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
          }).then((r) => r),
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

  const saveCurrentBill = async (printAfter: boolean) => {
    if (!outlet || !order) return;
    setBusy(true);
    setError(null);
    try {
      await orderMutationTail.current;
      const saved = await posSaveBill(outlet.id, order.id, {
        ...billPreviewBody(),
        print_after_save: printAfter,
      });
      setBill(saved);
      if (printAfter) {
        window.print();
      }
      await backToFloor();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const changeOrderType = async (orderType: import("../../types/owner").OrderType) => {
    if (!outlet || !order) return;
    setBusy(true);
    try {
      setOrder(await posUpdateOrder(outlet.id, order.id, { order_type: orderType }));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not update order type");
    } finally {
      setBusy(false);
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

  const saveAndKot = async () => {
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
      if (pending.length > 0) {
        await posSendKot(outlet.id, orderId);
      }
      const active = fresh.lines.filter((l) => l.status !== "cancelled");
      const timeCharge = parseFloat(fresh.time_charge ?? "0") || 0;
      if (active.length > 0 || timeCharge > 0) {
        const saved = await posSaveBill(outlet.id, orderId, {
          ...billPreviewBody(),
          print_after_save: false,
        });
        setBill(saved);
      }
      await backToFloor();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Save & KOT failed");
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

  const isDeliverySession = order?.order_type === "delivery";
  const showOrderScreen =
    billingSection === "tables" &&
    screen === "order" &&
    order &&
    (selectedTable != null || isDeliverySession);
  const billSaved = Boolean(order?.bill_saved_at);
  const tableLabel =
    order?.order_type === "delivery"
      ? `Delivery #${order.order_number}`
      : selectedTable?.label ?? "";
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
        {inventoryNotice && (
          <p className="pp-inventory-notice" role="status">
            Low stock: {inventoryNotice}
          </p>
        )}
        {error && <p className="form-error pp-root-error">{error}</p>}

        {billingSection === "setup" && <OwnerFloorPage embedded />}

        {billingSection === "menu" && <OwnerMenuPage embedded />}

        {billingSection === "inventory" && <OwnerInventoryPage embedded />}

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
            onNewDelivery={() => void openDeliveryOrder()}
          />
        )}

        {showOrderScreen && (
        <PosOrderScreen
          tableLabel={tableLabel}
          areaName={selectedAreaName}
          order={order}
          categories={categories}
          menuItems={menuItems}
          busy={busy}
          billSaved={billSaved}
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
          onSave={() => void saveCurrentBill(false)}
          onSaveAndKot={() => void saveAndKot()}
          onSavePrint={() => void saveCurrentBill(true)}
          onSettle={() => void openSettle()}
          onOrderTypeChange={(t) => void changeOrderType(t)}
          kots={kots}
          bill={bill}
          gstHint={gstHint}
          onSaveOrderDetails={(patch) => void saveOrderDetails(patch)}
          isTimeBased={isTimeTable}
          tableHourlyRate={selectedTable?.hourly_rate ?? null}
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
        <PosItemPickerModal
          item={pickerItem}
          variationId={pickerVariationId}
          addonIds={pickerAddonIds}
          qty={pickerQty}
          busy={busy}
          onVariationId={setPickerVariationId}
          onAddonIds={setPickerAddonIds}
          onQty={setPickerQty}
          onClose={() => setPickerItem(null)}
          onConfirm={() =>
            void addLineDirect(pickerItem, pickerVariationId || null, pickerAddonIds, pickerQty)
          }
        />
      )}

      {settleOpen && bill && (
        <PosSettleModal
          bill={bill}
          tableLabel={tableLabel}
          gstHint={gstHint}
          busy={busy}
          discountPercent={discountPercent}
          discountAmount={discountAmount}
          taxPercent={taxPercent}
          tipAmount={tipAmount}
          payments={payments}
          onDiscountPercent={setDiscountPercent}
          onDiscountAmount={setDiscountAmount}
          onTaxPercent={setTaxPercent}
          onTipAmount={setTipAmount}
          onApplyAdjustments={() => void refreshSettleBill()}
          onPaymentsChange={setPayments}
          onClose={() => setSettleOpen(false)}
          onComplete={() => void settle()}
        />
      )}
    </div>
  );
}
