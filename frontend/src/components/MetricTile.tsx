type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "warning";
};

export function MetricTile({ label, value, detail, tone = "neutral" }: MetricTileProps) {
  return (
    <section className={`metric-tile metric-tile--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}
