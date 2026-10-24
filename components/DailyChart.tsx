"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { formatDuration } from "../lib/duration";
import type { DailyTotal } from "../lib/aggregate";
import { ChartEmpty } from "./ChartEmpty";

const config = {
  hours: { label: "Hours", color: "var(--chart-1)" },
} satisfies ChartConfig;

export type DailyChartProps = {
  data: DailyTotal[];
};

/** Bar chart of hours tracked per day. */
export function DailyChart({ data }: DailyChartProps) {
  if (data.length === 0) {
    return <ChartEmpty variant="bar" />;
  }

  return (
    <div data-testid="daily-chart">
      <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: string) => value.slice(5)}
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
                indicator="line"
                formatter={(value) =>
                  formatDuration(Math.round(Number(value) * 60))
                }
              />
            }
          />
          <Bar
            dataKey="hours"
            name="Hours"
            fill="var(--color-hours)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
