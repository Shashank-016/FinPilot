import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthlyTotals } from "../utils/format";
import { formatCurrency } from "../utils/format";

type SpendingTrendChartProps = {
  data: MonthlyTotals[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(9,16,30,0.10)",
      fontSize: "0.8rem",
    }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.name === "income" ? "#065f46" : "#78350f", fontWeight: 600 }}>
          {p.name.charAt(0).toUpperCase() + p.name.slice(1)}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  if (!data.length) {
    return (
      <div className="chart-placeholder-panel">
        Add transactions to see your spending trend
      </div>
    );
  }

  return (
    <section className="panel" style={{ padding: "22px 24px 16px" }}>
      <div className="section-heading">
        <div>
          <span>Monthly Overview</span>
          <h2>Spending Trend</h2>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.05)" }} />
          <Bar dataKey="expenses" fill="#f59e0b" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "flex-end" }}>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
          Expenses
        </span>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 3, background: "#10b981", display: "inline-block" }} />
          Income
        </span>
      </div>
    </section>
  );
}
