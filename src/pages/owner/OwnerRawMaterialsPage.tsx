import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  adjustInventoryStock,
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  listInventoryTransactions,
  updateInventoryItem,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { parseQty, RAW_MATERIAL_CATEGORIES, RAW_MATERIAL_UNITS, rawCategoryLabel } from "../../data/rawMaterials";
import { fmtQty } from "../../components/owner/inventory/invUtils";
import type { InventoryItem, InventoryTransaction, StockAdjustReason } from "../../types/owner";

type FormState = {
  name: string;
  category: string;
  unit: string;
  opening_stock: string;
  low_stock_threshold: string;
  cost_per_unit: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  category: "grocery",
  unit: "kg",
  opening_stock: "0",
  low_stock_threshold: "",
  cost_per_unit: "",
  notes: "",
});

function rawStatus(item: InventoryItem): "ok" | "low" | "out" {
  const stock = parseQty(item.current_stock);
  if (stock <= 0) return "out";
  const min = parseQty(item.low_stock_threshold);
  if (min > 0 && stock <= min) return "low";
  return "ok";
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function OwnerRawMaterialsPage() {
  const { outlet } = useOwnerOutlet();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);

  const [editor, setEditor] = useState<{ open: boolean; item: InventoryItem | null }>({
    open: false,
    item: null,
  });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [stockModal, setStockModal] = useState<{
    item: InventoryItem;
    reason: StockAdjustReason;
  } | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockNotes, setStockNotes] = useState("");

  const [ledger, setLedger] = useState<{ item: InventoryItem; rows: InventoryTransaction[] } | null>(null);

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await listInventoryItems(outlet.id, "raw"));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load raw materials");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryId !== "all" && item.category !== categoryId) return false;
      if (lowOnly && rawStatus(item) === "ok") return false;
      if (q && !item.name.toLowerCase().includes(q) && !rawCategoryLabel(item.category).toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, search, categoryId, lowOnly]);

  const counts = useMemo(() => {
    const byCat = new Map<string, number>();
    let low = 0;
    let value = 0;
    for (const item of items) {
      byCat.set(item.category, (byCat.get(item.category) ?? 0) + 1);
      if (rawStatus(item) !== "ok") low += 1;
      value += parseQty(item.current_stock) * parseQty(item.cost_per_unit);
    }
    return { byCat, low, value };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditor({ open: true, item: null });
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      category: item.category || "grocery",
      unit: item.unit || "kg",
      opening_stock: item.current_stock,
      low_stock_threshold: item.low_stock_threshold ?? "",
      cost_per_unit: item.cost_per_unit ?? "",
      notes: item.notes ?? "",
    });
    setEditor({ open: true, item });
  };

  const saveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet) return;
    const name = form.name.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const min = form.low_stock_threshold.trim() ? parseQty(form.low_stock_threshold) : null;
      const cost = form.cost_per_unit.trim() ? parseQty(form.cost_per_unit) : null;
      if (editor.item) {
        await updateInventoryItem(outlet.id, editor.item.id, {
          name,
          unit: form.unit,
          category: form.category,
          low_stock_threshold: min,
          cost_per_unit: cost,
          notes: form.notes.trim() || null,
        });
      } else {
        await createInventoryItem(outlet.id, {
          name,
          unit: form.unit,
          category: form.category,
          tracks_daily: false,
          opening_stock: parseQty(form.opening_stock),
          low_stock_threshold: min,
          cost_per_unit: cost,
          notes: form.notes.trim() || null,
        });
      }
      setEditor({ open: false, item: null });
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save raw material");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: InventoryItem) => {
    if (!outlet) return;
    if (!window.confirm(`Delete raw material "${item.name}"? Recipes using it will stop deducting this item.`)) {
      return;
    }
    try {
      await deleteInventoryItem(outlet.id, item.id);
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not delete");
    }
  };

  const submitStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !stockModal) return;
    const qty = parseQty(stockQty);
    if (stockModal.reason !== "opening" && qty <= 0) {
      setError("Enter a quantity greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adjustInventoryStock(outlet.id, stockModal.item.id, {
        reason: stockModal.reason,
        quantity: qty,
        notes: stockNotes.trim() || null,
      });
      setStockModal(null);
      setStockQty("");
      setStockNotes("");
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Stock update failed");
    } finally {
      setSaving(false);
    }
  };

  const openLedger = async (item: InventoryItem) => {
    if (!outlet) return;
    try {
      const rows = await listInventoryTransactions(outlet.id, item.id);
      setLedger({ item, rows });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load ledger");
    }
  };

  const stockTitle = stockModal
    ? stockModal.reason === "purchase"
      ? "Stock in (purchase)"
      : stockModal.reason === "wastage"
        ? "Record wastage"
        : "Set opening / current stock"
    : "";

  if (!outlet) return <p className="muted">Select an outlet to manage raw materials.</p>;

  return (
    <div className="page rm-page">
      <header className="ir-page__head">
        <div>
          <h1>Raw materials</h1>
          <p className="muted">
            Kitchen stock that recipes consume — flour, oil, chicken, packaging. Purchases add,
            wastage and KOT recipes subtract.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Add material
        </button>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="rm-stats">
        <div className="rm-stat">
          <span>Materials</span>
          <strong>{items.length}</strong>
        </div>
        <div className={`rm-stat ${counts.low ? "rm-stat--warn" : ""}`}>
          <span>Low / out</span>
          <strong>{counts.low}</strong>
        </div>
        <div className="rm-stat">
          <span>Stock value</span>
          <strong>{formatInr(counts.value)}</strong>
        </div>
      </section>

      <section className="card ir-filters">
        <div className="ir-filters__row">
          <label className="field ir-filter-field">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Paneer, oil, chicken…"
            />
          </label>
          <label className="field ir-filter-field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">All categories</option>
              {RAW_MATERIAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="field field--checkbox rm-low-toggle">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
            />
            <span>Low stock only</span>
          </label>
        </div>
      </section>

      <div className="ir-category-tabs" role="tablist" aria-label="Raw material categories">
        <button
          type="button"
          className={`ir-cat-tab ${categoryId === "all" ? "ir-cat-tab--active" : ""}`}
          onClick={() => setCategoryId("all")}
        >
          All
          <span className="ir-cat-tab__count">{items.length} items</span>
        </button>
        {RAW_MATERIAL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ir-cat-tab ${categoryId === c.id ? "ir-cat-tab--active" : ""}`}
            onClick={() => setCategoryId(c.id)}
          >
            {c.label}
            <span className="ir-cat-tab__count">{counts.byCat.get(c.id) ?? 0}</span>
          </button>
        ))}
      </div>

      <section className="card ir-table-card">
        <div className="table-wrap">
          <table className="data-table ir-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th className="terr-num">Current stock</th>
                <th className="terr-num">Min stock</th>
                <th>Status</th>
                <th className="ir-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="muted ir-empty-cell">Loading…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted ir-empty-cell">
                    No raw materials yet. Add chicken, flour, oil, packaging — then pick them on Item recipes.
                  </td>
                </tr>
              )}
              {filtered.map((item) => {
                const st = rawStatus(item);
                return (
                  <tr key={item.id} className={st !== "ok" ? `rm-row--${st}` : undefined}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.cost_per_unit && (
                        <div className="ir-menu-link muted">
                          {formatInr(parseQty(item.cost_per_unit))} / {item.unit}
                        </div>
                      )}
                    </td>
                    <td>{rawCategoryLabel(item.category)}</td>
                    <td>{item.unit}</td>
                    <td className="terr-num">
                      <strong>{fmtQty(item.current_stock)}</strong>
                    </td>
                    <td className="terr-num">
                      {item.low_stock_threshold ? fmtQty(item.low_stock_threshold) : "—"}
                    </td>
                    <td>
                      <span className={`rm-pill rm-pill--${st}`}>
                        {st === "ok" ? "In stock" : st === "low" ? "Low" : "Out"}
                      </span>
                    </td>
                    <td>
                      <div className="ir-row-actions">
                        <button type="button" className="ir-icon-btn" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ir-icon-btn"
                          onClick={() => {
                            setStockQty("");
                            setStockNotes("");
                            setStockModal({ item, reason: "purchase" });
                          }}
                        >
                          In
                        </button>
                        <button
                          type="button"
                          className="ir-icon-btn"
                          onClick={() => {
                            setStockQty("");
                            setStockNotes("");
                            setStockModal({ item, reason: "wastage" });
                          }}
                        >
                          Waste
                        </button>
                        <button type="button" className="ir-icon-btn" onClick={() => void openLedger(item)}>
                          Ledger
                        </button>
                        <button
                          type="button"
                          className="ir-icon-btn ir-icon-btn--danger"
                          onClick={() => void removeItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="ir-table-footer muted">
          Showing {filtered.length} of {items.length} materials
        </footer>
      </section>

      {editor.open && (
        <div className="ir-modal-backdrop" role="presentation" onClick={() => setEditor({ open: false, item: null })}>
          <div className="ir-modal card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="ir-modal__head">
              <div className="ir-modal__head-copy">
                <span className={`ir-mode-badge ${editor.item ? "ir-mode-badge--edit" : "ir-mode-badge--create"}`}>
                  {editor.item ? "Edit" : "New"}
                </span>
                <h2>{editor.item ? "Edit raw material" : "Add raw material"}</h2>
                <p className="ir-modal__subtitle">
                  Persistent kitchen stock. Link it on Item recipes so KOT deducts automatically.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditor({ open: false, item: null })}>
                Close
              </button>
            </header>
            <form className="ir-form" onSubmit={saveItem}>
              <div className="ir-modal__body">
                <section className="ir-section">
                  <div className="ir-grid">
                    <label className="field ir-grid--full">
                      <span>Name</span>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Mozzarella, Refined oil"
                        autoFocus
                      />
                    </label>
                    <label className="field">
                      <span>Category</span>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {RAW_MATERIAL_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Unit</span>
                      <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                        {RAW_MATERIAL_UNITS.map((u) => (
                          <option key={u.id} value={u.id}>{u.label}</option>
                        ))}
                      </select>
                    </label>
                    {!editor.item && (
                      <label className="field">
                        <span>Opening stock</span>
                        <input
                          value={form.opening_stock}
                          onChange={(e) => setForm({ ...form, opening_stock: e.target.value })}
                          inputMode="decimal"
                        />
                      </label>
                    )}
                    <label className="field">
                      <span>Min stock (alert)</span>
                      <input
                        value={form.low_stock_threshold}
                        onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                        inputMode="decimal"
                        placeholder="e.g. 2"
                      />
                    </label>
                    <label className="field">
                      <span>Cost per unit (₹)</span>
                      <input
                        value={form.cost_per_unit}
                        onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </label>
                    <label className="field ir-grid--full">
                      <span>Notes</span>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Preferred vendor, storage, etc."
                      />
                    </label>
                  </div>
                </section>
              </div>
              <footer className="ir-modal__foot">
                <button type="button" className="btn btn-secondary" onClick={() => setEditor({ open: false, item: null })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {editor.item ? "Save changes" : "Add material"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {stockModal && (
        <div className="ir-modal-backdrop" role="presentation" onClick={() => setStockModal(null)}>
          <div className="ir-modal card ir-categories-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="ir-modal__head">
              <div className="ir-modal__head-copy">
                <h2>{stockTitle}</h2>
                <p className="ir-modal__subtitle">
                  {stockModal.item.name} · now {fmtQty(stockModal.item.current_stock)} {stockModal.item.unit}
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStockModal(null)}>
                Close
              </button>
            </header>
            <form className="ir-form" onSubmit={submitStock}>
              <div className="ir-modal__body">
                <label className="field">
                  <span>
                    {stockModal.reason === "opening" ? "New stock quantity" : "Quantity"}
                  </span>
                  <input
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    inputMode="decimal"
                    autoFocus
                    placeholder={`In ${stockModal.item.unit}`}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    placeholder="Invoice no., reason…"
                  />
                </label>
                {stockModal.reason !== "opening" && (
                  <p className="muted ir-section__hint">
                    {stockModal.reason === "purchase"
                      ? `After save: ${fmtQty(parseQty(stockModal.item.current_stock) + parseQty(stockQty))} ${stockModal.item.unit}`
                      : `After save: ${fmtQty(Math.max(0, parseQty(stockModal.item.current_stock) - parseQty(stockQty)))} ${stockModal.item.unit}`}
                  </p>
                )}
              </div>
              <footer className="ir-modal__foot">
                <button type="button" className="btn btn-secondary" onClick={() => setStockModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Save
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {ledger && (
        <div className="ir-modal-backdrop" role="presentation" onClick={() => setLedger(null)}>
          <div className="ir-modal card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="ir-modal__head">
              <div className="ir-modal__head-copy">
                <h2>Stock ledger</h2>
                <p className="ir-modal__subtitle">
                  {ledger.item.name} · {fmtQty(ledger.item.current_stock)} {ledger.item.unit} on hand
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLedger(null)}>
                Close
              </button>
            </header>
            <div className="ir-modal__body">
              {ledger.rows.length === 0 ? (
                <p className="ir-empty-note">No movements yet.</p>
              ) : (
                <div className="ir-ing-table-wrap">
                  <table className="ir-ing-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Reason</th>
                        <th>Qty</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {new Date(row.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </td>
                          <td>{row.reason.replace("_", " ")}</td>
                          <td>{parseQty(row.delta) > 0 ? "+" : ""}{fmtQty(row.delta)}</td>
                          <td>{row.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <footer className="ir-modal__foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStockQty(ledger.item.current_stock);
                  setStockNotes("");
                  setStockModal({ item: ledger.item, reason: "opening" });
                  setLedger(null);
                }}
              >
                Set stock
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setLedger(null)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
