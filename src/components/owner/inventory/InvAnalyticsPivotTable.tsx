import { useMemo } from "react";
import { fmtQty } from "./invUtils";
import type { ItemPivotTable, PivotRow } from "./invAnalyticsPivot";

type Props = {
  table: ItemPivotTable;
  hideZeroQty: boolean;
  emptyMessage: string;
};

export function InvAnalyticsPivotTable({ table, hideZeroQty, emptyMessage }: Props) {
  const rows = useMemo(() => {
    if (!hideZeroQty) return table.rows;
    return table.rows.filter((r) => r.rowTotal > 0);
  }, [table.rows, hideZeroQty]);

  if (table.columns.length === 0) {
    return <p className="inv-analytics-empty">{emptyMessage}</p>;
  }

  if (rows.length === 0) {
    return <p className="inv-analytics-empty">{emptyMessage}</p>;
  }

  return (
    <div className="inv-analytics-pivot-wrap">
      <table className="inv-analytics-table inv-analytics-table--pivot">
        <thead>
          <tr>
            <th className="inv-analytics-table__item inv-analytics-table__sticky-col">Menu item</th>
            {table.columns.map((col) => (
              <th
                key={col.key}
                className="inv-analytics-table__num inv-analytics-table__pivot-col"
                title={col.label}
              >
                {col.shortLabel}
              </th>
            ))}
            <th className="inv-analytics-table__num inv-analytics-table__total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PivotDataRow key={row.itemKey} row={row} columns={table.columns} />
          ))}
        </tbody>
        <tfoot>
          <tr className="inv-analytics-table__foot">
            <th className="inv-analytics-table__sticky-col">Period total</th>
            {table.columns.map((col) => (
              <td key={col.key} className="inv-analytics-table__num inv-analytics-table__qty">
                {fmtQty(table.columnTotals[col.key] ?? 0)}
              </td>
            ))}
            <td className="inv-analytics-table__num inv-analytics-table__qty">
              {fmtQty(
                table.columns.reduce((s, c) => s + (table.columnTotals[c.key] ?? 0), 0),
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PivotDataRow({
  row,
  columns,
}: {
  row: PivotRow;
  columns: ItemPivotTable["columns"];
}) {
  const isZero = row.rowTotal === 0;
  return (
    <tr className={isZero ? "inv-analytics-table__row--zero" : undefined}>
      <td className="inv-analytics-table__item inv-analytics-table__sticky-col">
        <strong>{row.itemName}</strong>
      </td>
      {columns.map((col) => {
        const q = row.values[col.key] ?? 0;
        return (
          <td
            key={col.key}
            className={`inv-analytics-table__num ${q > 0 ? "inv-analytics-table__qty" : ""}`}
          >
            {q > 0 ? fmtQty(q) : "—"}
          </td>
        );
      })}
      <td className="inv-analytics-table__num inv-analytics-table__qty inv-analytics-table__total-col">
        {fmtQty(row.rowTotal)}
      </td>
    </tr>
  );
}
