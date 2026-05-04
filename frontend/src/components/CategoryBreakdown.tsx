import type { CategoryBreakdownItem } from "../types/assistant";
import { formatCurrency, formatPercent } from "../utils/format";

type CategoryBreakdownProps = {
  items: CategoryBreakdownItem[];
};

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span>Spending Mix</span>
          <h2>Category Breakdown</h2>
        </div>
      </div>

      <div className="category-list">
        {items.map((item) => (
          <article className="category-row" key={item.category}>
            <div className="category-row__top">
              <strong>{item.category}</strong>
              <span>{formatCurrency(item.total)}</span>
            </div>
            <div className="category-row__bar" aria-label={`${item.category} share`}>
              <div style={{ width: `${Math.min(item.share_percent, 100)}%` }} />
            </div>
            <small>{formatPercent(item.share_percent)} of tracked expenses</small>
          </article>
        ))}
      </div>
    </section>
  );
}
