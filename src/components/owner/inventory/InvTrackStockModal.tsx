import { createPortal } from "react-dom";
import { STOCK_UNITS } from "./invUtils";

type Props = {
  menuName: string;
  isUpdate: boolean;
  unit: string;
  qtyPerKot: string;
  todayQty: string;
  busy: boolean;
  onUnitChange: (v: string) => void;
  onQtyPerKotChange: (v: string) => void;
  onTodayQtyChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function InvTrackStockModal({
  menuName,
  isUpdate,
  unit,
  qtyPerKot,
  todayQty,
  busy,
  onUnitChange,
  onQtyPerKotChange,
  onTodayQtyChange,
  onClose,
  onSubmit,
}: Props) {
  return createPortal(
    <div className="modal-backdrop inv-track-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal inv-track-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-track-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="inv-track-modal__header">
          <h2 id="inv-track-title">{isUpdate ? "Edit stock tracking" : "Track stock"}</h2>
          <p className="inv-track-modal__item">
            <span className="inv-track-modal__item-label">Menu item</span>
            <strong className="inv-track-modal__item-name">{menuName}</strong>
          </p>
        </header>

        <div className="inv-track-modal__body">
          <label className="field inv-track-modal__field">
            <span>Unit</span>
            <select value={unit} onChange={(e) => onUnitChange(e.target.value)} disabled={busy}>
              {STOCK_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </label>
          <label className="field inv-track-modal__field">
            <span>Deduct per KOT</span>
            <input
              type="number"
              min={0.01}
              step={1}
              value={qtyPerKot}
              onChange={(e) => onQtyPerKotChange(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="field inv-track-modal__field">
            <span>Aaj ka count (opening)</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 26"
              value={todayQty}
              onChange={(e) => onTodayQtyChange(e.target.value)}
              disabled={busy}
            />
          </label>
          <p className="muted inv-track-modal__hint">
            Stock reduces when KOT is sent. Example: 1 can per KOT, opening 26 for today.
          </p>
        </div>

        <footer className="inv-track-modal__actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onSubmit}>
            {isUpdate ? "Save changes" : "Enable tracking"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
