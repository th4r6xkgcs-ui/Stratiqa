export function StatMeter({ label, value, detail, tone = "green" }: { label: string; value: string; detail?: string; tone?: "green" | "purple" | "blue" | "orange" }) {
  return (
    <div className={`stat-meter stat-meter--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
