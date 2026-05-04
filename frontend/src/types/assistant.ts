export type CategoryBreakdownItem = {
  category: string;
  total: number;
  share_percent: number;
};

export type CashflowSummary = {
  user_id: string;
  start_date: string | null;
  end_date: string | null;
  income: number;
  expenses: number;
  surplus: number;
  savings_rate_percent: number;
  expense_breakdown: CategoryBreakdownItem[];
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  start_date: string | null;
  deadline: string | null;
  created_at: string;
};

export type GoalAffordability = {
  goal_id: string;
  goal_name: string;
  progress_percent: number;
  remaining_amount: number;
  months_left: number | null;
  monthly_required: number | null;
  monthly_surplus: number;
  affordability_status: "on_track" | "tight" | "not_on_track" | "achieved" | string;
  shortfall: number;
  surplus_after_goal: number;
};

export type Insight = {
  id: string;
  user_id: string;
  goal_id: string | null;
  type: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "critical" | string;
  context: Record<string, unknown> | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "income" | "expense" | string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

export type AssistantSnapshot = {
  user_id: string;
  generated_at: string;
  cashflow: CashflowSummary;
  goals: Goal[];
  goal_affordability: GoalAffordability[];
  insights: Insight[];
};
