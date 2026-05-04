import type { Insight } from "../types/assistant";

type InsightCardProps = {
  insight: Insight;
};

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className={`insight-card insight-card--${insight.severity}`}>
      <div>
        <span>{insight.type.replaceAll("_", " ")}</span>
        <h3>{insight.title}</h3>
      </div>
      <p>{insight.message}</p>
    </article>
  );
}
