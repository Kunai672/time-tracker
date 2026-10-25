/**
 * Presentation-only helpers for the charts. Aggregation itself lives in
 * `lib/aggregate.ts`; this module converts totals into slices with
 * percentages that always add up to exactly 100 and builds the day lists for
 * the dashboard range toggle.
 */
import type { CategoryTotal } from "./aggregate";

/** Ranges offered by the dashboard bar chart. */
export type ChartRange = "7d" | "30d" | "month";

export const CHART_RANGES: readonly { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "month", label: "Month" },
] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Ordered local `YYYY-MM-DD` keys for a chart range, ending today. `"month"`
 * spans the first of the current month through today; `"7d"`/`"30d"` include
 * today. The injected `now` keeps it deterministic in tests.
 */
export function chartRangeDays(range: ChartRange, now: Date): string[] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (range === "month") {
    start.setDate(1);
  } else {
    const length = range === "7d" ? 7 : 30;
    start.setDate(start.getDate() - (length - 1));
  }

  const days: string[] = [];
  for (
    const cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    days.push(dayKey(cursor));
  }
  return days;
}

export type CategorySlice = CategoryTotal & {
  /** Integer percentage, largest-remainder rounded so the set sums to 100. */
  percent: number;
};

/**
 * Adds integer percentages to category totals using the largest-remainder
 * method, so no slice is off by a rounding unit and the legend always adds up
 * to 100 (when there is any data at all).
 */
export function categoryPercentages(totals: CategoryTotal[]): CategorySlice[] {
  const total = totals.reduce((sum, item) => sum + item.minutes, 0);
  if (total <= 0) return [];

  const slices: CategorySlice[] = totals.map((item) => ({
    ...item,
    percent: Math.floor((item.minutes / total) * 100),
  }));

  const remainder = 100 - slices.reduce((sum, item) => sum + item.percent, 0);
  const byFraction = [...slices].sort((a, b) => {
    const aFraction = (a.minutes / total) * 100 - a.percent;
    const bFraction = (b.minutes / total) * 100 - b.percent;
    if (bFraction !== aFraction) return bFraction - aFraction;
    return a.categoryId.localeCompare(b.categoryId);
  });

  for (let index = 0; index < remainder && index < byFraction.length; index += 1) {
    byFraction[index].percent += 1;
  }

  return slices;
}
