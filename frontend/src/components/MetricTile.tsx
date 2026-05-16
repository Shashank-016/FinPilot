type IconName = "arrow-up" | "arrow-down" | "wallet" | "trending" | "target" | "list";

type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
  icon?: IconName;
  delta?: { value: string; direction: "up" | "down" | "flat" };
};

export function MetricTile({ label, value, detail, tone = "neutral", icon, delta }: MetricTileProps) {
  const iconTone = tone === "neutral" ? "neutral" : tone;

  return (
    <section className={`metric-tile metric-tile--${tone}`}>
      <div className="metric-tile__top">
        <span className="metric-tile__label">{label}</span>
        {icon && (
          <div className={`metric-tile__icon metric-tile__icon--${iconTone}`}>
            <TileIcon name={icon} />
          </div>
        )}
      </div>
      <strong>{value}</strong>
      <small className="metric-tile__detail">{detail}</small>
      {delta && (
        <div className={`metric-tile__delta metric-tile__delta--${delta.direction}`}>
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"} {delta.value}
        </div>
      )}
    </section>
  );
}

function TileIcon({ name }: { name: IconName }) {
  switch (name) {
    case "arrow-up":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
          <path d="M16 12h6v4h-6a2 2 0 0 1 0-4z" />
        </svg>
      );
    case "trending":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "list":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
  }
}
