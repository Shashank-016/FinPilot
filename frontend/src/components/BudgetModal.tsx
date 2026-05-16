import { useEffect, useRef, useState } from "react";
import type { Budget, BudgetSuggestion } from "../types/assistant";
import { formatCurrency } from "../utils/format";

type Props = {
  categoryName: string;
  existingBudget: Budget | null;
  suggestion: BudgetSuggestion | null;
  onSave: (categoryName: string, limit: number) => Promise<void>;
  onRemove: (categoryName: string) => Promise<void>;
  onClose: () => void;
};

export function BudgetModal({ categoryName, existingBudget, suggestion, onSave, onRemove, onClose }: Props) {
  const [value, setValue] = useState(
    existingBudget ? String(existingBudget.monthly_limit) : (suggestion ? String(suggestion.suggested_limit) : "")
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function handleSave() {
    const limit = parseFloat(value);
    if (!limit || limit <= 0) return;
    setSaving(true);
    try {
      await onSave(categoryName, limit);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove(categoryName);
      onClose();
    } finally {
      setRemoving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") onClose();
  }

  const parsedValue = parseFloat(value);
  const isValid = !isNaN(parsedValue) && parsedValue > 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Set budget">
      <div className="modal-box budget-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Set Monthly Budget</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="budget-modal__category">{categoryName}</p>

        {suggestion && (
          <div className="budget-suggestion-hint">
            <span>Suggested: {formatCurrency(suggestion.suggested_limit)}</span>
            <small>avg over {suggestion.based_on_months} month{suggestion.based_on_months !== 1 ? "s" : ""}</small>
            {value !== String(suggestion.suggested_limit) && (
              <button
                type="button"
                className="budget-use-suggestion"
                onClick={() => setValue(String(suggestion.suggested_limit))}
              >
                Use this
              </button>
            )}
          </div>
        )}

        <div className="budget-modal__input-row">
          <span className="budget-rupee">₹</span>
          <input
            ref={inputRef}
            type="number"
            min="1"
            step="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 5000"
            className="budget-amount-input"
          />
        </div>

        <div className="budget-modal__actions">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isValid || saving}
            className="primary-button"
          >
            {saving ? "Saving…" : existingBudget ? "Update Budget" : "Set Budget"}
          </button>
          {existingBudget && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={removing}
              className="danger-button"
            >
              {removing ? "Removing…" : "Remove Budget"}
            </button>
          )}
          <button type="button" onClick={onClose} className="secondary-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
