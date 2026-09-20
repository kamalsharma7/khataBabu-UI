import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyticsOrders,
  analyticsStatus,
  analyticsSummary,
  analyticsUnlock,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { getAnalyticsToken, setAnalyticsToken } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { AnalyticsOrderRow, AnalyticsSummary } from "../../types/owner";

function fmtMoney(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function localDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const PRESETS: { id: string; label: string; days: number }[] = [
  { id: "today", label: "Today", days: 0 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
];

export function OwnerOverviewPage() {
  const { outlet } = useOwnerOutlet();
  const today = useMemo(() => new Date(), []);

  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  const [fromDate, setFromDate] = useState(localDateInput(today));
  const [toDate, setToDate] = useState(localDateInput(today));
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [orders, setOrders] = useState<AnalyticsOrderRow[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fromIso = useMemo(
    () => rangeToIso(fromDate, fromTime),
    [fromDate, fromTime],
  );
  const toIso = useMemo(() => rangeToIso(toDate, toTime), [toDate, toTime]);

  useEffect(() => {
    if (!outlet) return;
    const stored = getAnalyticsToken(outlet.id);
    setUnlocked(!!stored);
    void analyticsStatus(outlet.id)
      .then((s) => setPinConfigured(s.pin_configured))
      .catch(() => setPinConfigured(false));
  }, [outlet]);

  const lock = useCallback(() => {
    if (outlet) setAnalyticsToken(outlet.id, null);
    setUnlocked(false);
    setSummary(null);
    setOrders([]);
  }, [outlet]);

  const submitUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outlet) return;
    setGateBusy(true);
    setGateError(null);
    try {
      const body = pinConfigured
        ? {
            pin: pin.trim() || undefined,
            login_password: loginPassword.trim() || undefined,
          }
        : {
            login_password: loginPassword.trim(),
            new_pin: newPin.trim(),
          };
      const res = await analyticsUnlock(outlet.id, body);
      setAnalyticsToken(outlet.id, res.analytics_token);
      setPinConfigured(res.pin_configured);
      setUnlocked(true);
      setPin("");
      setLoginPassword("");
      setNewPin("");
    } catch (err) {
      setGateError(err instanceof OwnerApiError ? err.message : "Could not unlock");
    } finally {
      setGateBusy(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!outlet) return;
    const token = getAnalyticsToken(outlet.id);
    if (!token) {
      setUnlocked(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [sum, ord] = await Promise.all([
        analyticsSummary(outlet.id, fromIso, toIso, token),
        analyticsOrders(outlet.id, fromIso, toIso, token, 0, 100),
      ]);
      setSummary(sum);
      setOrders(ord.items);
      setOrdersTotal(ord.total);
    } catch (err) {
      if (err instanceof OwnerApiError && err.status === 403) {
        lock();
        setGateError(err.message || "Overview session expired. Enter your PIN again.");
      } else {
        setLoadError(err instanceof OwnerApiError ? err.message : "Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  }, [outlet, fromIso, toIso, lock]);

  useEffect(() => {
    if (unlocked && outlet) void loadData();
  }, [unlocked, outlet, loadData]);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(start.getDate() - (days - 1));
    }
    setFromDate(localDateInput(start));
    setToDate(localDateInput(end));
    setFromTime("00:00");
    setToTime("23:59");
  };

  if (!outlet) return <p className="muted">No outlet selected.</p>;

  if (!unlocked) {
    return (
      <div className="page owner-overview-gate">
        <h1>Overview &amp; analytics</h1>
        <p className="muted owner-overview-gate__lead">
          Sales, collections, and order history are confidential. Staff on the same device cannot see
          this without the overview PIN.
        </p>
        <div className="card owner-overview-gate__card">
          <h2>{pinConfigured ? "Enter overview PIN" : "Set up overview PIN"}</h2>
          {pinConfigured ? (
            <p className="muted">Use the PIN you created for analytics. Owners can also use login password.</p>
          ) : (
            <p className="muted">
              First time: confirm your <strong>login password</strong> and choose a PIN (4+ characters)
              that only owners should know.
            </p>
          )}
          <form className="owner-overview-gate__form" onSubmit={(e) => void submitUnlock(e)}>
            {pinConfigured ? (
              <>
                <label className="field">
                  <span>Overview PIN</span>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>Or login password (owner)</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  <span>Login password</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <label className="field">
                  <span>New overview PIN</span>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    minLength={4}
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            {gateError && <p className="form-error">{gateError}</p>}
            <button type="submit" className="btn btn-primary" disabled={gateBusy}>
              {gateBusy ? "Checking…" : "Unlock overview"}
            </button>
          </form>
        </div>
        <Link to="/app" className="muted">← Back to welcome</Link>
      </div>
    );
  }

  return (
    <div className="page owner-overview">
      <div className="owner-overview__head">
        <div>
          <h1>Overview</h1>
          <p className="muted">
            {outlet.name} · settled orders between selected date &amp; time
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={lock}>
          Lock overview
        </button>
      </div>

      <section className="card owner-overview-filters">
        <h2 className="owner-overview-filters__title">Date &amp; time range</h2>
        <div className="owner-overview-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="owner-overview-filters__grid">
          <label className="field">
            <span>From date</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="field">
            <span>From time</span>
            <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
          </label>
          <label className="field">
            <span>To date</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <label className="field">
            <span>To time</span>
            <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
          </label>
        </div>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void loadData()}>
          {loading ? "Loading…" : "Apply filter"}
        </button>
      </section>

      {loadError && <p className="form-error">{loadError}</p>}

      {summary && (
        <>
          <div className="owner-analytics-kpis">
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Gross sales</span>
              <strong className="owner-kpi__value">{fmtMoney(summary.gross_sales)}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Collected</span>
              <strong className="owner-kpi__value">{fmtMoney(summary.total_collected)}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Orders settled</span>
              <strong className="owner-kpi__value">{summary.orders_settled}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Avg bill</span>
              <strong className="owner-kpi__value">{fmtMoney(summary.average_bill)}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Discounts</span>
              <strong className="owner-kpi__value">{fmtMoney(summary.discount_total)}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Tax (GST)</span>
              <strong className="owner-kpi__value">{fmtMoney(summary.tax_total)}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Cancelled</span>
              <strong className="owner-kpi__value">{summary.orders_cancelled}</strong>
            </div>
            <div className="card owner-kpi">
              <span className="owner-kpi__label">Open now</span>
              <strong className="owner-kpi__value">{summary.open_orders_now}</strong>
            </div>
          </div>

          <section className="card owner-overview-payments">
            <h2>Payment methods</h2>
            {summary.payment_breakdown.length === 0 ? (
              <p className="muted">No payments in this range.</p>
            ) : (
              <ul className="owner-payment-breakdown">
                {summary.payment_breakdown.map((row) => (
                  <li key={row.method}>
                    <span className="owner-payment-breakdown__method">{row.method.toUpperCase()}</span>
                    <span>{row.count} txns</span>
                    <strong>{fmtMoney(row.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="card owner-overview-orders">
        <h2>Orders ({ordersTotal})</h2>
        {orders.length === 0 && !loading && <p className="muted">No settled orders in this range.</p>}
        {orders.length > 0 && (
          <div className="owner-orders-table-wrap">
            <table className="owner-orders-table">
              <thead>
                <tr>
                  <th>Settled</th>
                  <th>Bill</th>
                  <th>Table</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payments</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id}>
                    <td>{formatDt(o.settled_at)}</td>
                    <td>#{o.bill_number}</td>
                    <td>{o.table_label ?? "—"}</td>
                    <td>{o.customer_name ?? "—"}</td>
                    <td>{fmtMoney(o.grand_total)}</td>
                    <td className="muted">{o.payments_summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ordersTotal > orders.length && (
          <p className="muted">Showing first {orders.length} of {ordersTotal} orders.</p>
        )}
      </section>
    </div>
  );
}
