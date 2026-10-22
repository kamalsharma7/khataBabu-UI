import { useEffect, useRef, useState } from "react";
import { createCustomer, lookupCustomer, searchCustomers, updateCustomer } from "../../../api/owner";
import { OwnerApiError } from "../../../api/ownerClient";
import type { CustomerRelation, CustomerSummary } from "../../../types/owner";
import type { PosOrder } from "../../../types/owner";
import {
  RELATION_OPTIONS,
  daysAgoLabel,
  inr,
  normalizeMobile,
  segmentLabel,
} from "../crm/crmUtils";

type Patch = {
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_locality?: string | null;
  customer_relation?: CustomerRelation | null;
};

type Props = {
  order: PosOrder;
  busy: boolean;
  onSaveOrderDetails: (patch: Patch) => void;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; customer: CustomerSummary; favourites: string[]; greeting: string | null }
  | { kind: "new" };

export function PosCustomerPanel({ order, busy, onSaveOrderDetails }: Props) {
  const [mobile, setMobile] = useState(order.customer_mobile ?? "");
  const [name, setName] = useState(order.customer_name ?? "");
  const [locality, setLocality] = useState(order.customer_locality ?? "");
  const [relation, setRelation] = useState<CustomerRelation | "">(order.customer_relation ?? "");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<CustomerSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupSeq = useRef(0);
  const searchSeq = useRef(0);

  useEffect(() => {
    setMobile(order.customer_mobile ?? "");
    setName(order.customer_name ?? "");
    setLocality(order.customer_locality ?? "");
    setRelation(order.customer_relation ?? "");
  }, [order.id, order.customer_mobile, order.customer_name, order.customer_locality, order.customer_relation]);

  // Lookup by mobile once we have a full number.
  useEffect(() => {
    const digits = normalizeMobile(mobile);
    if (digits.length < 10) {
      setLookup({ kind: "idle" });
      return;
    }
    const seq = ++lookupSeq.current;
    setLookup({ kind: "loading" });
    const t = window.setTimeout(async () => {
      try {
        const res = await lookupCustomer(order.outlet_id, digits);
        if (seq !== lookupSeq.current) return;
        if (res.found && res.customer) {
          const c = res.customer;
          setLookup({ kind: "found", customer: c, favourites: res.favourite_items, greeting: res.greeting });
          setName((prev) => prev || c.name || "");
          setLocality((prev) => prev || c.locality || "");
          setRelation((prev) => prev || c.relation || "");
          setEmail(c.email ?? "");
          setBirthday(c.birthday ?? "");
        } else {
          setLookup({ kind: "new" });
        }
      } catch {
        if (seq === lookupSeq.current) setLookup({ kind: "idle" });
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [mobile, order.outlet_id]);

  // Name suggestions from CRM while typing (only when no mobile typed yet).
  useEffect(() => {
    const term = name.trim();
    if (term.length < 2 || normalizeMobile(mobile).length >= 10) {
      setSuggestions([]);
      return;
    }
    const seq = ++searchSeq.current;
    const t = window.setTimeout(async () => {
      try {
        const rows = await searchCustomers(order.outlet_id, term);
        if (seq === searchSeq.current) setSuggestions(rows.slice(0, 6));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [name, mobile, order.outlet_id]);

  const pickSuggestion = (c: CustomerSummary) => {
    setSuggestions([]);
    setName(c.name ?? "");
    setMobile(c.phone ?? "");
    setLocality(c.locality ?? "");
    setRelation(c.relation ?? "");
  };

  const clearAll = () => {
    setMobile("");
    setName("");
    setLocality("");
    setRelation("");
    setEmail("");
    setBirthday("");
    setAddress("");
    setLookup({ kind: "idle" });
    onSaveOrderDetails({
      customer_name: null,
      customer_mobile: null,
      customer_locality: null,
      customer_relation: null,
    });
  };

  const save = async () => {
    setError(null);
    const digits = normalizeMobile(mobile);
    if (mobile.trim() && digits.length < 10) {
      setError("Mobile should be 10 digits (we save it to CRM by mobile).");
      return;
    }
    setSaving(true);
    try {
      const extras = {
        email: email.trim() || null,
        birthday: birthday || null,
        address: address.trim() || null,
      };
      const hasExtras = Boolean(extras.email || extras.birthday || extras.address);
      if (digits.length >= 10) {
        if (lookup.kind === "found") {
          const body: Record<string, unknown> = {};
          if (name.trim()) body.name = name.trim();
          if (locality.trim()) body.locality = locality.trim();
          if (relation) body.relation = relation;
          if (extras.email) body.email = extras.email;
          if (extras.birthday) body.birthday = extras.birthday;
          if (extras.address) body.address = extras.address;
          if (Object.keys(body).length > 0) {
            await updateCustomer(order.outlet_id, lookup.customer.id, body);
          }
        } else if (hasExtras) {
          // New customer with extra details: create first so nothing is lost; the order patch links by mobile.
          try {
            await createCustomer(order.outlet_id, {
              phone: digits,
              name: name.trim() || null,
              locality: locality.trim() || null,
              relation: relation || null,
              ...extras,
            });
          } catch (err) {
            if (!(err instanceof OwnerApiError && err.status === 409)) throw err;
          }
        }
      }
      onSaveOrderDetails({
        customer_name: name.trim() || null,
        customer_mobile: digits || null,
        customer_locality: locality.trim() || null,
        customer_relation: relation || null,
      });
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save customer");
    } finally {
      setSaving(false);
    }
  };

  const disabled = busy || saving;
  const found = lookup.kind === "found" ? lookup.customer : null;

  return (
    <div className="pp-cart-panel pos-cust">
      <div className="pos-cust__head">
        <h3 className="pp-cart-panel__title">Customer</h3>
        {order.customer_id && <span className="pos-cust__linked">In CRM</span>}
      </div>

      <label className="field">
        <span>Mobile</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="10-digit mobile — we remember the guest by this"
          disabled={disabled}
        />
      </label>

      {lookup.kind === "loading" && <p className="pos-cust__hint muted">Checking CRM…</p>}
      {lookup.kind === "new" && (
        <p className="pos-cust__hint pos-cust__hint--new">New guest — will be added to your customer database on save.</p>
      )}
      {found && (
        <div className={`pos-cust__card pos-cust__card--${found.segment}`}>
          <div className="pos-cust__card-top">
            <strong>{found.name || "Guest"}</strong>
            <span className={`crm-seg crm-seg--${found.segment}`}>{segmentLabel(found.segment)}</span>
          </div>
          <div className="pos-cust__stats">
            <span><b>{found.visit_count}</b> visits</span>
            <span><b>{inr(found.total_spend_inr)}</b> spent</span>
            <span>Last: <b>{daysAgoLabel(found.days_since_last_visit)}</b></span>
            {Number(found.khata_due_inr) > 0 && (
              <span className="pos-cust__due">Khata due <b>{inr(found.khata_due_inr)}</b></span>
            )}
          </div>
          {lookup.kind === "found" && lookup.favourites.length > 0 && (
            <p className="pos-cust__fav">Usually orders: {lookup.favourites.join(", ")}</p>
          )}
          {found.birthday && isBirthdayNear(found.birthday) && (
            <p className="pos-cust__occasion">🎂 Birthday {birthdayWhen(found.birthday)} — maybe a sweet on the house?</p>
          )}
        </div>
      )}

      <label className="field pos-cust__name">
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guest name"
          autoComplete="off"
          disabled={disabled}
        />
        {suggestions.length > 0 && (
          <ul className="pos-cust__suggest">
            {suggestions.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pickSuggestion(c)}>
                  <span>{c.name || "Guest"}</span>
                  <small className="muted">
                    {c.phone ?? "no mobile"} · {c.visit_count} visits{c.locality ? ` · ${c.locality}` : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>

      <div className="pos-cust__row">
        <label className="field">
          <span>Locality</span>
          <input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Area / landmark"
            disabled={disabled}
          />
        </label>
        <label className="field">
          <span>Relation</span>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value as CustomerRelation | "")}
            disabled={disabled}
          >
            <option value="">—</option>
            {RELATION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="pos-cust__more-toggle"
        onClick={() => setMoreOpen((v) => !v)}
        disabled={disabled}
      >
        {moreOpen ? "▾" : "▸"} More for CRM (birthday, email, address)
      </button>
      {moreOpen && (
        <div className="pos-cust__more">
          <div className="pos-cust__row">
            <label className="field">
              <span>Birthday</span>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} disabled={disabled} />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
                disabled={disabled}
              />
            </label>
          </div>
          <label className="field">
            <span>Delivery address</span>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / street / landmark"
              disabled={disabled}
            />
          </label>
        </div>
      )}

      {error && <p className="form-error pos-cust__error">{error}</p>}

      <div className="pos-cust__actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={() => void save()}>
          {saving ? "Saving…" : "Save customer"}
        </button>
        {(order.customer_mobile || order.customer_name) && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={clearAll}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function birthdayDaysAway(iso: string): number {
  const today = new Date();
  const b = new Date(iso);
  const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next < t0) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - t0.getTime()) / 86400000);
}

function isBirthdayNear(iso: string): boolean {
  const d = birthdayDaysAway(iso);
  return d <= 3;
}

function birthdayWhen(iso: string): string {
  const d = birthdayDaysAway(iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}
