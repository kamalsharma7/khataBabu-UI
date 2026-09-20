import { useEffect, useState } from "react";
import type { MenuItem, PosOrderLine } from "../../../types/owner";

type Props = {
  menuItems: MenuItem[];
  editLine?: PosOrderLine | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    description: string;
    unit_price: number;
    quantity: number;
    notes: string | null;
    menu_item_id: string | null;
  }) => void;
};

export function PosOpenLineModal({ menuItems, editLine, busy, onClose, onSubmit }: Props) {
  const isEdit = Boolean(editLine);
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [menuItemId, setMenuItemId] = useState("");

  useEffect(() => {
    if (editLine) {
      setDescription(editLine.item_name);
      setUnitPrice(editLine.unit_price);
      setQuantity(String(editLine.quantity));
      setNotes(editLine.notes ?? "");
      setMenuItemId(editLine.menu_item_id ?? "");
    } else {
      setDescription("");
      setUnitPrice("");
      setQuantity("1");
      setNotes("");
      setMenuItemId("");
    }
  }, [editLine]);

  const price = parseFloat(unitPrice);
  const qty = parseInt(quantity, 10);
  const valid =
    description.trim().length > 0 && Number.isFinite(price) && price > 0 && Number.isFinite(qty) && qty >= 1;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal pos-picker-modal pos-open-line-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="open-line-title"
      >
        <h2 id="open-line-title">{isEdit ? "Edit open item" : "Open bill item"}</h2>
        <p className="muted">
          Custom charge with your own description and price. Use when something is not on the menu or the bill needs a
          manual line. You can still send KOT for kitchen notes if needed.
        </p>
        <label className="field">
          <span>Description *</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Special parcel, corkage, misc"
            disabled={busy || isEdit}
          />
        </label>
        <div className="pos-open-line-modal__row">
          <label className="field">
            <span>Price (₹) *</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Qty</span>
            <input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>
        <label className="field">
          <span>Comment / notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note on bill or kitchen"
            disabled={busy}
          />
        </label>
        {!isEdit && (
          <label className="field">
            <span>Link menu item (optional)</span>
            <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} disabled={busy}>
              <option value="">— None —</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !valid}
            onClick={() =>
              onSubmit({
                description: description.trim(),
                unit_price: price,
                quantity: qty,
                notes: notes.trim() || null,
                menu_item_id: menuItemId || null,
              })
            }
          >
            {isEdit ? "Save" : "Add to order"}
          </button>
        </div>
      </div>
    </div>
  );
}
