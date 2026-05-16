import type { AuthUser } from "../auth/AuthContext";
import type { AssistantSnapshot, Budget, BudgetSuggestion, Category, Transaction } from "../types/assistant";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const DEMO_USER_ID =
  import.meta.env.VITE_DEMO_USER_ID ?? "e209cc12-83d5-454b-9d76-fabda40022a7";

type CreateUserInput = {
  name: string;
  email: string;
};

type CreateTransactionInput = {
  user_id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  transaction_date: string;
};

type CreateGoalInput = {
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
};

export type CreatedUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

export async function getMe(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {}, token);
}

export async function getAssistantSnapshot(userId = DEMO_USER_ID): Promise<AssistantSnapshot> {
  return request<AssistantSnapshot>(`/assistant/snapshot/${userId}`);
}

export async function getUserTransactions(userId = DEMO_USER_ID): Promise<Transaction[]> {
  return request<Transaction[]>(`/transactions/user/${userId}`);
}

export async function createUser(input: CreateUserInput): Promise<CreatedUser> {
  return request<CreatedUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createTransaction(input: CreateTransactionInput) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createGoal(input: CreateGoalInput) {
  return request("/goals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Delete failed with ${response.status}`);
  }
}

export async function bulkDeleteTransactions(ids: string[]): Promise<void> {
  await request("/transactions/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function getPendingReview(userId: string): Promise<Transaction[]> {
  return request<Transaction[]>(`/transactions/pending-review/${userId}`);
}

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/transactions/categories");
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null,
): Promise<Transaction> {
  return request<Transaction>(`/transactions/${transactionId}/category`, {
    method: "PATCH",
    body: JSON.stringify({ category_id: categoryId }),
  });
}

export async function getUserBudgets(userId: string): Promise<Budget[]> {
  return request<Budget[]>(`/budgets/user/${userId}`);
}

export async function getBudgetSuggestions(userId: string): Promise<BudgetSuggestion[]> {
  return request<BudgetSuggestion[]>(`/budgets/suggest/${userId}`);
}

export async function upsertBudget(
  userId: string,
  categoryName: string,
  monthlyLimit: number,
): Promise<Budget> {
  return request<Budget>("/budgets", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, category_name: categoryName, monthly_limit: monthlyLimit }),
  });
}

export async function deleteBudget(userId: string, categoryName: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  await fetch(
    `${API_BASE_URL}/budgets/user/${userId}/category/${encodeURIComponent(categoryName)}`,
    { method: "DELETE", headers },
  );
}

export async function generateInsights(userId: string) {
  return request(`/insights/generate/${userId}`, {
    method: "POST",
  });
}

export async function uploadTransactions(
  userId: string,
  file: File,
): Promise<{ message: string; filename: string; inserted: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const response = await fetch(`${API_BASE_URL}/transactions/upload/${userId}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed with ${response.status}`);
  }

  return response.json() as Promise<{ message: string; filename: string; inserted: number }>;
}

export async function streamChat(
  userId: string,
  message: string,
  history: import("../types/assistant").ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    },
    body: JSON.stringify({
      user_id: userId,
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  });

  if (!res.ok) throw new Error(await res.text());

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) onChunk(parsed.text);
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

async function request<T>(path: string, init: RequestInit = {}, tokenOverride?: string): Promise<T> {
  const token = tokenOverride ?? _token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    // Clear stale token and reload to show login screen
    localStorage.removeItem("fp_auth_token");
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}
