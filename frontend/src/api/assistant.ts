import type { AssistantSnapshot, Transaction } from "../types/assistant";

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

export async function generateInsights(userId: string) {
  return request(`/insights/generate/${userId}`, {
    method: "POST",
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}
