import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  collectionCalling,
  createCollection,
  listCollectionVenues,
  restaurantCollections,
} from "../api/platform";
import { VenueCollectionHistoryModal } from "../components/platform/VenueCollectionHistoryModal";
import type {
  CollectionCallingList,
  CollectionVenueOption,
  RestaurantCollectionList,
  RestaurantCollectionRow,
} from "../types/platform";

type TabId = "collection_calling" | "restaurant_collections";

function formatInr(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

const TENURE_PRESETS = [1, 3, 6, 12, 24] as const;

export function PlatformCollectionsPage() {
  const [venues, setVenues] = useState<CollectionVenueOption[]>([]);
  const [calling, setCalling] = useState<CollectionCallingList | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantCollectionList | null>(null);
  const [tab, setTab] = useState<TabId>("collection_calling");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [businessId, setBusinessId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [nextPaymentDate, setNextPaymentDate] = useState(() => addMonths(todayIso(), 12));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyVenue, setHistoryVenue] = useState<RestaurantCollectionRow | null>(null);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.business_id === businessId),
    [venues, businessId],
  );

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [call, rest] = await Promise.all([collectionCalling(), restaurantCollections()]);
      setCalling(call);
      setRestaurants(rest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void listCollectionVenues()
      .then(setVenues)
      .catch(() => setVenues([]));
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    setNextPaymentDate(addMonths(paymentDate, tenureMonths));
  }, [paymentDate, tenureMonths]);

  const summary = useMemo(() => {
    const rows = restaurants?.rows ?? [];
    const withPack = rows.filter((r) => r.has_collection);
    const total = withPack.reduce((s, r) => s + parseFloat(r.total_collected_inr || "0"), 0);
    const dueCount = calling?.rows.length ?? 0;
    const overdue = calling?.rows.filter((r) => r.is_overdue).length ?? 0;
    return { venueCount: rows.length, withPack: withPack.length, total, dueCount, overdue };
  }, [restaurants, calling]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(/,/g, ""));
    if (!businessId || !Number.isFinite(amt) || amt <= 0) {
      setError("Select a venue and enter a valid amount");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createCollection({
        business_id: businessId,
        amount_inr: amt,
        payment_date: paymentDate,
        next_payment_date: nextPaymentDate,
        tenure_months: tenureMonths,
        notes: notes.trim() || null,
      });
      setSuccess(`Recorded ${formatInr(amt)} for ${selectedVenue?.legal_name ?? "venue"}.`);
      setAmount("");
      setNotes("");
      await loadLists();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save collection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page coll-page">
      <header className="coll-hero">
        <div>
          <h1>Collections</h1>
          <p className="muted">
            Track KhataBabu subscription payments from onboarded restaurants—pack amount, tenure,
            and renewal dates.
          </p>
        </div>
      </header>

      <section className="coll-stats">
        <div className="coll-stat coll-stat--primary">
          <span className="coll-stat__label">Total collected</span>
          <span className="coll-stat__value">{formatInr(summary.total)}</span>
          <span className="coll-stat__hint">{summary.withPack} venues with packs</span>
        </div>
        <div className="coll-stat">
          <span className="coll-stat__label">Onboarded venues</span>
          <span className="coll-stat__value">{summary.venueCount}</span>
          <span className="coll-stat__hint">Eligible for collections</span>
        </div>
        <div className="coll-stat coll-stat--alert">
          <span className="coll-stat__label">Calling queue</span>
          <span className="coll-stat__value">{summary.dueCount}</span>
          <span className="coll-stat__hint">
            Due in 3 days{summary.overdue > 0 ? ` · ${summary.overdue} overdue` : ""}
          </span>
        </div>
      </section>

      <form className="card coll-record-form" onSubmit={onSubmit}>
        <div className="coll-record-form__head">
          <h2>Record collection</h2>
          <p className="muted">Payment received for a restaurant subscription pack</p>
        </div>
        <div className="coll-form-grid">
          <label className="field coll-field--wide">
            <span>Restaurant (onboarded)</span>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              required
            >
              <option value="">Select venue…</option>
              {venues.map((v) => (
                <option key={v.business_id} value={v.business_id}>
                  {v.legal_name} — {v.outlet_name} ({v.outlet_ref_code}) · {v.city}
                </option>
              ))}
            </select>
          </label>
          {selectedVenue && (
            <div className="coll-venue-chip">
              Joined {formatDate(selectedVenue.joining_date)} · {selectedVenue.state}
            </div>
          )}
          <label className="field">
            <span>Amount received (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 12000"
              required
            />
          </label>
          <label className="field">
            <span>Payment date</span>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Pack tenure (months)</span>
            <div className="coll-tenure-row">
              <input
                type="number"
                min={1}
                max={120}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value, 10) || 1)}
                required
              />
              <div className="coll-tenure-pills">
                {TENURE_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`coll-tenure-pill ${tenureMonths === m ? "coll-tenure-pill--on" : ""}`}
                    onClick={() => setTenureMonths(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </label>
          <label className="field">
            <span>Next payment date</span>
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
              required
            />
            <span className="field-hint">Auto-filled from payment date + tenure; you can override.</span>
          </label>
          <label className="field coll-field--wide">
            <span>Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="UPI ref, invoice #, negotiation notes…"
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="coll-success" role="status">{success}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save collection"}
        </button>
      </form>

      <div className="coll-tabs" role="tablist" aria-label="Collections views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "collection_calling"}
          className={`coll-tab ${tab === "collection_calling" ? "coll-tab--active" : ""}`}
          onClick={() => setTab("collection_calling")}
        >
          collection_calling
          {calling && calling.rows.length > 0 && (
            <span className="coll-tab__badge">{calling.rows.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "restaurant_collections"}
          className={`coll-tab ${tab === "restaurant_collections" ? "coll-tab--active" : ""}`}
          onClick={() => setTab("restaurant_collections")}
        >
          Restaurant_collections
        </button>
      </div>

      <section className="card coll-panel">
        {tab === "collection_calling" && (
          <>
            <div className="coll-panel__head">
              <h2>Collection calling</h2>
              <p className="muted">
                Venues whose latest pack renewal is overdue, due today, or due within the
                next {calling?.due_within_days ?? 3} days
                {calling ? ` (as of ${formatDate(calling.as_of)})` : ""}
              </p>
            </div>
            {loading && <p className="muted coll-empty">Loading…</p>}
            {!loading && calling && calling.rows.length === 0 && (
              <p className="muted coll-empty">No venues due for calling in this window.</p>
            )}
            {!loading && calling && calling.rows.length > 0 && (
              <div className="table-wrap">
                <table className="data-table coll-table">
                  <thead>
                    <tr>
                      <th>Venue</th>
                      <th>Location</th>
                      <th>Owner contact</th>
                      <th>Last pack</th>
                      <th>Tenure</th>
                      <th>Next payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calling.rows.map((row) => (
                      <tr key={row.collection_id} className={row.is_overdue ? "coll-row--overdue" : ""}>
                        <td>
                          <strong>{row.legal_name}</strong>
                          <div className="table-sub">{row.outlet_name} · <code>{row.outlet_ref_code}</code></div>
                        </td>
                        <td>{row.city}, {row.state}</td>
                        <td>
                          {row.owner_name && <strong>{row.owner_name}</strong>}
                          {row.owner_mobile ? (
                            <div>
                              <a className="coll-phone-link" href={`tel:${row.owner_mobile}`}>
                                {row.owner_mobile}
                              </a>
                            </div>
                          ) : (
                            <span className="muted">No owner mobile</span>
                          )}
                          <div className="table-sub">Venue: {row.venue_phone}</div>
                        </td>
                        <td className="coll-num">{formatInr(row.amount_inr)}</td>
                        <td>{row.tenure_months} mo</td>
                        <td>
                          <strong>{formatDate(row.next_payment_date)}</strong>
                          <div className="table-sub">
                            Paid {formatDate(row.payment_date)}
                          </div>
                        </td>
                        <td>
                          {row.is_overdue ? (
                            <span className="coll-due coll-due--overdue">
                              Overdue {Math.abs(row.days_until_due)}d
                            </span>
                          ) : row.days_until_due === 0 ? (
                            <span className="coll-due coll-due--today">Due today</span>
                          ) : (
                            <span className="coll-due">In {row.days_until_due}d</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "restaurant_collections" && (
          <>
            <div className="coll-panel__head">
              <h2>Restaurant collections</h2>
              <p className="muted">Click a row to view full collection history for that venue</p>
            </div>
            {loading && <p className="muted coll-empty">Loading…</p>}
            {!loading && restaurants && restaurants.rows.length === 0 && (
              <p className="muted coll-empty">No onboarded venues yet.</p>
            )}
            {!loading && restaurants && restaurants.rows.length > 0 && (
              <div className="table-wrap">
                <table className="data-table coll-table data-table--clickable">
                  <thead>
                    <tr>
                      <th>Restaurant</th>
                      <th>Joined</th>
                      <th>Plan</th>
                      <th>Latest pack</th>
                      <th>Tenure</th>
                      <th>Last paid</th>
                      <th>Next due</th>
                      <th>Total collected</th>
                      <th>Packs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.rows.map((row) => (
                      <tr
                        key={row.business_id}
                        className={!row.has_collection ? "coll-row--muted" : ""}
                        onClick={() => setHistoryVenue(row)}
                        tabIndex={0}
                        onKeyDown={(ev) => ev.key === "Enter" && setHistoryVenue(row)}
                      >
                        <td>
                          <strong>{row.legal_name}</strong>
                          <div className="table-sub">
                            {row.outlet_name} · <code>{row.outlet_ref_code}</code>
                          </div>
                          <div className="table-sub">{row.city}, {row.state}</div>
                        </td>
                        <td>{formatDate(row.joining_date)}</td>
                        <td>
                          <span className={`status-pill status-${row.status}`}>{row.status}</span>
                          <div className="table-sub">{row.plan_tier}</div>
                        </td>
                        <td className="coll-num">
                          {row.latest_amount_inr ? formatInr(row.latest_amount_inr) : "—"}
                        </td>
                        <td>{row.tenure_months != null ? `${row.tenure_months} mo` : "—"}</td>
                        <td>
                          {row.latest_payment_date ? formatDate(row.latest_payment_date) : "—"}
                        </td>
                        <td>
                          {row.next_payment_date ? formatDate(row.next_payment_date) : "—"}
                        </td>
                        <td className="coll-num coll-num--strong">
                          {formatInr(row.total_collected_inr)}
                        </td>
                        <td>{row.pack_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {historyVenue && (
        <VenueCollectionHistoryModal
          venue={historyVenue}
          onClose={() => setHistoryVenue(null)}
        />
      )}
    </div>
  );
}
