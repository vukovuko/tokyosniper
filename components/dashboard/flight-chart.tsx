"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface FlightDataPoint {
  checkedAt: string;
  priceEurCents: number;
  destination: string;
}

export function FlightChart({ data }: { data: FlightDataPoint[] }) {
  // Group by date, find min price per day per destination
  const grouped = new Map<
    string,
    { date: string; NRT?: number; HND?: number }
  >();

  for (const point of data) {
    const dateKey = format(new Date(point.checkedAt), "MM/dd");
    const existing = grouped.get(dateKey) || { date: dateKey };
    const priceEur = point.priceEurCents / 100;

    const dest = point.destination as "NRT" | "HND";
    if (!existing[dest] || priceEur < existing[dest]) {
      existing[dest] = priceEur;
    }
    grouped.set(dateKey, existing);
  }

  const chartData = Array.from(grouped.values()).reverse();

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No flight data yet. Run a price check first.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickFormatter={(v: number) => `€${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--card-foreground)",
          }}
          formatter={(value) => [`€${Number(value).toFixed(0)}`, ""]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="NRT"
          stroke="var(--chart-1)"
          name="BUD → NRT"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="HND"
          stroke="var(--chart-4)"
          name="BUD → HND"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
