export function ConfidenceRing({
  value,
  label = "Confidence",
  size = "md",
}: {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      className={`confidence-ring confidence-ring--${size}`}
      style={{ "--confidence": `${clamped * 3.6}deg` } as React.CSSProperties}
      aria-label={`${clamped}% ${label}`}
    >
      <div>
        <strong>{clamped}<small>%</small></strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
