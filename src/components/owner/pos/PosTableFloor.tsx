import type { FloorAreaStatus, FloorTableStatus } from "../../../types/owner";
import { fmt } from "./posUtils";

type Props = {
  areas: FloorAreaStatus[];
  loading: boolean;
  onSelectTable: (table: FloorTableStatus) => void;
  onViewOrder: (table: FloorTableStatus) => void;
};

function tableClass(t: FloorTableStatus): string {
  switch (t.visual_state) {
    case "running_kot":
      return "pp-table pp-table--kot";
    case "running":
      return "pp-table pp-table--running";
    case "printed":
      return "pp-table pp-table--printed";
    default:
      return "pp-table pp-table--blank";
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
          <h2 className="pp-floor-area__name">{area.name}</h2>
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
                  <span className="pp-table__label">{t.label}</span>
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
