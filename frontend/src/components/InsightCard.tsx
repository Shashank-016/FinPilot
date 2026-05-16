import type { Insight } from "../types/assistant";

type InsightCardProps = {
  insight: Insight;
  compact?: boolean;
};

export function InsightCard({ insight, compact = false }: InsightCardProps) {
  const sev = insight.severity as "info" | "success" | "warning" | "critical";

  if (compact) {
    return (
      <article className={`insight-card insight-card--${sev}`} style={{ padding: "12px 14px" }}>
        <div className="insight-card__header">
          <span className={`insight-type-pill insight-type-pill--${sev}`}>
            {insight.type.replaceAll("_", " ")}
          </span>
          <div className={`insight-severity-icon insight-severity-icon--${sev}`}>
            {severitySymbol(sev)}
          </div>
        </div>
        <h3 style={{ fontSize: "0.82rem", marginBottom: "4px" }}>{insight.title}</h3>
        <p style={{ fontSize: "0.78rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {insight.message}
        </p>
      </article>
    );
  }

  return (
    <article className={`insight-card insight-card--${sev}`}>
      <div className="insight-card__header">
        <div>
          <span className={`insight-type-pill insight-type-pill--${sev}`}>
            {insight.type.replaceAll("_", " ")}
          </span>
        </div>
        <div className={`insight-severity-icon insight-severity-icon--${sev}`}>
          {severitySymbol(sev)}
        </div>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.message}</p>
    </article>
  );
}

function severitySymbol(sev: string): string {
  if (sev === "success") return "✓";
  if (sev === "warning") return "⚠";
  if (sev === "critical") return "!";
  return "i";
}
