import type { FloorAreaStatus, FloorTableStatus } from "../../../types/owner";
import { fmt } from "./posUtils";

type Props = {
  areas: FloorAreaStatus[];
  loading: boolean;
  onSelectTable: (table: FloorTableStatus) => void;
  onViewOrder: (table: FloorTableStatus) => void;
};

function tableClass(t: FloorTableStatus): string {
  const time = t.resource_kind === "time_based" ? " pp-table--time" : "";
  switch (t.visual_state) {
    case "running_kot":
      return `pp-table pp-table--kot${time}`;
    case "running":
      return `pp-table pp-table--running${time}`;
    case "printed":
      return `pp-table pp-table--printed${time}`;
    default:
      return `pp-table pp-table--blank${time}`;
  }
}

export function PosTableFloor({ areas, loading, onSelectTable, onViewOrder }: Props) {
  return (
    <div className="pp-floor">
      <div className="pp-floor-top">
        <h1 className="pp-floor-title">Billing</h1>
        <div className="pp-legend">
          <span><i className="pp-legend-swatch pp-legend-swatch--blank" /> Blank</span>
          <span><i className="pp-legend-swatch pp-legend-swatch--running" /> Running</span>
          <span><i className="pp-legend-swatch pp-legend-swatch--kot" /> Running KOT</span>
          <span><i className="pp-legend-swatch pp-legend-swatch--printed" /> Bill printed</span>
        </div>
      </div>

      {loading && <p className="muted">Loading tables…</p>}

      {areas.map((area) => (
        <section key={area.area_id} className="pp-floor-area">
          <div className="pp-floor-area__head">
            <h2 className="pp-floor-area__name">{area.name}</h2>
            {(area.billing_mode ?? "dine_in") === "time_based" && area.operating_start && area.operating_end && (
              <span className="pp-floor-area__hours">
                {area.operating_start} – {area.operating_end}
                {area.hourly_rate ? ` · ₹${area.hourly_rate}/hr` : ""}
              </span>
            )}
          </div>
          <div className="pp-floor-grid">
            {area.tables.map((t) => (
              <div key={t.table_id} className={tableClass(t)}>
                <button
                  type="button"
                  className="pp-table__body"
                  onClick={() => onSelectTable(t)}
                >
                  {t.visual_state === "running_kot" && t.minutes_elapsed != null && (
                    <span className="pp-table__mins">{t.minutes_elapsed} Min</span>
                  )}
                  {t.kot_count > 0 && t.last_kot_at && (
                    <span className="pp-table__kot-time">
                      KOT{t.kot_count > 1 ? ` ×${t.kot_count}` : ""}{" "}
                      {new Date(t.last_kot_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {t.resource_kind === "time_based" && (
                    <span className="pp-table__time-badge">⏱</span>
                  )}
                  <span className="pp-table__label">{t.label}</span>
                  {t.resource_kind === "time_based" && t.hourly_rate && !t.is_occupied && (
                    <span className="pp-table__rate">₹{t.hourly_rate}/hr</span>
                  )}
                  {t.is_occupied && t.running_total != null && (
                    <span className="pp-table__amt">{fmt(t.running_total)}</span>
                  )}
                </button>
                {t.is_occupied && (
                  <div className="pp-table__actions">
                    <button
                      type="button"
                      className="pp-table__icon-btn"
                      title="Open order"
                      onClick={() => onViewOrder(t)}
                    >
                      👁
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
