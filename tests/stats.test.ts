import { test } from "node:test";
import assert from "node:assert/strict";

import { computeDashboardStats } from "../lib/stats";
import { UNCATEGORIZED_CATEGORY } from "../lib/constants";
import type { Category, TimeEntry } from "../lib/types";

const categories: Category[] = [
  { ...UNCATEGORIZED_CATEGORY },
  { id: "work", name: "Work", color: "#4f46e5" },
  { id: "study", name: "Study", color: "#059669" },
];

/** Builds an entry starting at a local date/time. */
function entry(
  id: string,
  categoryId: string,
  start: Date,
  minutes: number,
): TimeEntry {
  return {
    id,
    description: id,
    categoryId,
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60_000).toISOString(),
    durationMinutes: minutes,
  };
}

// Wednesday, 15 May 2024 (local time).
const NOW = new Date(2024, 4, 15, 12, 0, 0);

test("stats are all zero with no data", () => {
  const stats = computeDashboardStats([], categories, NOW);

  assert.deepEqual(stats.today, { current: 0, previous: 0, deltaPct: null });
  assert.deepEqual(stats.week, { current: 0, previous: 0, deltaPct: null });
  assert.deepEqual(stats.dailyAverage, {
    current: 0,
    previous: 0,
    deltaPct: null,
  });
  assert.equal(stats.topCategory, null);
});

/*
 * Windows for NOW = Wed 15 May 2024 (Monday-based weeks):
 *   today       15th
 *   yesterday   14th
 *   this week   13th–15th
 *   last week   6th–12th
 *   last 7 days 9th–15th
 *   prior 7     2nd–8th
 */
const entries: TimeEntry[] = [
  entry("today", "work", new Date(2024, 4, 15, 9, 0), 60),
  entry("yesterday", "work", new Date(2024, 4, 14, 9, 0), 30),
  entry("mon-work", "work", new Date(2024, 4, 13, 9, 0), 120),
  entry("mon-study", "study", new Date(2024, 4, 13, 14, 0), 60),
  entry("last-week-a", "work", new Date(2024, 4, 7, 9, 0), 90),
  entry("last-week-b", "work", new Date(2024, 4, 10, 9, 0), 70),
  entry("prior-week", "work", new Date(2024, 4, 3, 9, 0), 140),
];

test("stats compare each period with the previous one", () => {
  const stats = computeDashboardStats(entries, categories, NOW);

  // Today: 60 vs 30 yesterday -> +100%.
  assert.deepEqual(stats.today, { current: 60, previous: 30, deltaPct: 100 });

  // This week: 270 vs 160 last week -> +69%.
  assert.deepEqual(stats.week, { current: 270, previous: 160, deltaPct: 69 });

  // Last 7 days: 340/7 = 49 vs 230/7 = 33 -> +48%.
  assert.deepEqual(stats.dailyAverage, {
    current: 49,
    previous: 33,
    deltaPct: 48,
  });

  assert.ok(stats.topCategory);
  assert.equal(stats.topCategory?.categoryId, "work");
  assert.equal(stats.topCategory?.name, "Work");
  assert.equal(stats.topCategory?.current, 210);
  assert.equal(stats.topCategory?.previous, 160);
  assert.equal(stats.topCategory?.deltaPct, 31);
});
