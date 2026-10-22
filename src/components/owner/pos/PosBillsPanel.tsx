import { useMemo, useState } from "react";
import { posGetBillDetail } from "../../../api/owner";
import { OwnerApiError } from "../../../api/ownerClient";
import type { PosBillDetail, PosBillListEntry } from "../../../types/owner";
import { PosBillDetailModal } from "./PosBillDetailModal";
import { fmt } from "./posUtils";

type Props = {
  outletId: string;
  bills: PosBillListEntry[];
  loading: boolean;
  canRefund?: boolean;
  onRefresh: () => void;
};

function billDateKey(iso: string | null | undefined): string {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function billTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function PosBillsPanel({ outletId, bills, loading, canRefund = false, onRefresh }: Props) {
  const [detail, setDetail] = useState<PosBillDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, PosBillListEntry[]>();
    for (const b of bills) {
      const key = billDateKey(b.settled_at ?? b.created_at);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [bills]);

  const openDetail = async (billId: string) => {
    setDetailError(null);
    setDetailLoadingId(billId);
    try {
      setDetail(await posGetBillDetail(outletId, billId));
    } catch (err) {
      setDetailError(err instanceof OwnerApiError ? err.message : "Could not load bill details");
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <div className="pp-bills-panel">
      <div className="pp-bills-panel__head">
        <h1 className="pp-floor-title">All bills</h1>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>
      {detailError && <p className="form-error">{detailError}</p>}
      {loading && <p className="muted">Loading bills…</p>}
      {!loading && bills.length === 0 && <p className="muted">No settled bills yet.</p>}
      {grouped.map(([date, rows]) => (
        <section key={date} className="pp-bills-day">
          <h2 className="pp-bills-day__title">{date}</h2>
          <ul className="pp-bills-day__list">
            {rows.map((b) => (
              <li key={b.id} className="pp-bills-row">
                <div className="pp-bills-row__main">
                  <strong>Bill #{b.bill_number}</strong>
                  <span className="muted">Order #{b.order_number}</span>
                  {b.table_label && <span>{b.table_label}</span>}
                  {b.customer_name && <span>{b.customer_name}</span>}
                </div>
                <div className="pp-bills-row__meta">
                  <span>{billTime(b.settled_at ?? b.created_at)}</span>
                  <strong>{fmt(b.grand_total)}</strong>
                </div>
                <div className="pp-bills-row__pay muted">
                  {b.payments.map((p) => `${p.method} ${fmt(p.amount)}`).join(" · ") || "—"}
                </div>
                <div className="pp-bills-row__actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={detailLoadingId === b.id}
                    onClick={() => void openDetail(b.id)}
                  >
                    {detailLoadingId === b.id ? "Loading…" : "View bill"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {detail && (
        <PosBillDetailModal
          detail={detail}
          outletId={outletId}
          canRefund={canRefund}
          onClose={() => setDetail(null)}
          onRefunded={onRefresh}
        />
      )}
    </div>
  );
}
