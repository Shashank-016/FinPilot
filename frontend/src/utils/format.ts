import type { Transaction } from "../types/assistant";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function groupTransactionsByDate(
  transactions: Transaction[]
): Array<{ date: string; label: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (!t.transaction_date) continue;
    const key = t.transaction_date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, label: formatRelativeDate(date), items }));
}

export type MonthlyTotals = { month: string; income: number; expenses: number };

export function aggregateByMonth(transactions: Transaction[]): MonthlyTotals[] {
  const map = new Map<string, MonthlyTotals>();
  for (const t of transactions) {
    if (!t.transaction_date) continue;
    const d = new Date(t.transaction_date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    if (!map.has(key)) map.set(key, { month: label, income: 0, expenses: 0 });
    const entry = map.get(key)!;
    if (t.type === "income") entry.income += t.amount;
    else entry.expenses += t.amount;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function getCategoryEmoji(description: string | null): string {
  if (!description) return "💳";
  const d = description.toLowerCase();
  if (/salary|payroll|income|wage/.test(d)) return "💼";
  if (/food|restaurant|swiggy|zomato|cafe|lunch|dinner|eat/.test(d)) return "🍽";
  if (/transport|uber|ola|taxi|auto|metro|petrol|fuel|cab/.test(d)) return "🚗";
  if (/shopping|amazon|flipkart|clothes|apparel/.test(d)) return "🛍";
  if (/rent|housing|maintenance|society/.test(d)) return "🏠";
  if (/medical|hospital|pharmacy|health|doctor/.test(d)) return "🏥";
  if (/electricity|internet|phone|bill|utility/.test(d)) return "⚡";
  if (/netflix|spotify|subscription|streaming/.test(d)) return "📺";
  if (/gym|fitness|yoga/.test(d)) return "💪";
  if (/travel|flight|hotel|holiday|trip/.test(d)) return "✈️";
  if (/education|course|book|tuition/.test(d)) return "📚";
  if (/investment|mutual|stock|sip/.test(d)) return "📈";
  return "💳";
}
