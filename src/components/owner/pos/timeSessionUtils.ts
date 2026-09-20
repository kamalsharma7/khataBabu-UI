export function formatSessionClock(iso: string | null): string {
  if (!iso) return "Tap to start";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatSessionClockEnd(iso: string | null): string {
  if (!iso) return "Tap when done";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function toTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Build ISO timestamp for today (or anchor day) at HH:MM local. */
export function localTimeToIso(timeHHMM: string, anchorIso: string | null): string | null {
  if (!timeHHMM.trim()) return null;
  const [h, m] = timeHHMM.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const base = anchorIso ? new Date(anchorIso) : new Date();
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
