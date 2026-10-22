import type { InventorySalesAnalytics, ItemQtyRow } from "../../../types/owner";
import { fmtQty } from "./invUtils";

export type AnalyticsView =
  | "daily"
  | "weekly"
  | "weekday"
  | "weekend"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "items";

export const VIEW_META: Record<
  AnalyticsView,
  { label: string; title: string; description: string }
> = {
  daily: {
    label: "Daily",
    title: "Item × day matrix",
    description:
      "One row per menu item; columns are calendar days. Scroll right for more dates.",
  },
  weekly: {
    label: "Weekly",
    title: "Item × week matrix",
    description: "One row per item; each column is an ISO week in the report range.",
  },
  weekday: {
    label: "Weekday",
    title: "Item × weekday",
    description: "One row per item; columns are Mon–Sun totals for the whole period.",
  },
  weekend: {
    label: "Weekend split",
    title: "Weekday vs weekend",
    description: "One row per item; Mon–Fri and Sat–Sun columns for the report period.",
  },
  monthly: {
    label: "Monthly",
    title: "Item × month matrix",
    description: "One row per menu item; columns are calendar months.",
  },
  quarterly: {
    label: "Quarterly",
    title: "Item × quarter (Q1–Q4)",
    description: "One row per item; columns are financial quarters.",
  },
  yearly: {
    label: "Yearly",
    title: "Item × year",
    description: "One row per menu item; columns are calendar years.",
  },
  items: {
    label: "All items",
    title: "Full menu catalog",
    description:
      "Every menu item in your outlet (plus open items sold), with weekday and weekend split.",
  },
};

export const PERIOD_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 12 months" },
] as const;

export type DetailRow = {
  periodKey: string;
  periodLabel: string;
  itemName: string;
  quantity: number;
  periodTotal: number;
  sharePct: number;
};

function parseQ(s: string): number {
  const v = parseFloat(s);
  return Number.isNaN(v) ? 0 : v;
}

function formatDateIN(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonthIN(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatWeekLabel(week: string, weekStart: string): string {
  return `${week} (from ${formatDateIN(weekStart)})`;
}

function formatQuarterLabel(quarter: string, year: number, quarterNum: number): string {
  return `${quarter} · ${year} Q${quarterNum}`;
}

export function flattenPeriodItems(
  periods: { key: string; label: string; total: string; items: ItemQtyRow[] }[],
): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const p of periods) {
    const periodTotal = parseQ(p.total);
    for (const it of p.items) {
      const quantity = parseQ(it.quantity);
      rows.push({
        periodKey: p.key,
        periodLabel: p.label,
        itemName: it.item_name,
        quantity,
        periodTotal,
        sharePct: periodTotal > 0 ? (quantity / periodTotal) * 100 : 0,
      });
    }
  }
  return rows.sort((a, b) => {
    if (a.periodKey !== b.periodKey) return b.periodKey.localeCompare(a.periodKey);
    return b.quantity - a.quantity;
  });
}

export function filterDetailRows(rows: DetailRow[], hideZeroQty: boolean): DetailRow[] {
  if (!hideZeroQty) return rows;
  return rows.filter((r) => r.quantity > 0);
}

export function dailyDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  return flattenPeriodItems(
    analytics.by_day.map((d) => ({
      key: d.date,
      label: formatDateIN(d.date),
      total: d.total_quantity,
      items: d.items,
    })),
  );
}

export function weeklyDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  const weeks = analytics.by_week ?? [];
  return flattenPeriodItems(
    weeks.map((w) => ({
      key: w.week,
      label: formatWeekLabel(w.week, w.week_start),
      total: w.total_quantity,
      items: w.items,
    })),
  );
}

export function monthlyDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  return flattenPeriodItems(
    analytics.by_month.map((m) => ({
      key: m.month,
      label: formatMonthIN(m.month),
      total: m.total_quantity,
      items: m.items,
    })),
  );
}

export function quarterlyDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  const quarters = analytics.by_quarter ?? [];
  return flattenPeriodItems(
    quarters.map((q) => ({
      key: q.quarter,
      label: formatQuarterLabel(q.quarter, q.year, q.quarter_num),
      total: q.total_quantity,
      items: q.items,
    })),
  );
}

export function yearlyDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  return flattenPeriodItems(
    (analytics.by_year ?? []).map((y) => ({
      key: y.year,
      label: y.year,
      total: y.total_quantity,
      items: y.items,
    })),
  );
}

export function weekendDetailRows(analytics: InventorySalesAnalytics): DetailRow[] {
  const split = analytics.weekend_split;
  if (!split) return [];
  const periods = [
    {
      key: "weekday",
      label: "Weekdays (Mon–Fri)",
      total: split.weekday_total,
      items: split.weekday_items,
    },
    {
      key: "weekend",
      label: "Weekends (Sat–Sun)",
      total: split.weekend_total,
      items: split.weekend_items,
    },
  ];
  const rows = flattenPeriodItems(periods);
  return rows.sort((a, b) => {
    const order = ["weekday", "weekend"];
    const ai = order.indexOf(a.periodKey);
    const bi = order.indexOf(b.periodKey);
    if (ai !== bi) return ai - bi;
    return b.quantity - a.quantity;
  });
}

export function periodRangeLabel(from: string, to: string): string {
  return `${formatDateIN(from)} – ${formatDateIN(to)}`;
}

export function weekdayChartData(analytics: InventorySalesAnalytics) {
  const max = Math.max(
    ...analytics.by_weekday.map((w) => parseQ(w.total_quantity)),
    1,
  );
  return analytics.by_weekday.map((w) => ({
    day: w.weekday,
    short: w.weekday.slice(0, 3),
    isWeekend: w.is_weekend,
    total: parseQ(w.total_quantity),
    pctOfMax: (parseQ(w.total_quantity) / max) * 100,
    items: w.items,
  }));
}

export function weekdayItemRows(analytics: InventorySalesAnalytics): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const w of analytics.by_weekday) {
    const periodTotal = parseQ(w.total_quantity);
    for (const it of w.items) {
      const quantity = parseQ(it.quantity);
      rows.push({
        periodKey: w.weekday,
        periodLabel: w.weekday,
        itemName: it.item_name,
        quantity,
        periodTotal,
        sharePct: periodTotal > 0 ? (quantity / periodTotal) * 100 : 0,
      });
    }
  }
  return rows.sort((a, b) => {
    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const ai = order.indexOf(a.periodKey);
    const bi = order.indexOf(b.periodKey);
    if (ai !== bi) return ai - bi;
    return b.quantity - a.quantity;
  });
}

export function catalogItemRows(analytics: InventorySalesAnalytics): ItemSalesSummaryRowView[] {
  const source = analytics.by_item?.length ? analytics.by_item : analytics.top_items;
  const total = source.reduce((s, r) => s + parseQ(r.total_quantity), 0);
  return source.map((row) => {
    const qty = parseQ(row.total_quantity);
    return {
      ...row,
      sharePct: total > 0 ? (qty / total) * 100 : 0,
    };
  });
}

export type ItemSalesSummaryRowView = InventorySalesAnalytics["by_item"][number] & {
  sharePct: number;
};

export { fmtQty };
