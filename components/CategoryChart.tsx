"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

/** Donut of time per category, with a centre total and percentage legend. */
export function CategoryChart({ data }: CategoryChartProps) {
  const slices = categoryPercentages(data);

  if (slices.length === 0) {
    return <ChartEmpty variant="pie" />;
  }

  const total = slices.reduce((sum, slice) => sum + slice.minutes, 0);
  const config = Object.fromEntries(
    slices.map((slice) => [
      slice.categoryId,
      { label: `${slice.name} · ${slice.percent}%`, color: slice.color },
    ]),
  ) as ChartConfig;

  return (
    <div data-testid="category-chart" className="relative">
      <ChartContainer
        config={config}
        className="mx-auto aspect-square h-[280px] max-w-[280px]"
      >
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
          <ChartLegend content={<ChartLegendContent nameKey="categoryId" />} />
        </PieChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-x-0 top-2 bottom-14 flex flex-col items-center justify-center gap-0.5">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xl font-semibold tabular-nums">
          {formatDuration(total)}
        </span>
      </div>
    </div>
  );
}
