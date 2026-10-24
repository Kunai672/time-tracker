"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyTotal } from "../lib/aggregate";

export type DailyChartProps = {
  data: DailyTotal[];
};

export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500">No data for the selected filters.</p>
    );
  }

  return (
    <div style={{ width: "100%", height: 280 }} data-testid="daily-chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals unit="h" />
          <Tooltip />
          <Bar dataKey="hours" name="Hours" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
