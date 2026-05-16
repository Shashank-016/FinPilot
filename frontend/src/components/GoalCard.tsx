import { useEffect, useState } from "react";

import type { Goal, GoalAffordability } from "../types/assistant";
import { formatCurrency, statusLabel } from "../utils/format";

type GoalCardProps = {
  goal: Goal;
  affordability?: GoalAffordability;
};

export function GoalCard({ goal, affordability }: GoalCardProps) {
  const rawProgress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const status = affordability?.affordability_status ?? "unknown";

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedProgress(rawProgress));
    return () => cancelAnimationFrame(raf);
  }, [rawProgress]);

  const progressClass = getProgressClass(status);
  const shortfall = affordability?.shortfall ?? 0;
  const isShortfall = shortfall > 0;

  const deadlineLabel = getDeadlineLabel(goal.deadline);

  return (
    <article className="goal-card">
      <div className="goal-card__header">
        <div>
          <h3>{goal.name}</h3>
          <p>{formatCurrency(goal.current_amount)} saved of {formatCurrency(goal.target_amount)}</p>
          <div className="goal-card__meta">
            {deadlineLabel && <span className="goal-deadline">📅 {deadlineLabel}</span>}
            {affordability?.months_left != null && affordability.months_left > 0 && (
              <span className="goal-deadline">{affordability.months_left}mo left</span>
            )}
          </div>
        </div>
        <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>
      </div>

      <div className="progress-track" aria-label={`${goal.name} progress`}>
        <div className={`progress-fill ${progressClass}`} style={{ width: `${animatedProgress}%` }} />
      </div>

      <dl className="goal-card__stats">
        <div>
          <dt>Progress</dt>
          <dd>{rawProgress.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Monthly Need</dt>
          <dd>{formatCurrency(affordability?.monthly_required ?? 0)}</dd>
        </div>
        <div className={isShortfall ? "stat--shortfall" : status === "on_track" || status === "achieved" ? "stat--on-track" : ""}>
          <dt>Shortfall</dt>
          <dd>{formatCurrency(shortfall)}</dd>
        </div>
      </dl>
    </article>
  );
}

function getProgressClass(status: string): string {
  if (status === "tight") return "progress-fill--tight";
  if (status === "not_on_track") return "progress-fill--not_on_track";
  if (status === "achieved") return "progress-fill--achieved";
  return "";
}

function getDeadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
