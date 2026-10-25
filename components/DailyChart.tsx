"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { aggregateStackedByDay } from "../lib/aggregate";
import { CHART_RANGES, chartRangeDays, type ChartRange } from "../lib/chart-data";
import { formatChartDay } from "../lib/datetime";
import { formatDuration, minutesToHours } from "../lib/duration";
import type { Category, TimeEntry } from "../lib/types";
import { ChartEmpty } from "./ChartEmpty";

export type DailyChartProps = {
  entries: TimeEntry[];
  categories: Category[];
  /** Injected clock so the selected range is deterministic in tests. */
  now: Date;
};

/**
 * Stacked bar chart of time per day, split by category. Every day in the
 * selected range is present (zero days included) and the 7d / 30d / month
 * toggle re-buckets the same entries.
 */
export function DailyChart({ entries, categories, now }: DailyChartProps) {
  const [range, setRange] = useState<ChartRange>("7d");

  const days = useMemo(() => chartRangeDays(range, now), [range, now]);
  const daily = useMemo(
    () => aggregateStackedByDay(entries, categories, days),
    [entries, categories, days],
  );

  // Only surface categories that actually have time in this range, ordered
  // from largest to smallest so the stack reads top-down.
  const activeCategories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of daily) {
      for (const [categoryId, minutes] of Object.entries(day.values)) {
        totals.set(categoryId, (totals.get(categoryId) ?? 0) + minutes);
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoryId]) => categories.find((item) => item.id === categoryId))
      .filter((category): category is Category => Boolean(category));
  }, [daily, categories]);

  if (entries.length === 0) {
    return <ChartEmpty variant="bar" />;
  }

  const config = Object.fromEntries(
    activeCategories.map((category) => [
      category.id,
      { label: category.name, color: category.color },
    ]),
  ) as ChartConfig;

  const chartData = daily.map((day) => ({
    date: day.date,
    ...Object.fromEntries(
      activeCategories.map((category) => [
        category.id,
        minutesToHours(day.values[category.id] ?? 0),
      ]),
    ),
  }));

  return (
    <div data-testid="daily-chart" className="space-y-3">
      <div className="flex justify-end">
        <Tabs
          value={range}
          onValueChange={(value) => {
            if (value) setRange(value as ChartRange);
          }}
        >
          <TabsList aria-label="Chart range">
            {CHART_RANGES.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatChartDay}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals
            unit="h"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(value) => formatChartDay(String(value))}
                formatter={(value) =>
                  formatDuration(Math.round(Number(value) * 60))
                }
              />
            }
          />
          {activeCategories.map((category, index) => (
            <Bar
              key={category.id}
              dataKey={category.id}
              stackId="a"
              fill={category.color}
              radius={
                index === activeCategories.length - 1 ? [4, 4, 0, 0] : undefined
              }
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
