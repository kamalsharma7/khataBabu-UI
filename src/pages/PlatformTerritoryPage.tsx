import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ApiError } from "../api/client";
import { territoryAnalytics, territoryRevenueAnalytics } from "../api/platform";
import type {
  TerritoryAnalytics,
  TerritoryRevenueAnalytics,
  TenantStatus,
  PlanTier,
} from "../types/platform";

type TerritoryMode = "sales" | "revenue";

type UnifiedOutletRow = {
  outlet_id: string;
  outlet_name: string;
  outlet_ref_code: string;
  legal_name: string;
  status: TenantStatus;
  plan_tier: PlanTier;
  amount_inr: string;
  txn_count: number;
};

type UnifiedCityRow = {
  city: string;
  state: string;
  outlet_count: number;
  active_outlet_count: number;
  amount_inr: string;
  txn_count: number;
  outlets: UnifiedOutletRow[];
};

type UnifiedStateRow = {
  state: string;
  city_count: number;
  outlet_count: number;
  active_outlet_count: number;
  amount_inr: string;
  txn_count: number;
  cities: UnifiedCityRow[];
};

type UnifiedTerritoryView = {
  total_outlets: number;
  total_states: number;
  total_cities: number;
  active_outlets: number;
  grand_total_inr: string;
  txn_count: number;
  states: UnifiedStateRow[];
  insights: { kind: string; message: string }[];
};

const STATE_ACCENTS = [
  "#0d9488",
  "#4f46e5",
  "#db2777",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
];

const MODE_COPY: Record<
  TerritoryMode,
  {
    hero: string;
    filterTitle: string;
    filterHint: string;
    grandLabel: string;
    txnLabel: string;
    txnSingular: string;
    tableTxn: string;
    tableAmount: string;
    overviewHint: string;
  }
> = {
  sales: {
    hero:
      "Venue sales: settled POS bill totals by state, city, and outlet (minus refunds).",
    filterTitle: "Sales period",
    filterHint: "Filters outlet GMV from settled bills",
    grandLabel: "Outlet GMV",
    txnLabel: "settled bills",
    txnSingular: "bills",
    tableTxn: "Bills",
    tableAmount: "Sales (period)",
    overviewHint: "Select a state to see cities, outlet lists, and per-outlet sales.",
  },
  revenue: {
    hero:
      "KhataBabu revenue: subscription and collection payments you recorded, by state, city, and outlet.",
    filterTitle: "Collection period",
    filterHint: "Filters by payment date on platform collections",
    grandLabel: "Your revenue",
    txnLabel: "collection payments",
    txnSingular: "payments",
    tableTxn: "Payments",
    tableAmount: "Revenue (period)",
    overviewHint: "Select a state to see cities, outlets, and per-outlet collection revenue.",
  },
};

function formatInr(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function parseInr(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function salesToView(data: TerritoryAnalytics): UnifiedTerritoryView {
  return {
    total_outlets: data.total_outlets,
    total_states: data.total_states,
    total_cities: data.total_cities,
    active_outlets: data.active_outlets,
    grand_total_inr: data.grand_sales_inr,
    txn_count: data.settled_bill_count,
    insights: data.insights.map((i) => ({ kind: i.kind, message: i.message })),
    states: data.states.map((st) => ({
      state: st.state,
      city_count: st.city_count,
      outlet_count: st.outlet_count,
      active_outlet_count: st.active_outlet_count,
      amount_inr: st.gross_sales_inr,
      txn_count: st.settled_bill_count,
      cities: st.cities.map((city) => ({
        city: city.city,
        state: city.state,
        outlet_count: city.outlet_count,
        active_outlet_count: city.active_outlet_count,
        amount_inr: city.gross_sales_inr,
        txn_count: city.settled_bill_count,
        outlets: city.outlets.map((o) => ({
          outlet_id: o.outlet_id,
          outlet_name: o.outlet_name,
          outlet_ref_code: o.outlet_ref_code,
          legal_name: o.legal_name,
          status: o.status,
          plan_tier: o.plan_tier,
          amount_inr: o.gross_sales_inr,
          txn_count: o.settled_bill_count,
        })),
      })),
    })),
  };
}

function revenueToView(data: TerritoryRevenueAnalytics): UnifiedTerritoryView {
  return {
    total_outlets: data.total_outlets,
    total_states: data.total_states,
    total_cities: data.total_cities,
    active_outlets: data.active_outlets,
    grand_total_inr: data.grand_collections_inr,
    txn_count: data.collection_count,
    insights: data.insights.map((i) => ({ kind: i.kind, message: i.message })),
    states: data.states.map((st) => ({
      state: st.state,
      city_count: st.city_count,
      outlet_count: st.outlet_count,
      active_outlet_count: st.active_outlet_count,
      amount_inr: st.collections_inr,
      txn_count: st.collection_count,
      cities: st.cities.map((city) => ({
        city: city.city,
        state: city.state,
        outlet_count: city.outlet_count,
        active_outlet_count: city.active_outlet_count,
        amount_inr: city.collections_inr,
        txn_count: city.collection_count,
        outlets: city.outlets.map((o) => ({
          outlet_id: o.outlet_id,
          outlet_name: o.outlet_name,
          outlet_ref_code: o.outlet_ref_code,
          legal_name: o.legal_name,
          status: o.status,
          plan_tier: o.plan_tier,
          amount_inr: o.collections_inr,
          txn_count: o.collection_count,
        })),
      })),
    })),
  };
}

function startOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function periodLabel(from: string, to: string, preset: string): string {
  if (preset === "all") return "All time";
  if (from && to) return `${from} → ${to}`;
  return "Selected period";
}

export function PlatformTerritoryPage() {
  const [mode, setMode] = useState<TerritoryMode>("sales");
  const [fromDate, setFromDate] = useState(() => startOfMonth(new Date()));
  const [toDate, setToDate] = useState(todayIso);
  const [activePreset, setActivePreset] = useState<
    "month" | "last_month" | "year" | "last_year" | "all" | "custom"
  >("month");
  const [salesRaw, setSalesRaw] = useState<TerritoryAnalytics | null>(null);
  const [revenueRaw, setRevenueRaw] = useState<TerritoryRevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const copy = MODE_COPY[mode];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = fromDate || undefined;
      const to = toDate || undefined;
      const [salesRes, revenueRes] = await Promise.all([
        territoryAnalytics(from, to),
        territoryRevenueAnalytics(from, to),
      ]);
      setSalesRaw(salesRes);
      setRevenueRaw(revenueRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load territory analytics");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const data = useMemo((): UnifiedTerritoryView | null => {
    if (mode === "sales" && salesRaw) return salesToView(salesRaw);
    if (mode === "revenue" && revenueRaw) return revenueToView(revenueRaw);
    return null;
  }, [mode, salesRaw, revenueRaw]);

  const maxStateSales = useMemo(() => {
    if (!data?.states.length) return 1;
    return Math.max(1, ...data.states.map((s) => parseInr(s.amount_inr)));
  }, [data]);

  const stateRow = useMemo((): UnifiedStateRow | null => {
    if (!data || !selectedState) return null;
    return data.states.find((s) => s.state === selectedState) ?? null;
  }, [data, selectedState]);

  const cityRow = useMemo((): UnifiedCityRow | null => {
    if (!stateRow || !selectedCity) return null;
    return stateRow.cities.find((c) => c.city === selectedCity) ?? null;
  }, [stateRow, selectedCity]);

  const visibleCities = stateRow?.cities ?? [];
  const maxCitySales = useMemo(() => {
    if (!visibleCities.length) return 1;
    return Math.max(1, ...visibleCities.map((c) => parseInr(c.amount_inr)));
  }, [visibleCities]);

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

  const selectState = (state: string) => {
    setSelectedState(state);
    setSelectedCity(null);
  };

  const selectCity = (city: string) => {
    setSelectedCity(city);
  };

  const clearDrill = () => {
    setSelectedState(null);
    setSelectedCity(null);
  };

  const switchMode = (next: TerritoryMode) => {
    setMode(next);
  };

  return (
    <div className={`page terr-page terr-page--${mode}`}>
      <header className="terr-hero">
        <div className="terr-hero__intro">
          <h1>Territory</h1>
          <p className="muted">{copy.hero}</p>
        </div>
        <div className="terr-hero__badge">
          <span>{periodLabel(fromDate, toDate, activePreset)}</span>
        </div>
      </header>

      <div className="terr-mode-tabs" role="tablist" aria-label="Territory view">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sales"}
          className={`terr-mode-tab ${mode === "sales" ? "terr-mode-tab--active" : ""}`}
          onClick={() => switchMode("sales")}
        >
          <span className="terr-mode-tab__title">Venue sales</span>
          <span className="terr-mode-tab__desc">Outlet GMV from POS bills</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "revenue"}
          className={`terr-mode-tab terr-mode-tab--revenue ${mode === "revenue" ? "terr-mode-tab--active" : ""}`}
          onClick={() => switchMode("revenue")}
        >
          <span className="terr-mode-tab__title">KhataBabu revenue</span>
          <span className="terr-mode-tab__desc">Your collections by territory</span>
        </button>
      </div>

      <section className="card terr-filter-card" aria-label={copy.filterTitle}>
        <div className="terr-filter-card__head">
          <span className="terr-filter-card__title">{copy.filterTitle}</span>
          <span className="terr-filter-card__hint">{copy.filterHint}</span>
        </div>
        <div className="terr-presets">
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
              className={`terr-preset-btn ${activePreset === key ? "terr-preset-btn--active" : ""}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="terr-date-inputs">
          <label className="terr-date-field">
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
          <span className="terr-date-sep" aria-hidden="true">→</span>
          <label className="terr-date-field">
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
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="terr-stats">
        <div className="terr-stat-card terr-stat-card--primary">
          <span className="terr-stat-card__label">{copy.grandLabel}</span>
          <span className="terr-stat-card__value">
            {data ? formatInr(data.grand_total_inr) : "—"}
          </span>
          <span className="terr-stat-card__hint">
            {data?.txn_count ?? 0} {copy.txnLabel}
          </span>
        </div>
        <div className="terr-stat-card">
          <span className="terr-stat-card__label">Outlets</span>
          <span className="terr-stat-card__value">{data?.total_outlets ?? "—"}</span>
          <span className="terr-stat-card__hint">
            {data?.active_outlets ?? 0} active
          </span>
        </div>
        <div className="terr-stat-card">
          <span className="terr-stat-card__label">States</span>
          <span className="terr-stat-card__value">{data?.total_states ?? "—"}</span>
          <span className="terr-stat-card__hint">{data?.total_cities ?? 0} cities</span>
        </div>
      </section>

      {data && data.insights.length > 0 && (
        <section className="terr-insights card">
          <h2>Where to focus</h2>
          <ul className="terr-insights__list">
            {data.insights.map((insight, i) => (
              <li key={`${insight.kind}-${i}`} className={`terr-insight terr-insight--${insight.kind}`}>
                {insight.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="terr-breadcrumb" aria-label="Territory drill-down">
        <button type="button" className="terr-crumb" onClick={clearDrill}>
          All India
        </button>
        {selectedState && (
          <>
            <span className="terr-crumb-sep">/</span>
            <button
              type="button"
              className={`terr-crumb ${!selectedCity ? "terr-crumb--active" : ""}`}
              onClick={() => setSelectedCity(null)}
            >
              {selectedState}
            </button>
          </>
        )}
        {selectedCity && (
          <>
            <span className="terr-crumb-sep">/</span>
            <span className="terr-crumb terr-crumb--active">{selectedCity}</span>
          </>
        )}
      </nav>

      <div className="terr-layout">
        <section className="card terr-panel terr-panel--states">
          <h2>By state</h2>
          {loading && <p className="muted terr-empty">Loading…</p>}
          {!loading && data && data.states.length === 0 && (
            <p className="muted terr-empty">No outlets onboarded yet.</p>
          )}
          <ul className="terr-state-list">
            {data?.states.map((st, idx) => {
              const pct = (parseInr(st.amount_inr) / maxStateSales) * 100;
              const accent = STATE_ACCENTS[idx % STATE_ACCENTS.length];
              const isActive = selectedState === st.state;
              return (
                <li key={st.state}>
                  <button
                    type="button"
                    className={`terr-state-row ${isActive ? "terr-state-row--active" : ""}`}
                    onClick={() => selectState(st.state)}
                  >
                    <div className="terr-state-row__head">
                      <strong>{st.state}</strong>
                      <span className="terr-state-row__amt">{formatInr(st.amount_inr)}</span>
                    </div>
                    <div className="terr-state-row__track">
                      <span
                        className="terr-state-row__fill"
                        style={{ width: `${pct}%`, background: accent }}
                      />
                    </div>
                    <div className="terr-state-row__meta">
                      <span>{st.outlet_count} outlets</span>
                      <span>{st.city_count} cities</span>
                      <span>{st.active_outlet_count} active</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card terr-panel terr-panel--detail">
          {!selectedState && (
            <>
              <h2>Overview</h2>
              <p className="muted terr-detail-hint">{copy.overviewHint}</p>
              <div className="terr-overview-grid">
                {data?.states.slice(0, 6).map((st, idx) => (
                  <button
                    key={st.state}
                    type="button"
                    className="terr-overview-card"
                    style={{ "--terr-accent": STATE_ACCENTS[idx % STATE_ACCENTS.length] } as CSSProperties}
                    onClick={() => selectState(st.state)}
                  >
                    <span className="terr-overview-card__state">{st.state}</span>
                    <span className="terr-overview-card__sales">{formatInr(st.amount_inr)}</span>
                    <span className="terr-overview-card__meta">
                      {st.outlet_count} outlets · {st.city_count} cities
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedState && !selectedCity && stateRow && (
            <>
              <h2>{stateRow.state}</h2>
              <p className="terr-detail-summary">
                <span>{formatInr(stateRow.amount_inr)} total</span>
                <span>{stateRow.outlet_count} outlets</span>
                <span>{stateRow.city_count} cities</span>
              </p>
              <h3 className="terr-subhead">Cities</h3>
              <ul className="terr-city-list">
                {stateRow.cities.map((city) => {
                  const pct = (parseInr(city.amount_inr) / maxCitySales) * 100;
                  return (
                    <li key={city.city}>
                      <button
                        type="button"
                        className="terr-city-row"
                        onClick={() => selectCity(city.city)}
                      >
                        <div className="terr-city-row__main">
                          <strong>{city.city}</strong>
                          <span>{formatInr(city.amount_inr)}</span>
                        </div>
                        <div className="terr-city-row__track">
                          <span className="terr-city-row__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="terr-city-row__meta">
                          {city.outlet_count} outlet(s) · {city.active_outlet_count} active ·{" "}
                          {city.txn_count} {copy.txnSingular}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {selectedState && selectedCity && cityRow && (
            <>
              <h2>{cityRow.city}, {cityRow.state}</h2>
              <p className="terr-detail-summary">
                <span>{formatInr(cityRow.amount_inr)} city total</span>
                <span>{cityRow.outlet_count} outlets</span>
                <span>{cityRow.txn_count} {copy.txnSingular}</span>
              </p>
              <div className="table-wrap terr-outlet-table-wrap">
                <table className="data-table terr-outlet-table">
                  <thead>
                    <tr>
                      <th>Outlet</th>
                      <th>Business</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Plan</th>
                      <th className="terr-num">{copy.tableTxn}</th>
                      <th className="terr-num">{copy.tableAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityRow.outlets.map((o) => (
                      <tr key={o.outlet_id}>
                        <td><strong>{o.outlet_name}</strong></td>
                        <td>{o.legal_name}</td>
                        <td><code>{o.outlet_ref_code}</code></td>
                        <td>
                          <span className={`status-pill status-${o.status}`}>{o.status}</span>
                        </td>
                        <td>{o.plan_tier}</td>
                        <td className="terr-num">{o.txn_count}</td>
                        <td className="terr-num terr-sales-cell">{formatInr(o.amount_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}><strong>City total</strong></td>
                      <td className="terr-num">{cityRow.txn_count}</td>
                      <td className="terr-num terr-sales-cell">
                        <strong>{formatInr(cityRow.amount_inr)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
