import { useCallback, useEffect, useMemo, useState } from "react";

import { DEMO_USER_ID, getAssistantSnapshot, getUserTransactions } from "./api/assistant";
import { ActionBar } from "./components/ActionBar";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { GoalCard } from "./components/GoalCard";
import { InsightCard } from "./components/InsightCard";
import { MetricTile } from "./components/MetricTile";
import type { AssistantSnapshot, Transaction } from "./types/assistant";
import { formatCurrency, formatPercent, statusLabel } from "./utils/format";

type Screen = "overview" | "goals" | "transactions" | "insights" | "assistant";

const screens: Array<{ id: Screen; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "transactions", label: "Transactions" },
  { id: "insights", label: "Insights" },
  { id: "assistant", label: "Assistant" },
];

function App() {
  const [activeUserId, setActiveUserId] = useState(DEMO_USER_ID);
  const [activeScreen, setActiveScreen] = useState<Screen>("overview");
  const [snapshot, setSnapshot] = useState<AssistantSnapshot | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (userIdOverride?: string) => {
    const userId = userIdOverride ?? activeUserId;
    setIsLoading(true);
    try {
      const [snapshotData, transactionData] = await Promise.all([
        getAssistantSnapshot(userId),
        getUserTransactions(userId),
      ]);
      setSnapshot(snapshotData);
      setTransactions(transactionData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const affordabilityByGoal = useMemo(() => {
    const map = new Map<string, AssistantSnapshot["goal_affordability"][number]>();
    snapshot?.goal_affordability.forEach((item) => map.set(item.goal_id, item));
    return map;
  }, [snapshot]);

  return (
    <div className="product-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <span>FA</span>
          <div>
            <strong>FinPilot</strong>
            <small>Financial assistant</small>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {screens.map((screen) => (
            <button
              className={activeScreen === screen.id ? "active" : ""}
              key={screen.id}
              onClick={() => setActiveScreen(screen.id)}
              type="button"
            >
              {screen.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span>Active user</span>
          <small>{activeUserId}</small>
        </div>
      </aside>

      <main className="workspace-shell">
        <header className="workspace-topbar">
          <div>
            <span>{screenEyebrow(activeScreen)}</span>
            <h1>{screenTitle(activeScreen)}</h1>
          </div>
          <ActionBar userId={activeUserId} onUserChange={setActiveUserId} onRefresh={loadData} />
        </header>

        {error ? <section className="error-banner">{error}</section> : null}

        {isLoading || !snapshot ? (
          <section className="loading-card">Loading financial workspace...</section>
        ) : (
          <ScreenContent
            activeScreen={activeScreen}
            affordabilityByGoal={affordabilityByGoal}
            snapshot={snapshot}
            transactions={transactions}
            userId={activeUserId}
          />
        )}
      </main>
    </div>
  );
}

function ScreenContent({
  activeScreen,
  affordabilityByGoal,
  snapshot,
  transactions,
  userId,
}: {
  activeScreen: Screen;
  affordabilityByGoal: Map<string, AssistantSnapshot["goal_affordability"][number]>;
  snapshot: AssistantSnapshot;
  transactions: Transaction[];
  userId: string;
}) {
  if (activeScreen === "goals") {
    return (
      <section className="screen-stack">
        <div className="screen-summary">
          <MetricTile label="Goals" value={`${snapshot.goals.length}`} detail="Active financial targets" />
          <MetricTile
            label="Monthly Surplus"
            value={formatCurrency(snapshot.cashflow.surplus)}
            detail="Used for affordability checks"
            tone="positive"
          />
        </div>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span>Goal System</span>
              <h2>Progress And Affordability</h2>
            </div>
          </div>
          <div className="goal-list">
            {snapshot.goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} affordability={affordabilityByGoal.get(goal.id)} />
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeScreen === "transactions") {
    return <TransactionsScreen transactions={transactions} />;
  }

  if (activeScreen === "insights") {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <span>AI Guidance</span>
            <h2>Advisor Cards</h2>
          </div>
        </div>
        <div className="insight-board">
          {snapshot.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>
    );
  }

  if (activeScreen === "assistant") {
    return <AssistantScreen snapshot={snapshot} userId={userId} />;
  }

  return <OverviewScreen affordabilityByGoal={affordabilityByGoal} snapshot={snapshot} />;
}

function OverviewScreen({
  affordabilityByGoal,
  snapshot,
}: {
  affordabilityByGoal: Map<string, AssistantSnapshot["goal_affordability"][number]>;
  snapshot: AssistantSnapshot;
}) {
  const { cashflow } = snapshot;

  return (
    <>
      <section className="metric-grid" aria-label="Financial overview">
        <MetricTile label="Income" value={formatCurrency(cashflow.income)} detail="Tracked inflow" />
        <MetricTile label="Expenses" value={formatCurrency(cashflow.expenses)} detail="Tracked outflow" tone="warning" />
        <MetricTile label="Surplus" value={formatCurrency(cashflow.surplus)} detail="Available after expenses" tone="positive" />
        <MetricTile label="Savings Rate" value={formatPercent(cashflow.savings_rate_percent)} detail="Surplus divided by income" />
      </section>

      <section className="dashboard-grid">
        <div className="main-column">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span>Priority Goals</span>
                <h2>Progress And Affordability</h2>
              </div>
            </div>
            <div className="goal-list">
              {snapshot.goals.slice(0, 3).map((goal) => (
                <GoalCard key={goal.id} goal={goal} affordability={affordabilityByGoal.get(goal.id)} />
              ))}
            </div>
          </section>
          <CategoryBreakdown items={cashflow.expense_breakdown} />
        </div>

        <aside className="side-column">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span>AI Guidance</span>
                <h2>Latest Insights</h2>
              </div>
            </div>
            <div className="insight-list">
              {snapshot.insights.slice(0, 4).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function TransactionsScreen({ transactions }: { transactions: Transaction[] }) {
  const income = transactions.filter((item) => item.type === "income");
  const expenses = transactions.filter((item) => item.type === "expense");

  return (
    <section className="screen-stack">
      <div className="screen-summary">
        <MetricTile label="Transactions" value={`${transactions.length}`} detail="Total entries" />
        <MetricTile label="Income Rows" value={`${income.length}`} detail="Tracked income items" tone="positive" />
        <MetricTile label="Expense Rows" value={`${expenses.length}`} detail="Tracked expense items" tone="warning" />
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <span>Ledger</span>
            <h2>Recent Transactions</h2>
          </div>
        </div>
        <div className="transaction-table">
          {transactions.map((transaction) => (
            <article className="transaction-row" key={transaction.id}>
              <div>
                <strong>{transaction.description || "Transaction"}</strong>
                <small>{transaction.transaction_date}</small>
              </div>
              <span className={`ledger-type ledger-type--${transaction.type}`}>{transaction.type}</span>
              <strong>{formatCurrency(transaction.amount)}</strong>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function AssistantScreen({ snapshot, userId }: { snapshot: AssistantSnapshot; userId: string }) {
  return (
    <section className="assistant-layout">
      <section className="panel assistant-panel">
        <div className="section-heading">
          <div>
            <span>Agent Context</span>
            <h2>Financial Snapshot Tool</h2>
          </div>
        </div>
        <p>
          This is the structured packet a future agent will call before answering questions or creating plans.
        </p>
        <dl>
          <div>
            <dt>User id</dt>
            <dd className="mono-value">{userId}</dd>
          </div>
          <div>
            <dt>Goals tracked</dt>
            <dd>{snapshot.goals.length}</dd>
          </div>
          <div>
            <dt>Insights generated</dt>
            <dd>{snapshot.insights.length}</dd>
          </div>
          <div>
            <dt>Latest snapshot</dt>
            <dd>{new Date(snapshot.generated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span>Affordability</span>
            <h2>Goal Feasibility</h2>
          </div>
        </div>
        <div className="affordability-list">
          {snapshot.goal_affordability.map((item) => (
            <article className="affordability-row" key={item.goal_id}>
              <div>
                <strong>{item.goal_name}</strong>
                <small>
                  Needs {formatCurrency(item.monthly_required ?? 0)} monthly from{" "}
                  {formatCurrency(item.monthly_surplus)} surplus
                </small>
              </div>
              <span className={`status-badge status-badge--${item.affordability_status}`}>
                {statusLabel(item.affordability_status)}
              </span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function screenEyebrow(screen: Screen) {
  if (screen === "assistant") return "Agent-ready context";
  if (screen === "transactions") return "Money movement";
  if (screen === "insights") return "Financial intelligence";
  if (screen === "goals") return "Planning";
  return "Snapshot";
}

function screenTitle(screen: Screen) {
  if (screen === "assistant") return "Assistant Workspace";
  if (screen === "transactions") return "Transactions";
  if (screen === "insights") return "Insights";
  if (screen === "goals") return "Goals";
  return "Overview";
}

export default App;
