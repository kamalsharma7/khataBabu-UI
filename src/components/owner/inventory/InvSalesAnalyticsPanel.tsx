import { useMemo, useState } from "react";
import type { InventorySalesAnalytics } from "../../../types/owner";
import { InvAnalyticsPivotTable } from "./InvAnalyticsPivotTable";
import {
  dailyPivot,
  monthlyPivot,
  quarterlyPivot,
  weekdayPivot,
  weekendPivot,
  weeklyPivot,
  yearlyPivot,
} from "./invAnalyticsPivot";
import {
  catalogItemRows,
  fmtQty,
  PERIOD_OPTIONS,
  periodRangeLabel,
  VIEW_META,
  weekdayChartData,
  type AnalyticsView,
} from "./invAnalyticsFormat";
import { InvQuantityBar } from "./InvQuantityBar";

type Props = {
  analytics: InventorySalesAnalytics;
  days: number;
  onDaysChange: (d: number) => void;
  view: AnalyticsView;
  onViewChange: (v: AnalyticsView) => void;
};

const PIVOT_VIEWS: AnalyticsView[] = [
  "daily",
  "weekly",
  "weekday",
  "weekend",
  "monthly",
  "quarterly",
  "yearly",
];

export function InvSalesAnalyticsPanel({
  analytics,
  days,
  onDaysChange,
  view,
  onViewChange,
}: Props) {
  const [hideZeroQty, setHideZeroQty] = useState(true);
  const meta = VIEW_META[view];
  const periodLabel = PERIOD_OPTIONS.find((p) => p.days === days)?.label ?? `Last ${days} days`;

  const summary = useMemo(() => {
    const ov = analytics.overview;
    const totalKot = ov
      ? parseFloat(ov.total_units_sold)
      : analytics.by_day.reduce((s, d) => s + parseFloat(d.total_quantity), 0);
    const weekend = ov
      ? parseFloat(ov.weekend_units)
      : analytics.by_weekday
          .filter((w) => w.is_weekend)
          .reduce((s, w) => s + parseFloat(w.total_quantity), 0);
    const weekday = ov
      ? parseFloat(ov.weekday_units)
      : analytics.by_weekday
          .filter((w) => !w.is_weekend)
          .reduce((s, w) => s + parseFloat(w.total_quantity), 0);
    const catalog = ov?.menu_items_in_catalog ?? analytics.by_item?.length ?? 0;
    const linesCounted = ov?.order_lines_counted ?? 0;
    const daysWithSales = ov?.active_sale_days
      ?? analytics.by_day.filter((d) => parseFloat(d.total_quantity) > 0).length;
    const items = catalogItemRows(analytics);
    const top = items.find((r) => parseFloat(r.total_quantity) > 0) ?? items[0];
    return { totalKot, weekend, weekday, top, daysWithSales, catalog, linesCounted, items };
  }, [analytics]);

  const pivotTable = useMemo(() => {
    switch (view) {
      case "daily":
        return dailyPivot(analytics);
      case "weekly":
        return weeklyPivot(analytics);
      case "weekday":
        return weekdayPivot(analytics);
      case "weekend":
        return weekendPivot(analytics);
      case "monthly":
        return monthlyPivot(analytics);
      case "quarterly":
        return quarterlyPivot(analytics);
      case "yearly":
        return yearlyPivot(analytics);
      default:
        return null;
    }
  }, [analytics, view]);

  const chartDays = useMemo(() => weekdayChartData(analytics), [analytics]);

  const pivotEmptyMessage =
    hideZeroQty
      ? "No sales in this period. Uncheck “Hide items with no sales” to see your full menu."
      : "No data for this period.";

  return (
    <section className="inv-pro__analytics card inv-analytics">
      <header className="inv-analytics__header">
        <div className="inv-analytics__title-block">
          <h2>Sales analytics</h2>
          <div className="inv-analytics__active-filters">
            <span className="inv-analytics__filter-chip inv-analytics__filter-chip--view">
              View: <strong>{meta.label}</strong>
            </span>
            <span className="inv-analytics__filter-chip">
              Period: <strong>{periodLabel}</strong>
            </span>
            <span className="inv-analytics__filter-chip inv-analytics__filter-chip--muted">
              {periodRangeLabel(analytics.from_date, analytics.to_date)}
            </span>
          </div>
        </div>
        <label className="inv-analytics__period-select">
          <span>Report period</span>
          <select
            value={days}
            onChange={(e) => onDaysChange(parseInt(e.target.value, 10))}
            aria-label="Report period"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.days} value={p.days}>{p.label}</option>
            ))}
          </select>
        </label>
      </header>

      <nav className="inv-analytics__seg" aria-label="Analytics view">
        {(Object.keys(VIEW_META) as AnalyticsView[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={`inv-analytics__seg-btn ${view === id ? "inv-analytics__seg-btn--active" : ""}`}
            onClick={() => onViewChange(id)}
          >
            {VIEW_META[id].label}
          </button>
        ))}
      </nav>

      <div className="inv-analytics__view-head">
        <div className="inv-analytics__view-head-row">
          <h3>{meta.title}</h3>
          {(PIVOT_VIEWS.includes(view) || view === "items") && (
            <label className="inv-analytics__hide-zero">
              <input
                type="checkbox"
                checked={hideZeroQty}
                onChange={(e) => setHideZeroQty(e.target.checked)}
              />
              Hide zero sales
            </label>
          )}
        </div>
      </div>

      <div className="inv-analytics__kpi-row inv-analytics__kpi-row--compact inv-analytics__kpi-row--three">
        <article className="inv-analytics__kpi">
          <span>Units sold</span>
          <strong>{fmtQty(summary.totalKot)}</strong>
        </article>
        <article className="inv-analytics__kpi">
          <span>Active days</span>
          <strong>{summary.daysWithSales}</strong>
        </article>
        <article className="inv-analytics__kpi inv-analytics__kpi--highlight">
          <span>Top seller</span>
          <strong className="inv-analytics__kpi-top-name">
            {summary.top && parseFloat(summary.top.total_quantity) > 0 ? summary.top.item_name : "—"}
          </strong>
        </article>
      </div>

      <div className="inv-analytics__body" role="tabpanel" data-inv-scroll="analytics">
        {view === "weekday" && (
          <div className="inv-analytics__chart inv-analytics__chart--compact">
            <p className="inv-analytics__chart-title">Outlet total by weekday</p>
            <div className="inv-analytics__chart-bars">
              {chartDays.map((d) => (
                <div key={d.day} className="inv-analytics__chart-col">
                  <div className="inv-analytics__chart-bar-wrap">
                    <div
                      className={`inv-analytics__chart-bar ${d.isWeekend ? "inv-analytics__chart-bar--we" : ""}`}
                      style={{ height: `${d.pctOfMax}%` }}
                      title={`${d.day}: ${fmtQty(d.total)}`}
                    />
                  </div>
                  <span className="inv-analytics__chart-label">{d.short}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pivotTable && (
          <InvAnalyticsPivotTable
            table={pivotTable}
            hideZeroQty={hideZeroQty}
            emptyMessage={pivotEmptyMessage}
          />
        )}

        {view === "items" && (
          <div className="inv-analytics-table-wrap">
            <table className="inv-analytics-table">
              <thead>
                <tr>
                  <th className="inv-analytics-table__rank">#</th>
                  <th>Menu item</th>
                  <th className="inv-analytics-table__num">Total qty</th>
                  <th className="inv-analytics-table__num">Weekdays</th>
                  <th className="inv-analytics-table__num">Weekends</th>
                  <th>Share of total</th>
                </tr>
              </thead>
              <tbody>
                {summary.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="inv-analytics-empty-cell">
                      No menu items in catalog.
                    </td>
                  </tr>
                ) : (
                  summary.items
                    .filter((row) => !hideZeroQty || parseFloat(row.total_quantity) > 0)
                    .map((row, index) => (
                      <tr
                        key={row.menu_item_id ?? row.item_name}
                        className={
                          parseFloat(row.total_quantity) === 0 ? "inv-analytics-table__row--zero" : undefined
                        }
                      >
                        <td className="inv-analytics-table__rank">{index + 1}</td>
                        <td className="inv-analytics-table__item">
                          <strong>{row.item_name}</strong>
                        </td>
                        <td className="inv-analytics-table__num inv-analytics-table__qty">
                          {fmtQty(row.total_quantity)}
                        </td>
                        <td className="inv-analytics-table__num">{fmtQty(row.weekday_quantity)}</td>
                        <td className="inv-analytics-table__num">{fmtQty(row.weekend_quantity)}</td>
                        <td className="inv-analytics-table__bar">
                          <span className="inv-analytics-table__share">{row.sharePct.toFixed(1)}%</span>
                          <InvQuantityBar pct={row.sharePct} />
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
