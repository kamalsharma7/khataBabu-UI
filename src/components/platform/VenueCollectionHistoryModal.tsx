import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { venueCollectionHistory } from "../../api/platform";
import type { CollectionHistory, RestaurantCollectionRow } from "../../types/platform";

function formatInr(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

interface Props {
  venue: RestaurantCollectionRow;
  onClose: () => void;
}

export function VenueCollectionHistoryModal({ venue, onClose }: Props) {
  const [history, setHistory] = useState<CollectionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHistory(await venueCollectionHistory(venue.business_id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load history");
    } finally {
      setLoading(false);
    }
  }, [venue.business_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = history?.legal_name ?? venue.legal_name;

  return (
    <div className="modal-backdrop platform-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal card platform-detail-modal coll-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coll-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="platform-detail-modal__head">
          <div>
            <h2 id="coll-history-title">{title}</h2>
            <p className="muted">
              <code>{history?.outlet_ref_code ?? venue.outlet_ref_code}</code>
              {" · "}
              {history?.outlet_name ?? venue.outlet_name}
              {" · "}
              {history?.city ?? venue.city}, {history?.state ?? venue.state}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </header>

        <div className="coll-history-summary">
          <div className="coll-history-stat">
            <span className="coll-history-stat__label">Joined</span>
            <span className="coll-history-stat__value">
              {formatDate(history?.joining_date ?? venue.joining_date)}
            </span>
          </div>
          <div className="coll-history-stat coll-history-stat--primary">
            <span className="coll-history-stat__label">Total collected</span>
            <span className="coll-history-stat__value">
              {formatInr(history?.total_collected_inr ?? venue.total_collected_inr)}
            </span>
          </div>
          <div className="coll-history-stat">
            <span className="coll-history-stat__label">Packs recorded</span>
            <span className="coll-history-stat__value">{history?.entries.length ?? venue.pack_count}</span>
          </div>
        </div>

        {loading && <p className="muted">Loading history…</p>}
        {error && <p className="form-error">{error}</p>}

        {!loading && history && history.entries.length === 0 && (
          <p className="muted coll-empty">No collections recorded for this venue yet.</p>
        )}

        {!loading && history && history.entries.length > 0 && (
          <div className="table-wrap coll-history-table-wrap">
            <table className="data-table coll-table">
              <thead>
                <tr>
                  <th>Payment date</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Next payment</th>
                  <th>Notes</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {history.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td><strong>{formatDate(entry.payment_date)}</strong></td>
                    <td className="coll-num coll-num--strong">{formatInr(entry.amount_inr)}</td>
                    <td>{entry.tenure_months} mo</td>
                    <td>{formatDate(entry.next_payment_date)}</td>
                    <td className="coll-history-notes">{entry.notes ?? "—"}</td>
                    <td className="coll-history-recorded">
                      {new Date(entry.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
