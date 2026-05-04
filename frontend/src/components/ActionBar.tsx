import { FormEvent, useState } from "react";

import { createGoal, createTransaction, createUser, generateInsights } from "../api/assistant";

type ActionBarProps = {
  userId: string;
  onUserChange: (userId: string) => void;
  onRefresh: (userId?: string) => Promise<void>;
};

type ModalMode = "profile" | "income" | "expense" | "goal" | null;

const today = new Date().toISOString().slice(0, 10);

export function ActionBar({ userId, onUserChange, onRefresh }: ActionBarProps) {
  const [mode, setMode] = useState<ModalMode>(null);
  const [status, setStatus] = useState("Ready");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshInsights() {
    await run("Refreshing insights...", async () => {
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

  return (
    <>
      <section className="action-strip">
        <div className="action-buttons">
          <button className="secondary-button" onClick={() => setMode("profile")} type="button">
            New Profile
          </button>
          <button onClick={() => setMode("income")} type="button">
            + Income
          </button>
          <button onClick={() => setMode("expense")} type="button">
            + Expense
          </button>
          <button onClick={() => setMode("goal")} type="button">
            + Goal
          </button>
          <button className="secondary-button" disabled={isSubmitting} onClick={refreshInsights} type="button">
            Refresh Insights
          </button>
        </div>
        <small>{status}</small>
      </section>

      {mode ? (
        <ActionModal
          isSubmitting={isSubmitting}
          mode={mode}
          onClose={() => setMode(null)}
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

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    await onRun("Creating profile...", async () => {
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
    await onRun(`Adding ${mode}...`, async () => {
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
    await onRun("Adding goal...", async () => {
      await createGoal({
        user_id: userId,
        name: goalName,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount),
        deadline: deadline || null,
      });
      await generateInsights(userId);
      await onRefresh(userId);
      setStatus("Added goal");
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
            x
          </button>
        </div>
        <p className="drawer-status">{status}</p>

        {mode === "profile" ? (
          <form className="modal-form" onSubmit={submitProfile}>
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" />
            </label>
            <button disabled={isSubmitting} type="submit">Create Profile</button>
          </form>
        ) : null}

        {mode === "income" || mode === "expense" ? (
          <form className="modal-form" onSubmit={submitTransaction}>
            <p className="drawer-hint">
              Use save and add another to enter multiple {mode === "income" ? "income" : "expense"} rows without closing this drawer.
            </p>
            <label>
              Amount
              <input min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required type="number" />
            </label>
            <label>
              Date
              <input value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required type="date" />
            </label>
            <label>
              Description
              <input value={description} onChange={(event) => setDescription(event.target.value)} required />
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
              Save And Add Another
            </button>
          </form>
        ) : null}

        {mode === "goal" ? (
          <form className="modal-form" onSubmit={submitGoal}>
            <label>
              Goal
              <input value={goalName} onChange={(event) => setGoalName(event.target.value)} required />
            </label>
            <div className="form-grid">
              <label>
                Target
                <input min="1" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} required type="number" />
              </label>
              <label>
                Saved
                <input min="0" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} required type="number" />
              </label>
            </div>
            <label>
              Deadline
              <input value={deadline} onChange={(event) => setDeadline(event.target.value)} type="date" />
            </label>
            <button disabled={isSubmitting || !userId} type="submit">Add Goal</button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function modalEyebrow(mode: Exclude<ModalMode, null>) {
  if (mode === "profile") return "Profile";
  if (mode === "goal") return "Goal Planning";
  return "Transaction";
}

function modalTitle(mode: Exclude<ModalMode, null>) {
  if (mode === "profile") return "Create a new financial profile";
  if (mode === "income") return "Add income";
  if (mode === "expense") return "Add expense";
  return "Create a goal";
}
