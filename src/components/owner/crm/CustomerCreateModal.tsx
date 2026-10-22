import { useState } from "react";
import type { CustomerWrite } from "../../../types/owner";
import { CustomerFormFields, EMPTY_CUSTOMER_FORM, type CustomerFormState } from "./CustomerFormFields";
import { normalizeMobile } from "./crmUtils";

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (body: CustomerWrite) => Promise<void>;
};

export function CustomerCreateModal({ open, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    const phone = normalizeMobile(form.phone);
    if (!form.name.trim() && !phone) {
      setError("Enter at least a name or a mobile number.");
      return;
    }
    if (form.phone.trim() && phone.length < 10) {
      setError("Mobile should be 10 digits.");
      return;
    }
    await onSubmit({
      name: form.name.trim() || null,
      phone: phone || null,
      email: form.email.trim() || null,
      locality: form.locality.trim() || null,
      address: form.address.trim() || null,
      birthday: form.birthday || null,
      anniversary: form.anniversary || null,
      relation: form.relation || null,
      tags: form.tags,
      notes: form.notes.trim() || null,
      marketing_opt_in: form.marketing_opt_in,
    });
    setForm(EMPTY_CUSTOMER_FORM);
  };

  return (
    <div className="ir-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="ir-modal card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="ir-modal__head">
          <div className="ir-modal__head-copy">
            <span className="ir-mode-badge ir-mode-badge--create">New</span>
            <h2>Add customer</h2>
            <p className="ir-modal__subtitle">
              Most customers get added automatically from billing — use this for walk-ins, party bookings, or
              importing a contact.
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="ir-modal__body">
          {error && <p className="form-error">{error}</p>}
          <section className="ir-section">
            <CustomerFormFields form={form} onChange={setForm} disabled={saving} compact />
          </section>
        </div>
        <footer className="ir-modal__foot">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save customer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
