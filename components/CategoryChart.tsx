"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryTotal } from "../lib/aggregate";

export type CategoryChartProps = {
  data: CategoryTotal[];
};

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500">No data for the selected filters.</p>
    );
  }

  return (
    <div style={{ width: "100%", height: 280 }} data-testid="category-chart">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label
          >
            {data.map((slice) => (
              <Cell key={slice.categoryId} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
