import type { CustomerRelation } from "../../../types/owner";
import { QUICK_TAGS, RELATION_OPTIONS } from "./crmUtils";

export type CustomerFormState = {
  name: string;
  phone: string;
  email: string;
  locality: string;
  address: string;
  birthday: string;
  anniversary: string;
  relation: CustomerRelation | "";
  tags: string[];
  notes: string;
  marketing_opt_in: boolean;
};

export const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  locality: "",
  address: "",
  birthday: "",
  anniversary: "",
  relation: "",
  tags: [],
  notes: "",
  marketing_opt_in: true,
};

type Props = {
  form: CustomerFormState;
  onChange: (next: CustomerFormState) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function CustomerFormFields({ form, onChange, disabled, compact }: Props) {
  const set = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) =>
    onChange({ ...form, [key]: value });

  const toggleTag = (tag: string) => {
    const has = form.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
    set("tags", has ? form.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...form.tags, tag]);
  };

  return (
    <>
      <div className="ir-grid">
        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Guest name" disabled={disabled} />
        </label>
        <label className="field">
          <span>Mobile</span>
          <input
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="10-digit mobile"
            disabled={disabled}
          />
        </label>
        <label className="field">
          <span>Locality / area</span>
          <input value={form.locality} onChange={(e) => set("locality", e.target.value)} placeholder="e.g. Sector 12" disabled={disabled} />
        </label>
        <label className="field">
          <span>Relation</span>
          <select
            value={form.relation}
            onChange={(e) => set("relation", e.target.value as CustomerRelation | "")}
            disabled={disabled}
          >
            <option value="">—</option>
            {RELATION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Birthday</span>
          <input type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} disabled={disabled} />
        </label>
        <label className="field">
          <span>Anniversary</span>
          <input type="date" value={form.anniversary} onChange={(e) => set("anniversary", e.target.value)} disabled={disabled} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="optional" disabled={disabled} />
        </label>
        <label className="field field--checkbox crm-optin">
          <input
            type="checkbox"
            checked={form.marketing_opt_in}
            onChange={(e) => set("marketing_opt_in", e.target.checked)}
            disabled={disabled}
          />
          <span>OK to send offers on WhatsApp / SMS</span>
        </label>
        <label className="field ir-grid--full">
          <span>Address</span>
          <textarea
            rows={compact ? 2 : 3}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House / street / landmark — handy for delivery"
            disabled={disabled}
          />
        </label>
      </div>

      <div className="field">
        <span>Tags</span>
        <div className="crm-tags">
          {QUICK_TAGS.map((tag) => {
            const on = form.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                className={`crm-tag-btn ${on ? "crm-tag-btn--on" : ""}`}
                onClick={() => toggleTag(tag)}
                disabled={disabled}
              >
                {tag}
              </button>
            );
          })}
          {form.tags
            .filter((t) => !QUICK_TAGS.some((q) => q.toLowerCase() === t.toLowerCase()))
            .map((t) => (
              <button
                key={t}
                type="button"
                className="crm-tag-btn crm-tag-btn--on"
                onClick={() => toggleTag(t)}
                disabled={disabled}
                title="Remove tag"
              >
                {t} ×
              </button>
            ))}
          <input
            className="crm-tag-input"
            placeholder="+ custom tag, press Enter"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) {
                  toggleTag(v);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
        </div>
      </div>

      <label className="field">
        <span>Notes (private)</span>
        <textarea
          rows={compact ? 2 : 3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Allergies, seating preference, 'likes extra spicy', etc."
          disabled={disabled}
        />
      </label>
    </>
  );
}
