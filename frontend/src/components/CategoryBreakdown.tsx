import { useState } from "react";
import type { Budget, BudgetSuggestion, CategoryBreakdownItem } from "../types/assistant";
import { BudgetModal } from "./BudgetModal";
import { formatCurrency, formatPercent } from "../utils/format";

const CAT_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];

type Props = {
  items: CategoryBreakdownItem[];
  budgets: Budget[];
  suggestions: BudgetSuggestion[];
  onSaveBudget: (categoryName: string, limit: number) => Promise<void>;
  onRemoveBudget: (categoryName: string) => Promise<void>;
};

export function CategoryBreakdown({ items, budgets, suggestions, onSaveBudget, onRemoveBudget }: Props) {
  const [activeCategoryModal, setActiveCategoryModal] = useState<string | null>(null);

  if (!items.length) return null;

  const budgetByCategory = new Map(budgets.map((b) => [b.category_name, b]));
  const suggestionByCategory = new Map(suggestions.map((s) => [s.category_name, s]));

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span>Spending Mix</span>
          <h2>Category Breakdown</h2>
        </div>
      </div>

      <div className="category-list">
        {items.map((item, idx) => {
          const color = CAT_COLORS[idx % CAT_COLORS.length];
          const budget = budgetByCategory.get(item.category) ?? null;
          const spentPct = budget ? Math.min((item.total / budget.monthly_limit) * 100, 100) : null;
          const isOver = budget ? item.total > budget.monthly_limit : false;

          const budgetBarColor = spentPct === null
            ? color
            : spentPct >= 100 ? "#ef4444"
            : spentPct >= 80 ? "#f59e0b"
            : "#10b981";

          return (
            <article className="category-row" key={item.category}>
              <div className="category-row__top">
                <div className="category-row__left">
                  <div className="category-dot" style={{ background: color }} />
                  <strong>{item.category}</strong>
                </div>
                <div className="category-row__right">
                  <span>{formatCurrency(item.total)}</span>
                  <button
                    type="button"
                    className="budget-set-btn"
                    onClick={() => setActiveCategoryModal(item.category)}
                    aria-label={budget ? `Edit budget for ${item.category}` : `Set budget for ${item.category}`}
                  >
                    {budget ? "Edit budget" : "Set budget"}
                  </button>
                </div>
              </div>

              {/* Spending share bar */}
              <div className="category-row__bar" aria-label={`${item.category} share`}>
                <div style={{ width: `${Math.min(item.share_percent, 100)}%`, background: color, opacity: 0.8 }} />
              </div>
              <small>{formatPercent(item.share_percent)} of tracked expenses</small>

              {/* Budget progress bar */}
              {budget && spentPct !== null && (
                <div className="budget-progress-row">
                  <div className="budget-progress-track">
                    <div
                      className="budget-progress-fill"
                      style={{ width: `${spentPct}%`, background: budgetBarColor }}
                    />
                  </div>
                  <span className={`budget-progress-label${isOver ? " budget-progress-label--over" : ""}`}>
                    {formatCurrency(item.total)} / {formatCurrency(budget.monthly_limit)}
                    {isOver && <span className="budget-over-badge">Over</span>}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {activeCategoryModal && (
        <BudgetModal
          categoryName={activeCategoryModal}
          existingBudget={budgetByCategory.get(activeCategoryModal) ?? null}
          suggestion={suggestionByCategory.get(activeCategoryModal) ?? null}
          onSave={onSaveBudget}
          onRemove={onRemoveBudget}
          onClose={() => setActiveCategoryModal(null)}
        />
      )}
    </section>
  );
}
