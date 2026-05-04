import type { Goal, GoalAffordability } from "../types/assistant";
import { formatCurrency, statusLabel } from "../utils/format";

type GoalCardProps = {
  goal: Goal;
  affordability?: GoalAffordability;
};

export function GoalCard({ goal, affordability }: GoalCardProps) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const status = affordability?.affordability_status ?? "unknown";

  return (
    <article className="goal-card">
      <div className="goal-card__header">
        <div>
          <h3>{goal.name}</h3>
          <p>
            {formatCurrency(goal.current_amount)} saved of {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>
      </div>

      <div className="progress-track" aria-label={`${goal.name} progress`}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <dl className="goal-card__stats">
        <div>
          <dt>Progress</dt>
          <dd>{progress.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Monthly Need</dt>
          <dd>{formatCurrency(affordability?.monthly_required ?? 0)}</dd>
        </div>
        <div>
          <dt>Shortfall</dt>
          <dd>{formatCurrency(affordability?.shortfall ?? 0)}</dd>
        </div>
      </dl>
    </article>
  );
}
