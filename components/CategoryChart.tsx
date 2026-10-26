"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { categoryPercentages } from "../lib/chart-data";
import { formatDuration } from "../lib/duration";
import type { CategoryTotal } from "../lib/aggregate";
import { ChartEmpty } from "./ChartEmpty";

export type CategoryChartProps = {
  data: CategoryTotal[];
};

/**
 * Donut of time per category with a centre total. The legend is rendered as
 * its own descending list (rather than recharts' default) so the order is
 * guaranteed and each "Name · 27%" label stays on one line.
 */
export function CategoryChart({ data }: CategoryChartProps) {
  const slices = categoryPercentages(data);

  if (slices.length === 0) {
    return <ChartEmpty variant="pie" />;
  }

  const total = slices.reduce((sum, slice) => sum + slice.minutes, 0);
  const config = Object.fromEntries(
    slices.map((slice) => [
      slice.categoryId,
      { label: slice.name, color: slice.color },
    ]),
  ) as ChartConfig;

  return (
    <div data-testid="category-chart">
      <div className="relative mx-auto h-[280px] max-w-[280px]">
        <ChartContainer config={config} className="aspect-square h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="categoryId"
                  formatter={(value) => formatDuration(Number(value))}
                />
              }
            />
            <Pie
              data={slices}
              dataKey="minutes"
              nameKey="categoryId"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.categoryId} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-subtitle font-semibold tabular-nums">
            {formatDuration(total)}
          </span>
        </div>
      </div>

      <ul data-testid="category-legend" className="mt-4 space-y-1.5">
        {slices.map((slice) => (
          <li
            key={slice.categoryId}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              {slice.name} · {slice.percent}%
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatDuration(slice.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
