"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NEIGHBORHOOD_LABELS } from "@/src/lib/constants";
import type { Neighborhood } from "@/src/lib/constants";

interface StayChartData {
  neighborhood: string;
  minPriceUsdCents: number;
}

export function StayChart({ data }: { data: StayChartData[] }) {
  const chartData = data.map((d) => ({
    name: NEIGHBORHOOD_LABELS[d.neighborhood as Neighborhood] || d.neighborhood,
    price: d.minPriceUsdCents / 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No stay data yet. Run a price check first.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={11}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--card-foreground)",
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}/night`, ""]}
        />
        <Bar dataKey="price" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
