import { useEffect, useState } from "react";
import type { CustomerDetail, CustomerWrite } from "../../../types/owner";
import { CustomerFormFields, EMPTY_CUSTOMER_FORM, type CustomerFormState } from "./CustomerFormFields";
import {
  SEGMENT_META,
  daysAgoLabel,
  fmtDate,
  fmtDateTime,
  initials,
  inr,
  orderTypeLabel,
  paymentLabel,
  segmentLabel,
  waLink,
} from "./crmUtils";

type Props = {
  customer: CustomerDetail | null;
  loading: boolean;
  saving: boolean;
  canDelete: boolean;
  businessName?: string | null;
  onClose: () => void;
  onSave: (body: CustomerWrite) => Promise<void>;
  onDelete: () => Promise<void>;
};

function toForm(c: CustomerDetail): CustomerFormState {
  return {
    name: c.name ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    locality: c.locality ?? "",
    address: c.address ?? "",
    birthday: c.birthday ?? "",
    anniversary: c.anniversary ?? "",
    relation: c.relation ?? "",
    tags: c.tags ?? [],
    notes: c.notes ?? "",
    marketing_opt_in: c.marketing_opt_in,
  };
}

export function CustomerDetailModal({
  customer,
  loading,
  saving,
  canDelete,
  businessName,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<"overview" | "visits" | "profile">("overview");
  const [form, setForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm(toForm(customer));
      setConfirmDelete(false);
    }
  }, [customer]);

  const submitProfile = async () => {
    if (!customer) return;
    const body: CustomerWrite = {
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      locality: form.locality.trim() || null,
      address: form.address.trim() || null,
      relation: form.relation || null,
      tags: form.tags,
      notes: form.notes.trim() || null,
      marketing_opt_in: form.marketing_opt_in,
    };
    if (form.birthday) body.birthday = form.birthday;
    else if (customer.birthday) body.clear_birthday = true;
    if (form.anniversary) body.anniversary = form.anniversary;
    else if (customer.anniversary) body.clear_anniversary = true;
    await onSave(body);
  };

  const wa = waLink(
    customer?.phone,
    customer
      ? `Hi ${customer.name || ""}! This is ${businessName || "us"}. `
      : undefined,
  );
  const maxWeekday = Math.max(1, ...(customer?.visits_by_weekday.map((w) => w.visits) ?? [1]));
  const maxDaypart = Math.max(1, ...(customer?.visits_by_daypart.map((w) => w.visits) ?? [1]));

  return (
    <div className="ir-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ir-modal card crm-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ir-modal__head crm-modal__head">
          <div className="crm-modal__identity">
            <span className={`crm-avatar crm-avatar--${customer?.segment ?? "prospect"}`}>
              {initials(customer?.name, customer?.phone)}
            </span>
            <div className="ir-modal__head-copy">
              <h2>{loading || !customer ? "Loading…" : customer.name || "Guest"}</h2>
              {customer && (
                <p className="ir-modal__subtitle crm-modal__sub">
                  {customer.phone ? <span>{customer.phone}</span> : <span className="muted">No mobile</span>}
                  {customer.locality && <span>· {customer.locality}</span>}
                  <span
                    className={`crm-seg crm-seg--${customer.segment}`}
                    title={SEGMENT_META[customer.segment]?.hint}
                  >
                    {segmentLabel(customer.segment)}
                  </span>
                  {customer.tags.map((t) => (
                    <span key={t} className="crm-tag">{t}</span>
                  ))}
                </p>
              )}
            </div>
          </div>
          <div className="pur-invoice-head-actions">
            {customer?.phone && (
              <a className="btn btn-secondary btn-sm" href={`tel:${customer.phone}`}>Call</a>
            )}
            {wa && (
              <a className="btn btn-secondary btn-sm" href={wa} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <nav className="crm-modal__tabs">
          {(
            [
              ["overview", "Overview"],
              ["visits", `Visits${customer ? ` (${customer.visit_count})` : ""}`],
              ["profile", "Profile & notes"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`crm-tab ${tab === key ? "crm-tab--active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ir-modal__body">
          {(loading || !customer) && <p className="muted">Loading customer…</p>}

          {customer && tab === "overview" && (
            <>
              <section className="crm-kpis">
                <div className="crm-kpi">
                  <span>Visits</span>
                  <strong>{customer.visit_count}</strong>
                  <small className="muted">
                    {customer.avg_days_between_visits
                      ? `every ~${Math.round(Number(customer.avg_days_between_visits))} days`
                      : "—"}
                  </small>
                </div>
                <div className="crm-kpi">
                  <span>Lifetime spend</span>
                  <strong>{inr(customer.total_spend_inr)}</strong>
                  <small className="muted">avg bill {inr(customer.avg_ticket_inr)}</small>
                </div>
                <div className="crm-kpi">
                  <span>Last visit</span>
                  <strong>{daysAgoLabel(customer.days_since_last_visit)}</strong>
                  <small className="muted">first {fmtDate(customer.first_visit_at)}</small>
                </div>
                <div className={`crm-kpi ${Number(customer.khata_due_inr) > 0 ? "crm-kpi--due" : ""}`}>
                  <span>Khata (udhaar)</span>
                  <strong>{inr(customer.khata_due_inr)}</strong>
                  <small className="muted">settled as "due"</small>
                </div>
              </section>

              <div className="crm-two-col">
                <section className="ir-section">
                  <div className="ir-section__head">
                    <h3>What they like</h3>
                  </div>
                  {customer.favourite_items.length === 0 && <p className="muted">No settled orders yet.</p>}
                  <ul className="crm-fav-list">
                    {customer.favourite_items.map((f, i) => (
                      <li key={f.item_name}>
                        <span className="crm-fav-rank">{i + 1}</span>
                        <span className="crm-fav-name">{f.item_name}</span>
                        <span className="muted">
                          {f.times_ordered}× · {f.total_qty} plates
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="crm-pref-row">
                    <span>
                      Prefers <strong>{orderTypeLabel(customer.preferred_order_type)}</strong>
                    </span>
                    {customer.veg_share_percent !== null && (
                      <span>
                        Veg share <strong>{Number(customer.veg_share_percent).toFixed(0)}%</strong>
                      </span>
                    )}
                    {customer.avg_guest_count && (
                      <span>
                        Avg party <strong>{customer.avg_guest_count}</strong>
                      </span>
                    )}
                  </div>
                </section>

                <section className="ir-section">
                  <div className="ir-section__head">
                    <h3>When they come</h3>
                  </div>
                  <div className="crm-bars">
                    {customer.visits_by_weekday.map((w) => (
                      <div key={w.weekday} className="crm-bar" title={`${w.visits} visits`}>
                        <div className="crm-bar__track">
                          <div className="crm-bar__fill" style={{ height: `${(w.visits / maxWeekday) * 100}%` }} />
                        </div>
                        <span>{w.label}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="crm-daypart">
                    {customer.visits_by_daypart.map((d) => (
                      <li key={d.key}>
                        <span>{d.label}</span>
                        <div className="crm-hbar">
                          <div className="crm-hbar__fill" style={{ width: `${(d.visits / maxDaypart) * 100}%` }} />
                        </div>
                        <b>{d.visits}</b>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="ir-section">
                <div className="ir-section__head">
                  <h3>How they pay</h3>
                </div>
                {customer.payment_mix.length === 0 && <p className="muted">—</p>}
                <div className="crm-paymix">
                  {customer.payment_mix.map((p) => (
                    <span key={p.method} className={`crm-paymix__chip crm-paymix__chip--${p.method}`}>
                      {paymentLabel(p.method)} <b>{Number(p.share_percent).toFixed(0)}%</b>
                      <small>{inr(p.amount_inr)}</small>
                    </span>
                  ))}
                </div>
              </section>

              {(customer.notes || customer.birthday || customer.anniversary || customer.address) && (
                <section className="ir-section">
                  <div className="ir-section__head">
                    <h3>Good to know</h3>
                  </div>
                  <div className="crm-facts">
                    {customer.birthday && <span>🎂 Birthday {fmtDate(customer.birthday)}</span>}
                    {customer.anniversary && <span>💍 Anniversary {fmtDate(customer.anniversary)}</span>}
                    {customer.address && <span>📍 {customer.address}</span>}
                    {customer.notes && <span className="crm-facts__note">📝 {customer.notes}</span>}
                  </div>
                </section>
              )}
            </>
          )}

          {customer && tab === "visits" && (
            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Recent visits</h3>
                <span className="ir-section__count">{customer.recent_visits.length}</span>
              </div>
              {customer.recent_visits.length === 0 && <p className="muted">No settled bills for this customer yet.</p>}
              {customer.recent_visits.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table ir-ing-table crm-visits">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Bill</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Paid by</th>
                        <th className="terr-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.recent_visits.map((v) => (
                        <tr key={`${v.order_id}-${v.bill_id}`}>
                          <td>{fmtDateTime(v.settled_at)}</td>
                          <td>
                            {v.invoice_code ?? `#${v.bill_number ?? v.order_number}`}
                            {v.table_label && <div className="muted">{v.table_label}</div>}
                          </td>
                          <td>{orderTypeLabel(v.order_type)}{v.guest_count ? ` · ${v.guest_count} pax` : ""}</td>
                          <td className="crm-visits__items">{v.items_summary || "—"}</td>
                          <td>{v.payment_methods.map(paymentLabel).join(", ") || "—"}</td>
                          <td className="terr-num"><strong>{inr(v.grand_total)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {customer && tab === "profile" && (
            <section className="ir-section">
              <div className="ir-section__head">
                <h3>Profile</h3>
                <span className="muted">
                  Added {fmtDate(customer.created_at)} via {customer.source === "pos" ? "billing" : customer.source}
                </span>
              </div>
              <CustomerFormFields form={form} onChange={setForm} disabled={saving} />
            </section>
          )}
        </div>

        <footer className="ir-modal__foot crm-modal__foot">
          {canDelete && customer && (
            confirmDelete ? (
              <span className="crm-confirm">
                Delete this customer? Bills stay, only the CRM record goes.
                <button type="button" className="btn btn-danger btn-sm" disabled={saving} onClick={() => void onDelete()}>
                  Yes, delete
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </span>
            ) : (
              <button type="button" className="ir-icon-btn ir-icon-btn--danger" onClick={() => setConfirmDelete(true)}>
                Delete customer
              </button>
            )
          )}
          <span className="pur-foot-spacer" />
          {tab === "profile" ? (
            <button type="button" className="btn btn-primary" disabled={saving || !customer} onClick={() => void submitProfile()}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setTab("profile")}>
              Edit profile
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
