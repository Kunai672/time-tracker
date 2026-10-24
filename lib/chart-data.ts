/**
 * Presentation-only helpers for the charts. Aggregation itself lives in
 * `lib/aggregate.ts`; this module only converts totals into slices with
 * percentages that always add up to exactly 100.
 */
import type { CategoryTotal } from "./aggregate";

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
