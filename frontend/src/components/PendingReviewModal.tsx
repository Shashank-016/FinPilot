import { useState } from "react";
import type { Category, Transaction } from "../types/assistant";
import { formatCurrency } from "../utils/format";

type Props = {
  transactions: Transaction[];
  categories: Category[];
  onSave: (assignments: Record<string, string | null>) => void;
  onDismiss: () => void;
};

function formatTransactionDateTime(transaction_date: string, transaction_time: string | null): string {
  if (!transaction_time) return transaction_date;
  try {
    const [h, m] = transaction_time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${transaction_date} at ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return transaction_date;
  }
}

function cleanDescription(description: string | null): { merchant: string; raw: string } {
  const raw = description || "HDFC Transaction";
  // Strip common HDFC prefixes like "UPI-", "POS ", "NFS " to surface the merchant
  const merchant = raw
    .replace(/^(UPI[-\s]|POS\s+\d+\s*|NFS\s+|NEFT[-\s]|IMPS[-\s]|ATM\s+WDL\s*)/i, "")
    .split(/[@\-]/)[0]
    .trim();
  return { merchant: merchant || raw, raw };
}

export function PendingReviewModal({ transactions, categories, onSave, onDismiss }: Props) {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(transactions.map((t) => [t.id, t.category_id]))
  );

  function handleSave() {
    onSave(assignments);
  }

  return (
    <div className="review-modal-backdrop" onClick={onDismiss}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal__header">
          <div className="review-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <div>
            <h2 className="review-modal__title">New transactions from email</h2>
            <p className="review-modal__subtitle">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} need{transactions.length === 1 ? "s" : ""} a category
            </p>
          </div>
        </div>

        <div className="review-modal__list">
          {transactions.map((t) => {
            const relevant = categories.filter((c) => c.type === t.type);
            const { merchant, raw } = cleanDescription(t.description);
            const when = formatTransactionDateTime(t.transaction_date, t.transaction_time);
            return (
              <div key={t.id} className="review-modal__row">
                <div className="review-modal__row-info">
                  <strong>{merchant}</strong>
                  {merchant !== raw && (
                    <span className="review-modal__raw-desc">{raw}</span>
                  )}
                  <small>{when}</small>
                </div>
                <span className={`transaction-amount transaction-amount--${t.type}`}>
                  {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                </span>
                <select
                  className={`category-select${!assignments[t.id] ? " category-select--unset" : ""}`}
                  value={assignments[t.id] ?? ""}
                  onChange={(e) =>
                    setAssignments((prev) => ({ ...prev, [t.id]: e.target.value || null }))
                  }
                >
                  <option value="">Pick a category…</option>
                  {relevant.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="review-modal__footer">
          <button className="secondary-button" onClick={onDismiss} type="button">
            Remind me later
          </button>
          <button
            className="primary-button"
            onClick={handleSave}
            type="button"
            disabled={transactions.some((t) => !assignments[t.id])}
          >
            Save categories
          </button>
        </div>
      </div>
    </div>
  );
}
