import { useEffect, useRef, useState } from "react";
import type { PosOrder } from "../../../types/owner";
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
  time_billing_excluded?: boolean;
};

type Props = {
  order: PosOrder;
  busy: boolean;
  canManageTimeBilling: boolean;
  onApply: (patch: TimeSessionApplyPayload) => void;
};

function ClockPicker({
  value,
  disabled,
  isOpen,
  onOpenChange,
  onPick,
  ariaLabel,
}: {
  value: string;
  disabled: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (time: string) => void;
  ariaLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [isOpen, onOpenChange]);

  const toggle = () => {
    if (disabled) return;
    onOpenChange(!isOpen);
  };

  return (
    <div ref={rootRef} className={`pp-time-clock-picker ${isOpen ? "pp-time-clock-picker--open" : ""}`}>
      <button
        type="button"
        className={`pp-time-clock-picker__trigger ${isOpen ? "pp-time-clock-picker__trigger--on" : ""}`}
        disabled={disabled}
        title={isOpen ? "Close time picker" : "Set time"}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
      >
        <span className="pp-time-clock-picker__icon" aria-hidden>🕐</span>
      </button>
      {isOpen && (
        <div className="pp-time-clock-picker__popover" role="dialog" aria-label={ariaLabel}>
          <input
            type="time"
            className="pp-time-clock-picker__time-input"
            value={draft}
            disabled={disabled}
            autoFocus
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              if (next) onPick(next);
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export function PosTimeSessionEditor({
  order,
  busy,
  canManageTimeBilling,
  onApply,
}: Props) {
  const [openClock, setOpenClock] = useState<"start" | "end" | null>(null);
  const startSet = order.time_session_start != null;

  const onPickStart = (time: string) => {
    const iso = localTimeToIso(time, null);
    if (!iso) return;
    if (order.time_session_end) {
      onApply({ time_session_start: iso, time_session_end: order.time_session_end });
    } else {
      onApply({ time_session_start: iso });
    }
  };

  const onPickEnd = (time: string) => {
    if (!order.time_session_start) return;
    const iso = localTimeToIso(time, order.time_session_start);
    if (iso) onApply({ time_session_end: iso });
  };

  const setOpen = (which: "start" | "end" | null) => setOpenClock(which);

  if (order.time_billing_excluded) {
    if (!canManageTimeBilling) return null;
    return (
      <section className="pp-time-editor pp-time-editor--minimal" aria-label="Table time">
        <p className="pp-time-editor__excluded-note">Food items only — table time not charged on this bill.</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => onApply({ time_billing_excluded: false })}
        >
          Charge table time on this bill
        </button>
      </section>
    );
  }

  return (
    <section className="pp-time-editor pp-time-editor--minimal" aria-label="Table time">
      <div className="pp-time-simple">
        <div className="pp-time-simple-row">
          <span className="pp-time-simple-row__label">Time start</span>
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
            isOpen={openClock === "start"}
            onOpenChange={(open) => setOpen(open ? "start" : null)}
            ariaLabel="Set start time"
            onPick={onPickStart}
          />
        </div>

        <div className="pp-time-simple-row">
          <span className="pp-time-simple-row__label">Time end</span>
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
            isOpen={openClock === "end"}
            onOpenChange={(open) => setOpen(open ? "end" : null)}
            ariaLabel="Set end time"
            onPick={onPickEnd}
          />
        </div>
      </div>

      <div className="pp-time-editor__actions pp-time-editor__actions--minimal">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => onApply({ clear_time_session: true })}
        >
          Clear time
        </button>
      </div>

      {canManageTimeBilling && (
        <button
          type="button"
          className="pp-time-editor__food-only"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                "Skip table time for this bill? Only food and menu items will be charged.",
              )
            ) {
              return;
            }
            onApply({ time_billing_excluded: true });
          }}
        >
          Bill food only (no table time)
        </button>
      )}
    </section>
  );
}
