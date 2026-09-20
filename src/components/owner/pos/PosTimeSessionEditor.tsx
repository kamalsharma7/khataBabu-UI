import { useRef } from "react";
import type { PosOrder } from "../../../types/owner";
import { fmt } from "./posUtils";
import {
  formatSessionClock,
  formatSessionClockEnd,
  localTimeToIso,
  toTimeInputValue,
} from "./timeSessionUtils";

export type TimeSessionApplyPayload = {
  time_start_now?: boolean;
  time_end_now?: boolean;
  time_session_start?: string;
  time_session_end?: string;
  clear_time_session?: boolean;
};

type Props = {
  order: PosOrder;
  hourlyRate: string | null;
  busy: boolean;
  onApply: (patch: TimeSessionApplyPayload) => void;
  onCancelOrder: () => void;
};

function ClockPicker({
  value,
  disabled,
  onPick,
  ariaLabel,
}: {
  value: string;
  disabled: boolean;
  onPick: (time: string) => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <label className="pp-time-clock-picker" title="Set time manually">
      <span className="pp-time-clock-picker__icon" aria-hidden>🕐</span>
      <input
        ref={inputRef}
        type="time"
        className="pp-time-clock-picker__input"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onPick(e.target.value)}
      />
    </label>
  );
}

export function PosTimeSessionEditor({ order, hourlyRate, busy, onApply, onCancelOrder }: Props) {
  const timeCharge = parseFloat(order.time_charge ?? "0") || 0;
  const startSet = order.time_session_start != null;

  const onPickStart = (time: string) => {
    const iso = localTimeToIso(time, null);
    if (iso) onApply({ time_session_start: iso });
  };

  const onPickEnd = (time: string) => {
    if (!order.time_session_start) {
      window.alert("Tap Start first, then set end time.");
      return;
    }
    const iso = localTimeToIso(time, order.time_session_start);
    if (iso) onApply({ time_session_end: iso });
  };

  return (
    <section className="pp-time-editor card pp-time-editor--simple">
      <div className="pp-time-editor__head">
        <div>
          <h2 className="pp-time-editor__title">Table time</h2>
          {hourlyRate && <p className="muted">₹{hourlyRate} / hour</p>}
        </div>
        {timeCharge > 0 && <span className="pp-time-editor__charge">{fmt(timeCharge)}</span>}
      </div>

      <div className="pp-time-simple">
        <div className="pp-time-simple-row">
          <span className="pp-time-simple-row__label">Start</span>
          <button
            type="button"
            className="pp-time-simple-row__btn"
            disabled={busy}
            onClick={() => onApply({ time_start_now: true })}
          >
            {formatSessionClock(order.time_session_start)}
          </button>
          <ClockPicker
            value={toTimeInputValue(order.time_session_start)}
            disabled={busy}
            ariaLabel="Set start time"
            onPick={onPickStart}
          />
        </div>

        <div className="pp-time-simple-row">
          <span className="pp-time-simple-row__label">End</span>
          <button
            type="button"
            className="pp-time-simple-row__btn"
            disabled={busy || !startSet}
            onClick={() => onApply({ time_end_now: true })}
          >
            {formatSessionClockEnd(order.time_session_end)}
          </button>
          <ClockPicker
            value={toTimeInputValue(order.time_session_end)}
            disabled={busy || !startSet}
            ariaLabel="Set end time"
            onPick={onPickEnd}
          />
        </div>
      </div>

      <p className="muted pp-time-simple-hint">
        Tap <strong>Start</strong> when the customer begins, <strong>End</strong> when they leave. Use 🕐 to type a time instead.
      </p>

      <div className="pp-time-editor__actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => onApply({ clear_time_session: true })}
        >
          Clear time
        </button>
        <button
          type="button"
          className="btn btn-secondary pp-time-editor__cancel-order"
          disabled={busy}
          onClick={onCancelOrder}
        >
          Cancel order
        </button>
      </div>
    </section>
  );
}
