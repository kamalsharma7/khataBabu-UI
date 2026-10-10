import { useCallback, useEffect, useState } from "react";
import {
  createInventoryItem,
  fetchInventoryAnalytics,
  listInventoryItems,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { InventoryAnalytics, InventoryItem } from "../../types/owner";

type Props = { embedded?: boolean };

export function OwnerInventoryPage({ embedded }: Props) {
  const { outlet } = useOwnerOutlet();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        listInventoryItems(outlet.id),
        fetchInventoryAnalytics(outlet.id),
      ]);
      setItems(list);
      setAnalytics(stats);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = async () => {
    if (!outlet || !name.trim()) return;
    try {
      await createInventoryItem(outlet.id, { name: name.trim(), unit: "pcs", opening_stock: 0 });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not add item");
    }
  };

  return (
    <div className={embedded ? "pp-embedded-page" : "owner-page"}>
      {!embedded && <h1>Inventory</h1>}
      {error && <p className="form-error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="inv-toolbar card">
        <label className="field">
          <span>New stock item</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer 1kg pack" />
        </label>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void addItem()}>
          Add
        </button>
      </div>

      <div className="inv-grid">
        <section className="card">
          <h2>Current stock</h2>
          <ul className="inv-list">
            {items.map((i) => (
              <li key={i.id}>
                <strong>{i.name}</strong>
                <span>{i.current_stock} {i.unit}</span>
              </li>
            ))}
            {items.length === 0 && <li className="muted">No inventory items yet.</li>}
          </ul>
        </section>

        {analytics && (
          <>
            <section className="card">
              <h2>Usage by weekday (last 90 days)</h2>
              <ul className="inv-list">
                {analytics.usage_by_weekday.map((b) => (
                  <li key={b.label}>
                    <span>{b.label}</span>
                    <span>{b.total_qty}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card">
              <h2>Usage by month</h2>
              <ul className="inv-list">
                {analytics.usage_by_month.map((b) => (
                  <li key={b.label}>
                    <span>{b.label}</span>
                    <span>{b.total_qty}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
