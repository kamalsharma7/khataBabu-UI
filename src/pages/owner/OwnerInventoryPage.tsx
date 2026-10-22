import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AnalyticsView } from "../../components/owner/inventory/invAnalyticsFormat";
import { InvSalesAnalyticsPanel } from "../../components/owner/inventory/InvSalesAnalyticsPanel";
import { InvTrackStockModal } from "../../components/owner/inventory/InvTrackStockModal";
import {
  fmtQty,
  isStockSetForToday,
  statusLabel,
  stockStatus,
} from "../../components/owner/inventory/invUtils";
import {
  bulkSetInventoryDailyStock,
  deleteInventoryItem,
  fetchInventorySalesAnalytics,
  listInventoryItems,
  listMenuCategories,
  listMenuItems,
  trackMenuInventory,
  unlinkMenuInventory,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { InventoryItem, InventorySalesAnalytics, MenuCategory, MenuItem } from "../../types/owner";

type Props = { embedded?: boolean };

type TrackedRow = {
  inventory: InventoryItem;
  menuId: string;
  menuName: string;
  qtyPerKot: string;
};

export function OwnerInventoryPage({ embedded }: Props) {
  const { outlet } = useOwnerOutlet();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [analytics, setAnalytics] = useState<InventorySalesAnalytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>("daily");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyDraft, setDailyDraft] = useState<Record<string, string>>({});
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [trackUnit, setTrackUnit] = useState("pcs");
  const [trackQtyPerKot, setTrackQtyPerKot] = useState("1");
  const [trackTodayQty, setTrackTodayQty] = useState("");

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Asia/Kolkata",
      }),
    [],
  );

  const trackedRows = useMemo((): TrackedRow[] => {
    const rows: TrackedRow[] = [];
    for (const inv of items) {
      for (const link of inv.linked_menu_items) {
        rows.push({
          inventory: inv,
          menuId: link.menu_item_id,
          menuName: link.menu_item_name,
          qtyPerKot: link.qty_per_serve,
        });
      }
    }
    return rows.sort((a, b) => a.menuName.localeCompare(b.menuName));
  }, [items]);

  const menuById = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const trackedMenuIds = useMemo(
    () => new Set(trackedRows.map((r) => r.menuId)),
    [trackedRows],
  );

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems, menuSearch]);

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const [list, menu, cats, stats] = await Promise.all([
        listInventoryItems(outlet.id, "daily"),
        listMenuItems(outlet.id),
        listMenuCategories(outlet.id),
        fetchInventorySalesAnalytics(outlet.id, analyticsDays),
      ]);
      setItems(list);
      setMenuItems(menu);
      setCategories(cats);
      setAnalytics(stats);
      const draft: Record<string, string> = {};
      for (const inv of list) {
        if (isStockSetForToday(inv)) {
          draft[inv.id] = inv.today_opening ?? "";
        } else {
          draft[inv.id] = inv.daily_par ?? "";
        }
      }
      setDailyDraft(draft);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }, [outlet, analyticsDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAllMorningStock = async () => {
    if (!outlet) return;
    const seen = new Set<string>();
    const payload: { inventory_item_id: string; quantity: number }[] = [];
    for (const r of trackedRows) {
      if (seen.has(r.inventory.id)) continue;
      seen.add(r.inventory.id);
      const raw = dailyDraft[r.inventory.id];
      const qty = parseFloat(raw);
      if (raw === "" || Number.isNaN(qty) || qty < 0) continue;
      payload.push({ inventory_item_id: r.inventory.id, quantity: qty });
    }
    if (payload.length === 0) {
      setError("Enter today's opening count for at least one item");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await bulkSetInventoryDailyStock(outlet.id, payload);
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save stock");
    } finally {
      setSaving(false);
    }
  };

  const openTrackForm = (menu: MenuItem) => {
    setSelectedMenuId(menu.id);
    const existing = trackedRows.find((r) => r.menuId === menu.id);
    if (existing) {
      setTrackUnit(existing.inventory.unit);
      setTrackQtyPerKot(existing.qtyPerKot);
      setTrackTodayQty(
        isStockSetForToday(existing.inventory)
          ? existing.inventory.today_opening ?? ""
          : existing.inventory.daily_par ?? "",
      );
    } else {
      setTrackUnit("pcs");
      setTrackQtyPerKot("1");
      setTrackTodayQty("");
    }
  };

  const closeTrackForm = () => setSelectedMenuId(null);

  const submitTrack = async () => {
    if (!outlet || !selectedMenuId) return;
    const todayQty = parseFloat(trackTodayQty);
    const perKot = parseFloat(trackQtyPerKot);
    if (Number.isNaN(todayQty) || todayQty < 0) {
      setError("Enter valid opening count for today");
      return;
    }
    if (Number.isNaN(perKot) || perKot <= 0) {
      setError("Deduct per KOT must be greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await trackMenuInventory(outlet.id, {
        menu_item_id: selectedMenuId,
        unit: trackUnit,
        qty_per_kot: perKot,
        today_quantity: todayQty,
      });
      setSelectedMenuId(null);
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not enable tracking");
    } finally {
      setSaving(false);
    }
  };

  const stopTracking = async (row: TrackedRow) => {
    if (!outlet) return;
    if (!confirm(`Stop stock tracking for "${row.menuName}"?`)) return;
    setSaving(true);
    try {
      await unlinkMenuInventory(outlet.id, row.menuId, row.inventory.id);
      if (row.inventory.linked_menu_items.length <= 1) {
        await deleteInventoryItem(outlet.id, row.inventory.id);
      }
      if (selectedMenuId === row.menuId) setSelectedMenuId(null);
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not remove tracking");
    } finally {
      setSaving(false);
    }
  };

  const selectedMenu = selectedMenuId ? menuById.get(selectedMenuId) : null;
  const unsetCount = trackedRows.filter((r) => !isStockSetForToday(r.inventory)).length;

  return (
    <div className={embedded ? "inv-pro inv-pro--embedded" : "inv-pro owner-page"}>
      <header className="inv-pro__page-head">
        <div>
          {embedded ? (
            <h1 className="inv-pro__embedded-title">Stock &amp; sales</h1>
          ) : (
            <>
              <h1>Stock &amp; sales</h1>
              <p className="inv-pro__lead">
                Morning: set <strong>aaj ka stock</strong> for bottled / counted items. Kitchen ingredients
                live under <Link to="/app/raw-materials">Raw materials</Link>. Billing deducts on{" "}
                <strong>KOT</strong>.
              </p>
            </>
          )}
        </div>
        <div className="inv-pro__head-meta">
          <span className="inv-pro__date-pill">{todayLabel}</span>
          {unsetCount > 0 && (
            <span className="inv-pro__alert-pill">{unsetCount} need today&apos;s count</span>
          )}
        </div>
      </header>

      {error && <p className="form-error inv-pro__error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="inv-pro__top">
        <section className="inv-pro__panel card">
          <header className="inv-pro__panel-head">
            <div>
              <h2>Aaj ka stock</h2>
              <p className="muted">
                Opening count for bottled / counted dishes. Kitchen ingredients:{" "}
                <Link to="/app/raw-materials">Raw materials</Link>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving || trackedRows.length === 0}
              onClick={() => void saveAllMorningStock()}
            >
              Save all counts
            </button>
          </header>
          <div className="inv-pro__scroll-zone">
            {trackedRows.length === 0 ? (
              <p className="inv-pro__empty">
                No items tracked yet. Use <strong>+ Track stock</strong> on a menu item (right).
              </p>
            ) : (
              <table className="inv-pro__stock-table">
                <thead>
                  <tr>
                    <th>Menu item</th>
                    <th>Opening</th>
                    <th>Sold</th>
                    <th>Left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trackedRows.map((row) => {
                    const st = stockStatus(row.inventory);
                    return (
                      <tr key={`${row.inventory.id}-${row.menuId}`} className={`inv-pro__stock-${st}`}>
                        <td>
                          <strong>{row.menuName}</strong>
                          <span className="inv-pro__sub">
                            {fmtQty(row.qtyPerKot)} {row.inventory.unit}/KOT
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="inv-pro__qty-input"
                            value={dailyDraft[row.inventory.id] ?? ""}
                            onChange={(e) =>
                              setDailyDraft((d) => ({ ...d, [row.inventory.id]: e.target.value }))
                            }
                            aria-label={`Opening count ${row.menuName}`}
                          />
                        </td>
                        <td>{fmtQty(row.inventory.sold_today)}</td>
                        <td>
                          <strong>{fmtQty(row.inventory.remaining_today)}</strong>
                        </td>
                        <td>
                          <span className={`inv-pro__status inv-pro__status--${st}`}>
                            {statusLabel(st)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="inv-pro__panel card">
          <header className="inv-pro__panel-head">
            <div>
              <h2>Menu items</h2>
              <p className="muted">Enable or edit stock tracking</p>
            </div>
            <input
              className="inv-pro__search"
              placeholder="Search menu…"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </header>
          <div className="inv-pro__scroll-zone inv-pro__scroll-zone--menu">
            <div className="inv-pro__menu-list">
              {filteredMenu.map((m) => {
                const tracked = trackedRows.find((r) => r.menuId === m.id);
                const cat = catById.get(m.category_id) ?? "";
                const st = tracked ? stockStatus(tracked.inventory) : null;
                return (
                  <div
                    key={m.id}
                    className={`inv-pro__menu-row ${selectedMenuId === m.id ? "inv-pro__menu-row--on" : ""}`}
                  >
                    <div className="inv-pro__menu-row-main">
                      <span
                        className={`inv-pro__veg ${m.is_veg ? "inv-pro__veg--v" : "inv-pro__veg--nv"}`}
                        title={m.is_veg ? "Veg" : "Non-veg"}
                      />
                      <div>
                        <strong>{m.name}</strong>
                        <span className="muted inv-pro__sub">{cat}</span>
                      </div>
                    </div>
                    <div className="inv-pro__menu-row-actions">
                      {tracked ? (
                        <>
                          <span className={`inv-pro__status inv-pro__status--${st}`}>
                            {fmtQty(tracked.inventory.remaining_today)} left
                          </span>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openTrackForm(m)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm inv-pro__btn-danger"
                            onClick={() => void stopTracking(tracked)}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => openTrackForm(m)}>
                          + Track stock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredMenu.length === 0 && (
                <p className="inv-pro__empty">No menu items. Add items under Menu setup first.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {analytics && (
        <InvSalesAnalyticsPanel
          analytics={analytics}
          days={analyticsDays}
          onDaysChange={setAnalyticsDays}
          view={analyticsView}
          onViewChange={setAnalyticsView}
        />
      )}

      {selectedMenu && (
        <InvTrackStockModal
          menuName={selectedMenu.name}
          isUpdate={trackedMenuIds.has(selectedMenu.id)}
          unit={trackUnit}
          qtyPerKot={trackQtyPerKot}
          todayQty={trackTodayQty}
          busy={saving}
          onUnitChange={setTrackUnit}
          onQtyPerKotChange={setTrackQtyPerKot}
          onTodayQtyChange={setTrackTodayQty}
          onClose={closeTrackForm}
          onSubmit={() => void submitTrack()}
        />
      )}
    </div>
  );
}
