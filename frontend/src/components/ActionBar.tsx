import { FormEvent, useRef, useState } from "react";

import { createGoal, createTransaction, createUser, generateInsights, uploadTransactions } from "../api/assistant";

export type ModalMode = "profile" | "income" | "expense" | "goal" | "upload" | null;

type AppScreen = "overview" | "goals" | "transactions" | "categories" | "insights" | "assistant";

type ActionBarProps = {
  activeScreen: AppScreen;
  modalMode: ModalMode;
  onModalModeChange: (mode: ModalMode) => void;
  userId: string;
  onUserChange: (userId: string) => void;
  onRefresh: (userId?: string) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

export function ActionBar({
  activeScreen,
  modalMode,
  onModalModeChange,
  userId,
  onUserChange,
  onRefresh,
}: ActionBarProps) {
  const [status, setStatus] = useState("Ready");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshInsights() {
    await run("Refreshing…", async () => {
      await generateInsights(userId);
      await onRefresh(userId);
      setStatus("Insights refreshed");
    });
  }

  async function run(pending: string, action: () => Promise<void>) {
    try {
      setIsSubmitting(true);
      setStatus(pending);
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttons = getScreenButtons(activeScreen);

  return (
    <>
      <section className="action-strip">
        <div className="action-buttons">
          {buttons.includes("income") && (
            <button onClick={() => onModalModeChange("income")} type="button">+ Income</button>
          )}
          {buttons.includes("expense") && (
            <button onClick={() => onModalModeChange("expense")} type="button">+ Expense</button>
          )}
          {buttons.includes("upload") && (
            <button className="secondary-button" onClick={() => onModalModeChange("upload")} type="button">
              Upload Statement
            </button>
          )}
          {buttons.includes("goal") && (
            <button onClick={() => onModalModeChange("goal")} type="button">+ Goal</button>
          )}
          {buttons.includes("refresh") && (
            <button className="secondary-button" disabled={isSubmitting} onClick={refreshInsights} type="button">
              Refresh Insights
            </button>
          )}
        </div>
        {status !== "Ready" && <small className="action-status">{status}</small>}
      </section>

      {modalMode ? (
        <ActionModal
          isSubmitting={isSubmitting}
          mode={modalMode}
          onClose={() => onModalModeChange(null)}
          onRefresh={onRefresh}
          onRun={run}
          onUserChange={onUserChange}
          setStatus={setStatus}
          status={status}
          userId={userId}
        />
      ) : null}
    </>
  );
}

function getScreenButtons(screen: AppScreen): string[] {
  if (screen === "overview")     return ["income", "expense", "refresh"];
  if (screen === "goals")        return ["goal", "refresh"];
  if (screen === "transactions") return ["income", "expense", "upload"];
  if (screen === "insights")     return ["refresh"];
  return [];
}

type ActionModalProps = {
  mode: Exclude<ModalMode, null>;
  userId: string;
  isSubmitting: boolean;
  onClose: () => void;
  onRefresh: (userId?: string) => Promise<void>;
  onRun: (pending: string, action: () => Promise<void>) => Promise<void>;
  onUserChange: (userId: string) => void;
  setStatus: (status: string) => void;
  status: string;
};

function ActionModal({
  mode,
  userId,
  isSubmitting,
  onClose,
  onRefresh,
  onRun,
  onUserChange,
  setStatus,
  status,
}: ActionModalProps) {
  const [name, setName] = useState("New User");
  const [email, setEmail] = useState(`user-${Date.now()}@financial-assistant.local`);
  const [amount, setAmount] = useState(mode === "income" ? "75000" : "2500");
  const [description, setDescription] = useState(mode === "income" ? "Monthly salary" : "Food delivery");
  const [transactionDate, setTransactionDate] = useState(today);
  const [goalName, setGoalName] = useState("Emergency Fund");
  const [targetAmount, setTargetAmount] = useState("150000");
  const [currentAmount, setCurrentAmount] = useState("10000");
  const [deadline, setDeadline] = useState("2026-12-31");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    await onRun("Creating profile…", async () => {
      const user = await createUser({ name, email });
      onUserChange(user.id);
      await onRefresh(user.id);
      setStatus(`Created ${user.email}`);
      onClose();
    });
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    await saveTransaction(true);
  }

  async function saveTransaction(closeAfterSave: boolean) {
    await onRun(`Adding ${mode}…`, async () => {
      await createTransaction({
        user_id: userId,
        amount: Number(amount),
        type: mode === "income" ? "income" : "expense",
        description,
        transaction_date: transactionDate,
      });
      await generateInsights(userId);
      await onRefresh(userId);
      setStatus(`Added ${mode}`);
      if (closeAfterSave) {
        onClose();
      } else {
        setAmount(mode === "income" ? "75000" : "");
        setDescription("");
        setTransactionDate(today);
      }
    });
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    await onRun("Adding goal…", async () => {
      await createGoal({
        user_id: userId,
        name: goalName,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount),
        deadline: deadline || null,
      });
      await generateInsights(userId);
      await onRefresh(userId);
      setStatus("Goal added");
      onClose();
    });
  }

  async function submitUpload(event: FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    await onRun("Uploading…", async () => {
      const result = await uploadTransactions(userId, file);
      await generateInsights(userId);
      await onRefresh(userId);
      setStatus(`Imported ${result.inserted} transactions`);
      onClose();
    });
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <section aria-modal="true" className="drawer-panel" role="dialog">
        <div className="modal-header">
          <div>
            <span>{modalEyebrow(mode)}</span>
            <h2>{modalTitle(mode)}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="drawer-status">{status}</p>

        {mode === "profile" ? (
          <form className="modal-form" onSubmit={submitProfile}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
            </label>
            <button disabled={isSubmitting} type="submit">Create Profile</button>
          </form>
        ) : null}

        {mode === "income" || mode === "expense" ? (
          <form className="modal-form" onSubmit={submitTransaction}>
            <p className="drawer-hint">
              Use "Save &amp; add another" to enter multiple rows without closing this drawer.
            </p>
            <label>
              Amount
              <input min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required type="number" />
            </label>
            <label>
              Date
              <input value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required type="date" />
            </label>
            <label>
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>
            <button disabled={isSubmitting || !userId} type="submit">
              Add {mode === "income" ? "Income" : "Expense"}
            </button>
            <button
              className="secondary-button"
              disabled={isSubmitting || !userId}
              onClick={() => void saveTransaction(false)}
              type="button"
            >
              Save &amp; Add Another
            </button>
          </form>
        ) : null}

        {mode === "goal" ? (
          <form className="modal-form" onSubmit={submitGoal}>
            <label>
              Goal Name
              <input value={goalName} onChange={(e) => setGoalName(e.target.value)} required />
            </label>
            <div className="form-grid">
              <label>
                Target Amount
                <input min="1" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required type="number" />
              </label>
              <label>
                Already Saved
                <input min="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} required type="number" />
              </label>
            </div>
            <label>
              Deadline (optional)
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" />
            </label>
            <button disabled={isSubmitting || !userId} type="submit">Add Goal</button>
          </form>
        ) : null}

        {mode === "upload" ? (
          <form className="modal-form" onSubmit={submitUpload}>
            <p className="drawer-hint">
              Upload an HDFC bank statement (.xlsx). Transactions are auto-categorised and inter-account transfers are excluded from your income &amp; expense totals.
            </p>
            <label>
              Statement file (.xlsx)
              <input ref={fileInputRef} accept=".xlsx" required type="file" />
            </label>
            <button disabled={isSubmitting || !userId} type="submit">Import Transactions</button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function modalEyebrow(mode: Exclude<ModalMode, null>) {
  if (mode === "profile") return "Profile";
  if (mode === "goal") return "Goal Planning";
  if (mode === "upload") return "Bank Statement";
  return "Transaction";
}

function modalTitle(mode: Exclude<ModalMode, null>) {
  if (mode === "profile") return "Create a new financial profile";
  if (mode === "income") return "Add income";
  if (mode === "expense") return "Add expense";
  if (mode === "upload") return "Import from HDFC statement";
  return "Create a goal";
}
