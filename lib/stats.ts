/**
 * Pure dashboard statistics.
 *
 * Everything is derived from the injected `now` so the numbers are
 * deterministic in tests. Days are compared using *local* calendar keys,
 * matching what a user sees in the UI.
 */
import { isoToLocalDateKey } from "./datetime";
import type { Category, TimeEntry } from "./types";

export type StatCard = {
  /** Minutes in the current period. */
  current: number;
  /** Minutes in the equivalent previous period. */
  previous: number;
  /** Rounded percentage change, or null when there is no baseline. */
  deltaPct: number | null;
};

export type TopCategoryStat = {
  categoryId: string;
  name: string;
  color: string;
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type DashboardStats = {
  today: StatCard;
  week: StatCard;
  dailyAverage: StatCard;
  topCategory: TopCategoryStat | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // Monday = 0
  day.setDate(day.getDate() - offset);
  return day;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(date: Date): string {
  return isoToLocalDateKey(date.toISOString());
}

/** Sums durations for entries whose local day falls within `[from, to]`. */
function sumBetween(entries: TimeEntry[], from: Date, to: Date): number {
  const fromKey = dayKey(from);
  const toKey = dayKey(to);
  return entries.reduce((sum, entry) => {
    const key = isoToLocalDateKey(entry.start);
    return key >= fromKey && key <= toKey ? sum + entry.durationMinutes : sum;
  }, 0);
}

function makeStat(current: number, previous: number): StatCard {
  return {
    current,
    previous,
    deltaPct:
      previous === 0 ? null : Math.round(((current - previous) / previous) * 100),
  };
}

/** Minutes per category for the current Monday-based week. */
export function weeklyMinutesByCategory(
  entries: TimeEntry[],
  now: Date,
): Map<string, number> {
  const fromKey = dayKey(startOfWeek(now));
  const toKey = dayKey(now);
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = isoToLocalDateKey(entry.start);
    if (key < fromKey || key > toKey) continue;
    totals.set(
      entry.categoryId,
      (totals.get(entry.categoryId) ?? 0) + entry.durationMinutes,
    );
  }

  return totals;
}

function topCategoryBetween(
  entries: TimeEntry[],
  categories: Category[],
  from: Date,
  to: Date,
  previousFrom: Date,
  previousTo: Date,
): TopCategoryStat | null {
  const fromKey = dayKey(from);
  const toKey = dayKey(to);
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = isoToLocalDateKey(entry.start);
    if (key < fromKey || key > toKey) continue;
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.durationMinutes);
  }

  let topId: string | null = null;
  let topMinutes = 0;
  for (const [id, minutes] of totals) {
    if (minutes > topMinutes) {
      topId = id;
      topMinutes = minutes;
    }
  }
  if (!topId || topMinutes <= 0) return null;

  const category = categories.find((item) => item.id === topId);
  const previous = sumBetween(
    entries.filter((entry) => entry.categoryId === topId),
    previousFrom,
    previousTo,
  );

  return {
    categoryId: topId,
    name: category?.name ?? "Uncategorized",
    color: category?.color ?? "#9ca3af",
    current: topMinutes,
    previous,
    deltaPct:
      previous === 0 ? null : Math.round(((topMinutes - previous) / previous) * 100),
  };
}

/**
 * Computes the four dashboard cards. Periods:
 * - Today vs yesterday.
 * - This week (Mon–today) vs the same span last week.
 * - Daily average over the last 7 days vs the previous 7 days.
 * - Top category of this week vs the same category last week.
 */
export function computeDashboardStats(
  entries: TimeEntry[],
  categories: Category[],
  now: Date,
): DashboardStats {
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const weekStart = startOfWeek(now);
  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekEnd = addDays(weekStart, -1);
  const lastSevenStart = addDays(today, -6);
  const previousSevenStart = addDays(today, -13);
  const previousSevenEnd = addDays(today, -7);

  const todayMinutes = sumBetween(entries, today, today);
  const yesterdayMinutes = sumBetween(entries, yesterday, yesterday);

  const weekMinutes = sumBetween(entries, weekStart, today);
  const previousWeekMinutes = sumBetween(entries, previousWeekStart, previousWeekEnd);

  const lastSevenMinutes = sumBetween(entries, lastSevenStart, today);
  const previousSevenMinutes = sumBetween(
    entries,
    previousSevenStart,
    previousSevenEnd,
  );

  return {
    today: makeStat(todayMinutes, yesterdayMinutes),
    week: makeStat(weekMinutes, previousWeekMinutes),
    dailyAverage: makeStat(
      Math.round(lastSevenMinutes / 7),
      Math.round(previousSevenMinutes / 7),
    ),
    topCategory: topCategoryBetween(
      entries,
      categories,
      weekStart,
      today,
      previousWeekStart,
      previousWeekEnd,
    ),
  };
}
