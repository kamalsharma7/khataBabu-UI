type Props = {
  pct: number;
  tone?: "default" | "weekend";
};

export function InvQuantityBar({ pct, tone = "default" }: Props) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className="inv-analytics-bar" aria-hidden>
      <div
        className={`inv-analytics-bar__fill inv-analytics-bar__fill--${tone}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
