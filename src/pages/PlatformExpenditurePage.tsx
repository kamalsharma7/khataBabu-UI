import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  createExpenditure,
  deleteExpenditure,
  listExpenditures,
  expenditureSummary,
  listSalesEmployees,
} from "../api/platform";
import type {
  ExpenditureCategory,
  ExpenditureEntry,
  ExpenditureSummary,
  SalesEmployee,
} from "../types/platform";
import {
  EXPENDITURE_CATEGORIES,
  expenditureCategoryLabel,
  isSalaryEligibleSalesEmployee,
  labelFor,
  EMPLOYMENT_STATUS_OPTIONS,
  type ExpenditureCategoryValue,
} from "../utils/platformLabels";

function formatInr(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function startOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSpentAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PlatformExpenditurePage() {
  const [fromDate, setFromDate] = useState(() => startOfMonth(new Date()));
  const [toDate, setToDate] = useState(todayIso);
  const [activeCategory, setActiveCategory] = useState<ExpenditureCategoryValue>("sales_team_salary");
  const [summary, setSummary] = useState<ExpenditureSummary | null>(null);
  const [entries, setEntries] = useState<ExpenditureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [spentDate, setSpentDate] = useState(todayIso);
  const [submitting, setSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState<
    "month" | "last_month" | "year" | "last_year" | "all" | "custom"
  >("month");
  const [salesEmployees, setSalesEmployees] = useState<SalesEmployee[]>([]);
  const [filterSalesEmployeeId, setFilterSalesEmployeeId] = useState("");
  const [formSalesEmployeeId, setFormSalesEmployeeId] = useState("");

  const isSalaryCategory = activeCategory === "sales_team_salary";

  const salaryEligibleEmployees = useMemo(
    () => salesEmployees.filter(isSalaryEligibleSalesEmployee),
    [salesEmployees],
  );

  const filteredEmployeeName = useMemo(() => {
    if (!filterSalesEmployeeId) return null;
    return salesEmployees.find((e) => e.id === filterSalesEmployeeId)?.full_name ?? null;
  }, [filterSalesEmployeeId, salesEmployees]);

  useEffect(() => {
    void listSalesEmployees(false)
      .then(setSalesEmployees)
      .catch(() => setSalesEmployees([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const salesFilter = filterSalesEmployeeId || undefined;
      const [sum, list] = await Promise.all([
        expenditureSummary(fromDate, toDate, salesFilter),
        listExpenditures({
          category: salesFilter ? undefined : activeCategory,
          fromDate,
          toDate,
          salesEmployeeId: salesFilter,
        }),
      ]);
      setSummary(sum);
      setEntries(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load expenditures");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, activeCategory, filterSalesEmployeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryMeta = useMemo(
    () => EXPENDITURE_CATEGORIES.find((c) => c.value === activeCategory),
    [activeCategory],
  );

  const topCategory = useMemo(() => {
    if (!summary?.by_category.length) return null;
    const sorted = [...summary.by_category].sort(
      (a, b) => parseFloat(b.total_inr) - parseFloat(a.total_inr),
    );
    const top = sorted[0];
    if (!top || parseFloat(top.total_inr) <= 0) return null;
    return top;
  }, [summary]);

  const maxCategoryTotal = useMemo(() => {
    if (!summary) return 1;
    return Math.max(
      1,
      ...summary.by_category.map((c) => parseFloat(c.total_inr)),
    );
  }, [summary]);

  const applyPreset = (preset: "month" | "last_month" | "year" | "last_year" | "all") => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === "month") {
      setFromDate(startOfMonth(now));
      setToDate(todayIso());
      return;
    }
    if (preset === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(first.toISOString().slice(0, 10));
      setToDate(last.toISOString().slice(0, 10));
      return;
    }
    if (preset === "year") {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(todayIso());
      return;
    }
    if (preset === "last_year") {
      const y = now.getFullYear() - 1;
      setFromDate(`${y}-01-01`);
      setToDate(`${y}-12-31`);
      return;
    }
    setFromDate("");
    setToDate("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(/,/g, ""));
    if (!title.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError("Enter a title and a valid amount");
      return;
    }
    if (isSalaryCategory && !formSalesEmployeeId) {
      setError("Select the sales team member who received this payment");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createExpenditure({
        category: activeCategory as ExpenditureCategory,
        amount_inr: amt,
        title: title.trim(),
        notes: notes.trim() || null,
        spent_at: new Date(`${spentDate}T12:00:00`).toISOString(),
        ...(isSalaryCategory ? { sales_employee_id: formSalesEmployeeId } : {}),
      });
      setAmount("");
      setTitle("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this expenditure entry permanently?")) return;
    try {
      await deleteExpenditure(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="page exp-page">
      <header className="exp-hero">
        <div className="exp-hero__intro">
          <h1>Business expenditure</h1>
          <p className="muted">
            Track KhataBabu operating spend by category. All entries are stored permanently in the database.
          </p>
        </div>
      </header>

      <section className="card exp-filter-card" aria-label="Date range filter">
        <div className="exp-filter-card__head">
          <span className="exp-filter-card__title">Time range</span>
          <span className="exp-filter-card__hint">Filters analytics and history below</span>
        </div>
        <div className="exp-presets">
          {(
            [
              ["month", "This month"],
              ["last_month", "Last month"],
              ["year", "This year"],
              ["last_year", "Last year"],
              ["all", "All time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`exp-preset-btn ${activePreset === key ? "exp-preset-btn--active" : ""}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="exp-date-inputs">
          <label className="exp-date-field">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setActivePreset("custom");
                setFromDate(e.target.value);
              }}
            />
          </label>
          <span className="exp-date-sep" aria-hidden="true">→</span>
          <label className="exp-date-field">
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setActivePreset("custom");
                setToDate(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="exp-sales-filter">
          <label className="exp-date-field">
            <span>Sales person</span>
            <select
              value={filterSalesEmployeeId}
              onChange={(e) => setFilterSalesEmployeeId(e.target.value)}
              aria-label="Filter by sales employee"
            >
              <option value="">All sales team</option>
              {salaryEligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                  {emp.employment_status !== "active"
                    ? ` · ${labelFor(EMPLOYMENT_STATUS_OPTIONS, emp.employment_status)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          {filterSalesEmployeeId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFilterSalesEmployeeId("")}
            >
              Clear person filter
            </button>
          )}
        </div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="exp-stats">
        <div className="exp-stat-card exp-stat-card--primary">
          <span className="exp-stat-card__label">Total spend</span>
          <span className="exp-stat-card__value">
            {summary ? formatInr(summary.grand_total_inr) : "—"}
          </span>
          <span className="exp-stat-card__hint">In selected date range</span>
        </div>
        <div className="exp-stat-card">
          <span className="exp-stat-card__label">Entries</span>
          <span className="exp-stat-card__value">{summary?.entry_count ?? 0}</span>
          <span className="exp-stat-card__hint">Across all categories</span>
        </div>
        <div className="exp-stat-card">
          <span className="exp-stat-card__label">Largest bucket</span>
          <span className="exp-stat-card__value exp-stat-card__value--sm">
            {topCategory
              ? expenditureCategoryLabel(topCategory.category)
              : "—"}
          </span>
          <span className="exp-stat-card__hint">
            {topCategory ? formatInr(topCategory.total_inr) : "No spend yet"}
          </span>
        </div>
      </section>

      {summary && (
        <section className="exp-breakdown card">
          <h2>Spend mix</h2>
          <div className="exp-bars">
            {EXPENDITURE_CATEGORIES.map((cat) => {
              const row = summary.by_category.find((c) => c.category === cat.value);
              const total = row ? parseFloat(row.total_inr) : 0;
              const pct = (total / maxCategoryTotal) * 100;
              return (
                <button
                  key={cat.value}
                  type="button"
                  className={`exp-bar-row ${activeCategory === cat.value ? "exp-bar-row--active" : ""}`}
                  onClick={() => setActiveCategory(cat.value)}
                >
                  <span className="exp-bar-row__label">{cat.short}</span>
                  <span className="exp-bar-row__track">
                    <span
                      className="exp-bar-row__fill"
                      style={{ width: `${pct}%`, background: cat.accent }}
                    />
                  </span>
                  <span className="exp-bar-row__amt">{formatInr(total)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="exp-category-grid">
        {EXPENDITURE_CATEGORIES.map((cat) => {
          const row = summary?.by_category.find((c) => c.category === cat.value);
          const total = row ? parseFloat(row.total_inr) : 0;
          const count = row?.entry_count ?? 0;
          return (
            <button
              key={cat.value}
              type="button"
              className={`exp-cat-card ${activeCategory === cat.value ? "exp-cat-card--active" : ""}`}
              style={{ "--exp-accent": cat.accent } as CSSProperties}
              onClick={() => setActiveCategory(cat.value)}
            >
              <span className="exp-cat-card__title">{cat.label}</span>
              <span className="exp-cat-card__total">{formatInr(total)}</span>
              <span className="exp-cat-card__meta">{count} entries</span>
            </button>
          );
        })}
      </section>

      <div className="exp-split">
        <form className="card exp-add-form" onSubmit={onSubmit}>
          <div className="exp-panel-head">
            <h2>Record expense</h2>
            <p className="exp-panel-sub">
              Category:{" "}
              <span className="exp-panel-cat" style={{ color: categoryMeta?.accent }}>
                {categoryMeta?.label}
              </span>
            </p>
          </div>
          <div className="exp-form-fields">
            <label className="field">
              <span>Amount (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25000"
                required
              />
            </label>
            {isSalaryCategory && (
              <label className="field">
                <span>Sales team member</span>
                <select
                  value={formSalesEmployeeId}
                  onChange={(e) => setFormSalesEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select salesperson…</option>
                  {salaryEligibleEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                      {emp.employment_status !== "active"
                        ? ` · ${labelFor(EMPLOYMENT_STATUS_OPTIONS, emp.employment_status)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>Title / payee</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isSalaryCategory
                    ? "e.g. March commission"
                    : "e.g. March salaries — field team"
                }
                required
              />
            </label>
            <label className="field">
              <span>Expense date</span>
              <input
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Notes (optional)</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice ref, UTR, context…"
              />
            </label>
          </div>
          <div className="exp-form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Saving…" : "Record expenditure"}
            </button>
          </div>
        </form>

        <section className="card exp-history">
          <div className="exp-panel-head">
            <h2>History</h2>
            <p className="exp-panel-sub">
              {filterSalesEmployeeId ? (
                <>
                  Payments for{" "}
                  <strong>{filteredEmployeeName ?? "selected salesperson"}</strong>
                </>
              ) : (
                <span className="exp-panel-cat" style={{ color: categoryMeta?.accent }}>
                  {categoryMeta?.label}
                </span>
              )}
              <span className="exp-history-count">
                {loading ? "…" : `${entries.length} in range`}
              </span>
            </p>
          </div>
          <div className="exp-history-body">
            {loading && <p className="muted exp-empty">Loading…</p>}
            {!loading && entries.length === 0 && (
              <p className="muted exp-empty">
                {filterSalesEmployeeId
                  ? "No salary or commission entries for this person in the selected dates."
                  : "No entries in this range for this category."}
              </p>
            )}
            <ul className="exp-history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="exp-history-item">
                <div className="exp-history-item__main">
                  <strong>{entry.title}</strong>
                  <span className="exp-history-item__amt">{formatInr(entry.amount_inr)}</span>
                </div>
                <div className="exp-history-item__meta">
                  {entry.sales_employee_name && (
                    <span className="exp-history-item__employee">{entry.sales_employee_name}</span>
                  )}
                  <time dateTime={entry.spent_at}>{formatSpentAt(entry.spent_at)}</time>
                  {filterSalesEmployeeId && entry.category !== "sales_team_salary" && (
                    <span className="exp-history-item__notes">
                      {expenditureCategoryLabel(entry.category)}
                    </span>
                  )}
                  {entry.notes && <span className="exp-history-item__notes">{entry.notes}</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm exp-history-item__delete"
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </button>
              </li>
            ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
