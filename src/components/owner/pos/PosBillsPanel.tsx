import { useMemo } from "react";
import type { PosBillListEntry } from "../../../types/owner";
import { fmt } from "./posUtils";

type Props = {
  bills: PosBillListEntry[];
  loading: boolean;
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

export function PosBillsPanel({ bills, loading, onRefresh }: Props) {
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

  return (
    <div className="pp-bills-panel">
      <div className="pp-bills-panel__head">
        <h1 className="pp-floor-title">All bills</h1>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>
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
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
