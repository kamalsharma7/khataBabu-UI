import type { CrmInsights, CustomerSummary } from "../../../types/owner";
import {
  SEGMENT_META,
  SEGMENT_ORDER,
  daysAgoLabel,
  fmtDate,
  inr,
  occasionLabel,
  orderTypeLabel,
  segmentLabel,
  waLink,
} from "./crmUtils";

type Props = {
  insights: CrmInsights;
  businessName?: string | null;
  onOpenCustomer: (id: string) => void;
  onFilterSegment: (segment: string) => void;
};

function MiniList({
  title,
  hint,
  rows,
  metric,
  onOpen,
}: {
  title: string;
  hint: string;
  rows: CustomerSummary[];
  metric: (c: CustomerSummary) => string;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="card crm-panel">
      <div className="crm-panel__head">
        <h3>{title}</h3>
        <span className="muted">{hint}</span>
      </div>
      {rows.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ol className="crm-rank">
        {rows.map((c) => (
          <li key={c.id}>
            <button type="button" className="crm-rank__btn" onClick={() => onOpen(c.id)}>
              <span className="crm-rank__name">
                {c.name || "Guest"}
                <small className="muted">{c.phone ?? "—"}{c.locality ? ` · ${c.locality}` : ""}</small>
              </span>
              <span className="crm-rank__metric">{metric(c)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CrmInsightsView({ insights, businessName, onOpenCustomer, onFilterSegment }: Props) {
  const segMax = Math.max(1, ...insights.segments.map((s) => s.customers));
  const monthMax = Math.max(1, ...insights.monthly_new.map((m) => m.customers));
  const freqMax = Math.max(1, ...insights.frequency_buckets.map((b) => b.customers));
  const wdMax = Math.max(1, ...insights.visits_by_weekday.map((w) => w.visits));
  const dpMax = Math.max(1, ...insights.visits_by_daypart.map((w) => w.visits));
  const locMax = Math.max(1, ...insights.top_localities.map((l) => l.visits));
  const segByKey = new Map(insights.segments.map((s) => [s.segment, s]));
  const growth =
    insights.new_last_month > 0
      ? Math.round(((insights.new_this_month - insights.new_last_month) / insights.new_last_month) * 100)
      : null;

  return (
    <div className="crm-insights">
      <section className="crm-kpis crm-kpis--page">
        <div className="crm-kpi">
          <span>Customers in database</span>
          <strong>{insights.total_customers}</strong>
          <small className="muted">{insights.with_phone} with mobile</small>
        </div>
        <div className="crm-kpi">
          <span>New this month</span>
          <strong>{insights.new_this_month}</strong>
          <small className={growth !== null && growth < 0 ? "crm-neg" : "crm-pos"}>
            {growth === null ? `${insights.new_last_month} last month` : `${growth >= 0 ? "+" : ""}${growth}% vs last month`}
          </small>
        </div>
        <div className="crm-kpi">
          <span>Repeat rate</span>
          <strong>{Number(insights.repeat_rate_percent).toFixed(0)}%</strong>
          <small className="muted">{insights.repeat_customers} came back 2+ times</small>
        </div>
        <div className="crm-kpi">
          <span>Avg visits / customer</span>
          <strong>{insights.avg_visits_per_customer}</strong>
          <small className="muted">avg spend {inr(insights.avg_spend_per_customer_inr)}</small>
        </div>
        <div className={`crm-kpi ${Number(insights.capture_rate_30d_percent) < 40 ? "crm-kpi--warn" : ""}`}>
          <span>Bills with customer (30d)</span>
          <strong>{Number(insights.capture_rate_30d_percent).toFixed(0)}%</strong>
          <small className="muted">
            {insights.identified_orders_30d} of {insights.settled_orders_30d} bills
          </small>
        </div>
        <div className={`crm-kpi ${Number(insights.khata_due_total_inr) > 0 ? "crm-kpi--due" : ""}`}>
          <span>Khata outstanding</span>
          <strong>{inr(insights.khata_due_total_inr)}</strong>
          <small className="muted">bills settled as "due"</small>
        </div>
      </section>

      {Number(insights.capture_rate_30d_percent) < 40 && insights.settled_orders_30d > 0 && (
        <p className="crm-tip">
          Tip: only {Number(insights.capture_rate_30d_percent).toFixed(0)}% of recent bills had a mobile number.
          Ask for the number at billing ("for the bill on WhatsApp?") — every number grows this database.
        </p>
      )}

      <div className="crm-grid-2">
        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Customer segments</h3>
            <span className="muted">Click a segment to see those customers</span>
          </div>
          <ul className="crm-seglist">
            {SEGMENT_ORDER.map((key) => {
              const s = segByKey.get(key);
              const n = s?.customers ?? 0;
              return (
                <li key={key}>
                  <button type="button" className="crm-seglist__btn" onClick={() => onFilterSegment(key)} title={SEGMENT_META[key].hint}>
                    <span className={`crm-seg crm-seg--${key}`}>{segmentLabel(key)}</span>
                    <div className="crm-hbar">
                      <div className={`crm-hbar__fill crm-hbar__fill--${key}`} style={{ width: `${(n / segMax) * 100}%` }} />
                    </div>
                    <b>{n}</b>
                    <small className="muted">{inr(s?.spend_inr ?? 0)}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Where they come from</h3>
            <span className="muted">Top localities by visits</span>
          </div>
          {insights.top_localities.length === 0 && (
            <p className="muted">Add a locality while billing to see your catchment area.</p>
          )}
          <ul className="crm-seglist">
            {insights.top_localities.map((l) => (
              <li key={l.locality}>
                <div className="crm-seglist__btn crm-seglist__btn--static">
                  <span className="crm-loc">{l.locality}</span>
                  <div className="crm-hbar">
                    <div className="crm-hbar__fill" style={{ width: `${(l.visits / locMax) * 100}%` }} />
                  </div>
                  <b>{l.visits} visits</b>
                  <small className="muted">{l.customers} cust · {inr(l.spend_inr)}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="crm-grid-3">
        <MiniList
          title="Top spenders"
          hint="Lifetime spend"
          rows={insights.top_spenders}
          metric={(c) => inr(c.total_spend_inr)}
          onOpen={onOpenCustomer}
        />
        <MiniList
          title="Most frequent"
          hint="By visit count"
          rows={insights.most_frequent}
          metric={(c) => `${c.visit_count} visits`}
          onOpen={onOpenCustomer}
        />
        <section className="card crm-panel crm-panel--winback">
          <div className="crm-panel__head">
            <h3>Win back</h3>
            <span className="muted">Good customers who stopped coming</span>
          </div>
          {insights.win_back.length === 0 && <p className="muted">No one slipping away right now.</p>}
          <ol className="crm-rank">
            {insights.win_back.map((c) => {
              const wa = waLink(
                c.phone,
                `Hi ${c.name || ""}! We miss you at ${businessName || "our place"} — it's been a while. Come by this week, something special is on us.`,
              );
              return (
                <li key={c.id}>
                  <button type="button" className="crm-rank__btn" onClick={() => onOpenCustomer(c.id)}>
                    <span className="crm-rank__name">
                      {c.name || "Guest"}
                      <small className="muted">
                        {c.visit_count} visits · last {daysAgoLabel(c.days_since_last_visit)}
                      </small>
                    </span>
                    <span className="crm-rank__metric">{inr(c.total_spend_inr)}</span>
                  </button>
                  {wa && (
                    <a className="crm-wa" href={wa} target="_blank" rel="noreferrer" title="Send WhatsApp">
                      WhatsApp
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="crm-grid-3">
        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Visit frequency</h3>
            <span className="muted">How many came how often</span>
          </div>
          <div className="crm-bars crm-bars--tall">
            {insights.frequency_buckets.map((b) => (
              <div key={b.bucket} className="crm-bar" title={`${b.customers} customers`}>
                <b>{b.customers}</b>
                <div className="crm-bar__track">
                  <div className="crm-bar__fill" style={{ height: `${(b.customers / freqMax) * 100}%` }} />
                </div>
                <span>{b.bucket}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>New customers / month</h3>
            <span className="muted">Last 6 months</span>
          </div>
          <div className="crm-bars crm-bars--tall">
            {insights.monthly_new.map((m) => (
              <div key={m.month} className="crm-bar" title={`${m.customers} new`}>
                <b>{m.customers}</b>
                <div className="crm-bar__track">
                  <div className="crm-bar__fill crm-bar__fill--green" style={{ height: `${(m.customers / monthMax) * 100}%` }} />
                </div>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Upcoming occasions</h3>
            <span className="muted">Next 30 days — a wish goes a long way</span>
          </div>
          {insights.upcoming_occasions.length === 0 && (
            <p className="muted">Capture birthdays at billing to see them here.</p>
          )}
          <ul className="crm-occasions">
            {insights.upcoming_occasions.map((o) => {
              const wa = waLink(
                o.phone,
                `Happy ${occasionLabel(o.occasion)} in advance, ${o.name || ""}! 🎉 From all of us at ${businessName || "the team"}.`,
              );
              return (
                <li key={`${o.customer_id}-${o.occasion}`}>
                  <button type="button" className="crm-rank__btn" onClick={() => onOpenCustomer(o.customer_id)}>
                    <span className="crm-rank__name">
                      {o.occasion === "birthday" ? "🎂" : "💍"} {o.name || "Guest"}
                      <small className="muted">{occasionLabel(o.occasion)} · {fmtDate(o.on_date)}</small>
                    </span>
                    <span className="crm-rank__metric">
                      {o.days_away === 0 ? "Today" : o.days_away === 1 ? "Tomorrow" : `in ${o.days_away}d`}
                    </span>
                  </button>
                  {wa && (
                    <a className="crm-wa" href={wa} target="_blank" rel="noreferrer">
                      Wish
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="crm-grid-3">
        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>What regulars order</h3>
            <span className="muted">Items by number of distinct customers</span>
          </div>
          {insights.trending_items.length === 0 && <p className="muted">No data yet.</p>}
          <ol className="crm-rank crm-rank--plain">
            {insights.trending_items.map((t) => (
              <li key={t.item_name}>
                <span className="crm-rank__name">{t.item_name}</span>
                <span className="crm-rank__metric">
                  {t.customers} cust <small className="muted">· {t.total_qty} plates</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Busiest days</h3>
            <span className="muted">Visits by identified customers</span>
          </div>
          <div className="crm-bars">
            {insights.visits_by_weekday.map((w) => (
              <div key={w.weekday} className="crm-bar" title={`${w.visits} visits`}>
                <div className="crm-bar__track">
                  <div className="crm-bar__fill" style={{ height: `${(w.visits / wdMax) * 100}%` }} />
                </div>
                <span>{w.label}</span>
              </div>
            ))}
          </div>
          <ul className="crm-daypart">
            {insights.visits_by_daypart.map((d) => (
              <li key={d.key}>
                <span>{d.label}</span>
                <div className="crm-hbar">
                  <div className="crm-hbar__fill" style={{ width: `${(d.visits / dpMax) * 100}%` }} />
                </div>
                <b>{d.visits}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="card crm-panel">
          <div className="crm-panel__head">
            <h3>Dine-in vs takeaway vs delivery</h3>
            <span className="muted">Among identified customers</span>
          </div>
          {insights.order_type_mix.length === 0 && <p className="muted">No data yet.</p>}
          <ul className="crm-daypart">
            {insights.order_type_mix.map((m) => (
              <li key={m.order_type}>
                <span>{orderTypeLabel(m.order_type)}</span>
                <div className="crm-hbar">
                  <div className="crm-hbar__fill crm-hbar__fill--green" style={{ width: `${Number(m.share_percent)}%` }} />
                </div>
                <b>{Number(m.share_percent).toFixed(0)}%</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
