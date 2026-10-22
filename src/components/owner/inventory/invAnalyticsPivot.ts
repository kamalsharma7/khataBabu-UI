import type { InventorySalesAnalytics, ItemQtyRow } from "../../../types/owner";

function parseQ(s: string): number {
  const v = parseFloat(s);
  return Number.isNaN(v) ? 0 : v;
}

export function itemRowKey(it: Pick<ItemQtyRow, "menu_item_id" | "item_name">): string {
  return it.menu_item_id ?? `name:${it.item_name}`;
}

export type PivotColumn = {
  key: string;
  label: string;
  shortLabel: string;
};

export type PivotRow = {
  itemKey: string;
  itemName: string;
  menuItemId: string | null;
  values: Record<string, number>;
  rowTotal: number;
};

export type ItemPivotTable = {
  columns: PivotColumn[];
  rows: PivotRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

type PeriodSlice = {
  key: string;
  label: string;
  shortLabel: string;
  items: ItemQtyRow[];
};

function catalogFromAnalytics(analytics: InventorySalesAnalytics): PivotRow[] {
  const source = analytics.by_item?.length ? analytics.by_item : analytics.top_items;
  return source.map((r) => ({
    itemKey: itemRowKey(r),
    itemName: r.item_name,
    menuItemId: r.menu_item_id,
    values: {} as Record<string, number>,
    rowTotal: 0,
  }));
}

export function buildItemPivot(
  periods: PeriodSlice[],
  analytics: InventorySalesAnalytics,
): ItemPivotTable {
  const columns: PivotColumn[] = periods.map((p) => ({
    key: p.key,
    label: p.label,
    shortLabel: p.shortLabel,
  }));

  const rowMap = new Map<string, PivotRow>();
  for (const base of catalogFromAnalytics(analytics)) {
    rowMap.set(base.itemKey, { ...base, values: {}, rowTotal: 0 });
  }

  const columnTotals: Record<string, number> = {};
  for (const col of columns) {
    columnTotals[col.key] = 0;
  }

  for (const period of periods) {
    for (const it of period.items) {
      const key = itemRowKey(it);
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          itemKey: key,
          itemName: it.item_name,
          menuItemId: it.menu_item_id,
          values: {},
          rowTotal: 0,
        });
      }
      const q = parseQ(it.quantity);
      const row = rowMap.get(key)!;
      row.values[period.key] = q;
      row.rowTotal += q;
      columnTotals[period.key] = (columnTotals[period.key] ?? 0) + q;
    }
  }

  const rows = [...rowMap.values()].sort(
    (a, b) => b.rowTotal - a.rowTotal || a.itemName.localeCompare(b.itemName),
  );
  const grandTotal = rows.reduce((s, r) => s + r.rowTotal, 0);

  return { columns, rows, columnTotals, grandTotal };
}

export function filterPivotRows(rows: PivotRow[], hideZeroQty: boolean): PivotRow[] {
  if (!hideZeroQty) return rows;
  return rows.filter((r) => r.rowTotal > 0);
}

function formatDateIN(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMonthShort(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

const WEEKDAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function dailyPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    analytics.by_day.map((d) => ({
      key: d.date,
      label: formatDateIN(d.date),
      shortLabel: formatDateShort(d.date),
      items: d.items,
    })),
    analytics,
  );
}

export function weeklyPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    (analytics.by_week ?? []).map((w) => ({
      key: w.week,
      label: `${w.week} from ${formatDateIN(w.week_start)}`,
      shortLabel: w.week.replace("-W", " W"),
      items: w.items,
    })),
    analytics,
  );
}

export function monthlyPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    analytics.by_month.map((m) => ({
      key: m.month,
      label: m.month,
      shortLabel: formatMonthShort(m.month),
      items: m.items,
    })),
    analytics,
  );
}

export function quarterlyPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    (analytics.by_quarter ?? []).map((q) => ({
      key: q.quarter,
      label: `${q.year} Q${q.quarter_num}`,
      shortLabel: `Q${q.quarter_num}`,
      items: q.items,
    })),
    analytics,
  );
}

export function yearlyPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    (analytics.by_year ?? []).map((y) => ({
      key: y.year,
      label: y.year,
      shortLabel: y.year,
      items: y.items,
    })),
    analytics,
  );
}

export function weekdayPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  return buildItemPivot(
    analytics.by_weekday.map((w) => ({
      key: w.weekday,
      label: w.weekday,
      shortLabel: WEEKDAY_SHORT[w.weekday] ?? w.weekday.slice(0, 3),
      items: w.items,
    })),
    analytics,
  );
}

export function weekendPivot(analytics: InventorySalesAnalytics): ItemPivotTable {
  const split = analytics.weekend_split;
  if (!split) {
    return { columns: [], rows: [], columnTotals: {}, grandTotal: 0 };
  }
  return buildItemPivot(
    [
      {
        key: "weekday",
        label: "Weekdays (Mon–Fri)",
        shortLabel: "Mon–Fri",
        items: split.weekday_items,
      },
      {
        key: "weekend",
        label: "Weekends (Sat–Sun)",
        shortLabel: "Sat–Sun",
        items: split.weekend_items,
      },
    ],
    analytics,
  );
}
