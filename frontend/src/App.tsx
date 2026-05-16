import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import { setAuthToken, getAssistantSnapshot, getUserTransactions, getCategories, getPendingReview, updateTransactionCategory, deleteTransaction, bulkDeleteTransactions, streamChat, getUserBudgets, getBudgetSuggestions, upsertBudget, deleteBudget } from "./api/assistant";
import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { ActionBar, type ModalMode } from "./components/ActionBar";
import { ChatPanel } from "./components/ChatPanel";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { GoalCard } from "./components/GoalCard";
import { InsightCard } from "./components/InsightCard";
import { MetricTile } from "./components/MetricTile";
import type { AssistantSnapshot, Budget, BudgetSuggestion, Category, ChatMessage, Transaction } from "./types/assistant";
import {
  formatCurrency,
  formatPercent,
  statusLabel,
  groupTransactionsByDate,
  getCategoryEmoji,
  aggregateByMonth,
} from "./utils/format";
import { PendingReviewModal } from "./components/PendingReviewModal";
import { SpendingTrendChart } from "./components/SpendingTrendChart";

type AppScreen = "overview" | "goals" | "transactions" | "categories" | "insights" | "assistant";

const screens: Array<{ id: AppScreen; label: string; icon: ReactElement }> = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "goals",
    label: "Goals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4 4 4" />
        <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
      </svg>
    ),
  },
  {
    id: "categories",
    label: "Categories",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: "insights",
    label: "Insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21h6" />
        <path d="M12 3a6 6 0 0 1 6 6c0 3-1.5 5-3 6.5V17H9v-1.5C7.5 14 6 12 6 9a6 6 0 0 1 6-6z" />
      </svg>
    ),
  },
  {
    id: "assistant",
    label: "Assistant",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <circle cx="12" cy="5" r="1" />
        <path d="M9 17v-3h6v3" />
      </svg>
    ),
  },
];

function App() {
  const { user, token, isLoading: authLoading, logout } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  if (authLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return <Dashboard user={user} onLogout={logout} />;
}

function Dashboard({
  user,
  onLogout,
}: {
  user: { id: string; name: string; email: string; avatar_url?: string | null };
  onLogout: () => void;
}) {
  const [activeAppScreen, setActiveAppScreen] = useState<AppScreen>("overview");
  const [snapshot, setSnapshot] = useState<AssistantSnapshot | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetSuggestions, setBudgetSuggestions] = useState<BudgetSuggestion[]>([]);
  const [pendingReview, setPendingReview] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const loadData = useCallback(async (userIdOverride?: string) => {
    const userId = userIdOverride ?? user.id;
    setIsLoading(true);
    try {
      const [snapshotData, transactionData, categoryData, budgetData, suggestionData] = await Promise.all([
        getAssistantSnapshot(userId),
        getUserTransactions(userId),
        getCategories(),
        getUserBudgets(userId),
        getBudgetSuggestions(userId),
      ]);
      setSnapshot(snapshotData);
      setTransactions(transactionData);
      setCategories(categoryData);
      setBudgets(budgetData);
      setBudgetSuggestions(suggestionData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const check = async () => {
      try {
        const pending = await getPendingReview(user.id);
        if (pending.length > 0) setPendingReview(pending);
      } catch { /* silently ignore polling errors */ }
    };
    const id = setInterval(() => { void check(); }, 30_000);
    return () => clearInterval(id);
  }, [user.id]);

  const onDeleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id);
    } catch {
      void loadData();
    }
  }, [loadData]);

  const onBulkDelete = useCallback(async (ids: string[]) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    try {
      await bulkDeleteTransactions(ids);
    } catch {
      void loadData();
    }
  }, [loadData]);

  const onUpdateCategory = useCallback(async (transactionId: string, categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    setTransactions((prev) => prev.map((t) =>
      t.id === transactionId ? { ...t, category_id: categoryId, category_name: category?.name ?? null } : t
    ));
    try {
      const updated = await updateTransactionCategory(transactionId, categoryId);
      setTransactions((prev) => prev.map((t) => t.id === transactionId ? updated : t));
    } catch {
      void loadData();
    }
  }, [categories, loadData]);

  async function onSavePendingReview(assignments: Record<string, string | null>) {
    await Promise.all(
      Object.entries(assignments).map(([txId, catId]) =>
        updateTransactionCategory(txId, catId)
      )
    );
    setPendingReview([]);
    void loadData();
  }

  const onSaveBudget = useCallback(async (categoryName: string, limit: number) => {
    const updated = await upsertBudget(user.id, categoryName, limit);
    setBudgets((prev) => {
      const without = prev.filter((b) => b.category_name !== categoryName);
      return [...without, updated];
    });
  }, [user.id]);

  const onRemoveBudget = useCallback(async (categoryName: string) => {
    await deleteBudget(user.id, categoryName);
    setBudgets((prev) => prev.filter((b) => b.category_name !== categoryName));
  }, [user.id]);

  const affordabilityByGoal = useMemo(() => {
    const map = new Map<string, AssistantSnapshot["goal_affordability"][number]>();
    snapshot?.goal_affordability.forEach((item) => map.set(item.goal_id, item));
    return map;
  }, [snapshot]);

  const avatarInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="product-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <span>FP</span>
          <strong>FinPilot</strong>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {screens.map((screen) => (
            <button
              className={activeAppScreen === screen.id ? "active" : ""}
              key={screen.id}
              onClick={() => setActiveAppScreen(screen.id)}
              type="button"
            >
              {screen.icon}
              {screen.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{avatarInitial}</div>
            <span className="sidebar-user-name">{user.name}</span>
          </div>
          <button className="secondary-button sidebar-logout" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>
      </aside>

      <main className="workspace-shell">
        <header className="workspace-topbar">
          <div>
            <span className="eyebrow">{screenEyebrow(activeAppScreen)}</span>
            <h1>{screenTitle(activeAppScreen)}</h1>
          </div>
          <ActionBar
            activeScreen={activeAppScreen}
            modalMode={modalMode}
            onModalModeChange={setModalMode}
            userId={user.id}
            onUserChange={() => {}}
            onRefresh={loadData}
          />
        </header>

        {error ? <section className="error-banner">{error}</section> : null}

        {isLoading || !snapshot ? (
          <LoadingSkeleton />
        ) : (
          <div key={activeAppScreen} className="screen-enter">
            <AppScreenContent
              activeAppScreen={activeAppScreen}
              affordabilityByGoal={affordabilityByGoal}
              onOpenGoal={() => setModalMode("goal")}
              onDeleteTransaction={onDeleteTransaction}
              onBulkDelete={onBulkDelete}
              onUpdateCategory={onUpdateCategory}
              onSaveBudget={onSaveBudget}
              onRemoveBudget={onRemoveBudget}
              snapshot={snapshot}
              transactions={transactions}
              categories={categories}
              budgets={budgets}
              budgetSuggestions={budgetSuggestions}
              userId={user.id}
              monthlyTotals={aggregateByMonth(transactions)}
            />
          </div>
        )}
      </main>

      {pendingReview.length > 0 && (
        <PendingReviewModal
          transactions={pendingReview}
          categories={categories}
          onSave={onSavePendingReview}
          onDismiss={() => setPendingReview([])}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-wrapper">
      <div className="loading-metric-row">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-metric" />
        ))}
      </div>
      <div className="loading-panel-row">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}

function AppScreenContent({
  activeAppScreen,
  affordabilityByGoal,
  onOpenGoal,
  onDeleteTransaction,
  onBulkDelete,
  onUpdateCategory,
  onSaveBudget,
  onRemoveBudget,
  snapshot,
  transactions,
  categories,
  budgets,
  budgetSuggestions,
  userId,
  monthlyTotals,
}: {
  activeAppScreen: AppScreen;
  affordabilityByGoal: Map<string, AssistantSnapshot["goal_affordability"][number]>;
  onOpenGoal: () => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onUpdateCategory: (transactionId: string, categoryId: string | null) => void;
  onSaveBudget: (categoryName: string, limit: number) => Promise<void>;
  onRemoveBudget: (categoryName: string) => Promise<void>;
  snapshot: AssistantSnapshot;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  budgetSuggestions: BudgetSuggestion[];
  userId: string;
  monthlyTotals: ReturnType<typeof aggregateByMonth>;
}) {
  if (activeAppScreen === "goals") {
    return (
      <section className="screen-stack">
        <div className="screen-summary">
          <MetricTile
            label="Goals"
            value={`${snapshot.goals.length}`}
            detail="Active financial targets"
            icon="target"
          />
          <MetricTile
            label="Monthly Surplus"
            value={formatCurrency(snapshot.cashflow.surplus)}
            detail="Used for affordability checks"
            tone="positive"
            icon="wallet"
          />
        </div>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span>Goal System</span>
              <h2>Progress &amp; Affordability</h2>
            </div>
          </div>
          {snapshot.goals.length === 0 ? (
            <div className="empty-state-rich">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3>No goals yet</h3>
              <p>Set your first financial target and we'll tell you exactly if you can afford it based on your monthly surplus.</p>
              <button onClick={onOpenGoal} type="button">Set your first goal</button>
            </div>
          ) : (
            <div className="goal-list">
              {snapshot.goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} affordability={affordabilityByGoal.get(goal.id)} />
              ))}
            </div>
          )}
        </section>
      </section>
    );
  }

  if (activeAppScreen === "transactions") {
    return <TransactionsAppScreen transactions={transactions} onDelete={onDeleteTransaction} onBulkDelete={onBulkDelete} />;
  }

  if (activeAppScreen === "categories") {
    return <CategoriesAppScreen transactions={transactions} categories={categories} onUpdateCategory={onUpdateCategory} />;
  }

  if (activeAppScreen === "insights") {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <span>AI Guidance</span>
            <h2>Advisor Cards</h2>
          </div>
        </div>
        {snapshot.insights.length === 0 ? (
          <div className="empty-state-rich">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21h6" />
                <path d="M12 3a6 6 0 0 1 6 6c0 3-1.5 5-3 6.5V17H9v-1.5C7.5 14 6 12 6 9a6 6 0 0 1 6-6z" />
              </svg>
            </div>
            <h3>No insights yet</h3>
            <p>Add some transactions and click "Refresh Insights" to generate AI-powered spending analysis.</p>
          </div>
        ) : (
          <div className="insight-board">
            {snapshot.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (activeAppScreen === "assistant") {
    return <AssistantAppScreen snapshot={snapshot} userId={userId} />;
  }

  return (
    <OverviewAppScreen
      affordabilityByGoal={affordabilityByGoal}
      snapshot={snapshot}
      monthlyTotals={monthlyTotals}
      budgets={budgets}
      budgetSuggestions={budgetSuggestions}
      onSaveBudget={onSaveBudget}
      onRemoveBudget={onRemoveBudget}
    />
  );
}

function OverviewAppScreen({
  affordabilityByGoal,
  snapshot,
  monthlyTotals,
  budgets,
  budgetSuggestions,
  onSaveBudget,
  onRemoveBudget,
}: {
  affordabilityByGoal: Map<string, AssistantSnapshot["goal_affordability"][number]>;
  snapshot: AssistantSnapshot;
  monthlyTotals: ReturnType<typeof aggregateByMonth>;
  budgets: Budget[];
  budgetSuggestions: BudgetSuggestion[];
  onSaveBudget: (categoryName: string, limit: number) => Promise<void>;
  onRemoveBudget: (categoryName: string) => Promise<void>;
}) {
  const { cashflow } = snapshot;

  return (
    <>
      <section className="metric-grid" aria-label="Financial overview">
        <MetricTile
          label="Income"
          value={formatCurrency(cashflow.income)}
          detail="Tracked inflow"
          icon="arrow-up"
          tone="positive"
        />
        <MetricTile
          label="Expenses"
          value={formatCurrency(cashflow.expenses)}
          detail="Tracked outflow"
          tone="warning"
          icon="arrow-down"
        />
        <MetricTile
          label="Surplus"
          value={formatCurrency(cashflow.surplus)}
          detail="Available after expenses"
          tone="positive"
          icon="wallet"
        />
        <MetricTile
          label="Savings Rate"
          value={formatPercent(cashflow.savings_rate_percent)}
          detail="Surplus ÷ income"
          icon="trending"
          tone="neutral"
        />
      </section>

      <section className="dashboard-grid">
        <div className="main-column">
          <SpendingTrendChart data={monthlyTotals} />
          <section className="panel">
            <div className="section-heading">
              <div>
                <span>Priority Goals</span>
                <h2>Progress &amp; Affordability</h2>
              </div>
            </div>
            {snapshot.goals.length === 0 ? (
              <p className="empty-state">No goals yet — add one from the Goals screen.</p>
            ) : (
              <div className="goal-list">
                {snapshot.goals.slice(0, 3).map((goal) => (
                  <GoalCard key={goal.id} goal={goal} affordability={affordabilityByGoal.get(goal.id)} />
                ))}
              </div>
            )}
          </section>
          <CategoryBreakdown
            items={cashflow.expense_breakdown}
            budgets={budgets}
            suggestions={budgetSuggestions}
            onSaveBudget={onSaveBudget}
            onRemoveBudget={onRemoveBudget}
          />
        </div>

        <aside className="side-column">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span>AI Guidance</span>
                <h2>Latest Insights</h2>
              </div>
            </div>
            {snapshot.insights.length === 0 ? (
              <p className="empty-state">No insights yet — refresh to generate them.</p>
            ) : (
              <div className="insight-list">
                {snapshot.insights.slice(0, 4).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} compact />
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </>
  );
}

type FilterType = "all" | "income" | "expense" | "transfer";

function TransactionsAppScreen({ transactions, onDelete, onBulkDelete }: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  const groups = groupTransactionsByDate(filtered);
  const filteredIds = filtered.map((t) => t.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const income = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");
  const transfers = transactions.filter((t) => t.type === "transfer");

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filteredIds));
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    setSelected(new Set());
    onBulkDelete(ids);
  }

  return (
    <section className="screen-stack">
      <div className="screen-summary">
        <MetricTile label="Transactions" value={`${transactions.length}`} detail="Total entries" icon="list" />
        <MetricTile label="Income Rows" value={`${income.length}`} detail="Tracked income items" tone="positive" icon="arrow-up" />
        <MetricTile label="Expense Rows" value={`${expenses.length}`} detail="Tracked expense items" tone="warning" icon="arrow-down" />
        {transfers.length > 0 && (
          <MetricTile label="Transfers" value={`${transfers.length}`} detail="Excluded from totals" tone="neutral" icon="trending" />
        )}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <span>Ledger</span>
            <h2>Recent Transactions</h2>
          </div>
        </div>
        <div className="transaction-filter-bar">
          {(["all", "income", "expense", "transfer"] as FilterType[]).map((f) => (
            <button
              key={f}
              className={`filter-pill${filter === f ? " filter-pill--active" : ""}`}
              onClick={() => { setFilter(f); setSelected(new Set()); }}
              type="button"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "transfer" && transfers.length > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.7, fontSize: "0.75em" }}>({transfers.length})</span>
              )}
            </button>
          ))}
          {filtered.length > 0 && (
            <button
              className={`filter-pill${allSelected ? " filter-pill--active" : ""}`}
              onClick={toggleAll}
              type="button"
              style={{ marginLeft: "auto" }}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="bulk-action-bar">
            <span>{selected.size} selected</span>
            <button className="bulk-delete-btn" onClick={handleBulkDelete} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete {selected.size}
            </button>
            <button className="filter-pill" onClick={() => setSelected(new Set())} type="button">
              Cancel
            </button>
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="empty-state-rich">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4" />
                <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </div>
            <h3>No transactions yet</h3>
            <p>Add income or expense entries to start tracking your money movement.</p>
          </div>
        ) : (
          <div className="transaction-table">
            {groups.map(({ date, label, items }) => (
              <div key={date} className="transaction-group">
                <div className="transaction-group__header">
                  <span className="transaction-group__date">{label}</span>
                  <span className="transaction-group__net">
                    {formatCurrency(
                      items.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0)
                    )}
                  </span>
                </div>
                {items.map((transaction) => (
                  <article
                    className={`transaction-row${selected.has(transaction.id) ? " transaction-row--selected" : ""}`}
                    key={transaction.id}
                  >
                    <input
                      type="checkbox"
                      className="transaction-checkbox"
                      checked={selected.has(transaction.id)}
                      onChange={() => toggleOne(transaction.id)}
                      aria-label="Select transaction"
                    />
                    <div>
                      <strong>{transaction.description || "Transaction"}</strong>
                      <small>{transaction.transaction_date}</small>
                    </div>
                    <span className={`ledger-type ledger-type--${transaction.type}`}>{transaction.type}</span>
                    <span className={`transaction-amount transaction-amount--${transaction.type}`}>
                      {transaction.type === "income" ? "+" : transaction.type === "transfer" ? "↔" : "−"}{formatCurrency(transaction.amount)}
                    </span>
                    <button
                      className="transaction-delete-btn"
                      onClick={() => onDelete(transaction.id)}
                      type="button"
                      aria-label="Delete transaction"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function AssistantAppScreen({ snapshot, userId }: { snapshot: AssistantSnapshot; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      await streamChat(
        userId,
        text,
        messages.concat(userMsg),
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)
          );
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }

  const { cashflow } = snapshot;

  return (
    <section className="assistant-layout">
      <section className="panel assistant-panel">
        <div className="section-heading">
          <div>
            <span>Financial Health</span>
            <h2>Your Snapshot</h2>
          </div>
        </div>
        <dl>
          <div><dt>Monthly Surplus</dt><dd>{formatCurrency(cashflow.surplus)}</dd></div>
          <div><dt>Savings Rate</dt><dd>{formatPercent(cashflow.savings_rate_percent)}</dd></div>
          <div><dt>Active Goals</dt><dd>{snapshot.goals.length}</dd></div>
          <div><dt>Insights</dt><dd>{snapshot.insights.length}</dd></div>
        </dl>
        {snapshot.goal_affordability.length > 0 && (
          <>
            <div style={{ margin: "18px 0 10px", borderTop: "1px solid var(--border-subtle)" }} />
            <div className="section-heading" style={{ marginBottom: 10 }}>
              <div><span>Affordability</span><h2 style={{ fontSize: "0.9rem" }}>Goal Feasibility</h2></div>
            </div>
            <div className="affordability-list">
              {snapshot.goal_affordability.map((item) => (
                <article className={`affordability-row affordability-row--${item.affordability_status}`} key={item.goal_id}>
                  <div>
                    <strong>{item.goal_name}</strong>
                    <small>₹{(item.monthly_required ?? 0).toLocaleString("en-IN")}/mo needed</small>
                  </div>
                  <span className={`status-badge status-badge--${item.affordability_status}`}>
                    {statusLabel(item.affordability_status)}
                  </span>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 520 }}>
        <div className="section-heading">
          <div>
            <span>AI Advisor</span>
            <h2>Ask FinPilot</h2>
          </div>
        </div>
        <ChatPanel messages={messages} isStreaming={isStreaming} onSend={handleSend} />
      </section>
    </section>
  );
}

function screenEyebrow(screen: AppScreen) {
  if (screen === "assistant") return "Financial Health";
  if (screen === "transactions") return "Money Movement";
  if (screen === "categories") return "Organization";
  if (screen === "insights") return "AI Guidance";
  if (screen === "goals") return "Planning";
  return "Dashboard";
}

function screenTitle(screen: AppScreen) {
  if (screen === "assistant") return "Assistant";
  if (screen === "transactions") return "Transactions";
  if (screen === "categories") return "Categories";
  if (screen === "insights") return "Insights";
  if (screen === "goals") return "Goals";
  return "Overview";
}

type CategoryFilterType = "all" | "income" | "expense";

function CategoriesAppScreen({ transactions, categories, onUpdateCategory }: {
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string | null) => void;
}) {
  const [filter, setFilter] = useState<CategoryFilterType>("all");

  const categorizable = transactions.filter((t) => t.type !== "transfer");
  const filtered = filter === "all" ? categorizable : categorizable.filter((t) => t.type === filter);
  const uncategorized = categorizable.filter((t) => !t.category_id).length;
  const uniqueCategories = new Set(transactions.map((t) => t.category_name).filter(Boolean)).size;

  return (
    <section className="screen-stack">
      <div className="screen-summary">
        <MetricTile label="Total" value={`${categorizable.length}`} detail="Income + expense rows" icon="list" />
        <MetricTile
          label="Uncategorized"
          value={`${uncategorized}`}
          detail="Need a category"
          tone={uncategorized > 0 ? "warning" : "positive"}
          icon="trending"
        />
        <MetricTile label="Categories Used" value={`${uniqueCategories}`} detail="Distinct labels applied" icon="target" />
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span>Categorization</span>
            <h2>Manage Transaction Categories</h2>
          </div>
        </div>

        <div className="transaction-filter-bar">
          {(["all", "income", "expense"] as CategoryFilterType[]).map((f) => (
            <button
              key={f}
              className={`filter-pill${filter === f ? " filter-pill--active" : ""}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state-rich">
            <h3>No transactions</h3>
            <p>Add some transactions to start categorizing them.</p>
          </div>
        ) : (
          <div className="category-edit-list">
            {filtered.map((transaction) => {
              const relevantCategories = categories.filter((c) => c.type === transaction.type);
              return (
                <article key={transaction.id} className="category-edit-row">
                  <div className="category-edit-row__info">
                    <strong>{transaction.description || "Transaction"}</strong>
                    <small>{transaction.transaction_date}</small>
                  </div>
                  <span className={`ledger-type ledger-type--${transaction.type}`}>{transaction.type}</span>
                  <span className={`transaction-amount transaction-amount--${transaction.type}`}>
                    {transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.amount)}
                  </span>
                  <select
                    className={`category-select${!transaction.category_id ? " category-select--unset" : ""}`}
                    value={transaction.category_id ?? ""}
                    onChange={(e) => onUpdateCategory(transaction.id, e.target.value || null)}
                  >
                    <option value="">Uncategorized</option>
                    {relevantCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export default App;
