/**
 * Pure aggregation helpers used by the charts.
 */
import { UNCATEGORIZED_ID } from "./constants";
import { isoToLocalDateKey } from "./datetime";
import { dateKey, type EntryFilters } from "./filters";
import { minutesToHours } from "./duration";
import type { Category, TimeEntry } from "./types";

/** Total tracked minutes across the given entries. */
export function totalMinutes(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
}

export type DailyTotal = {
  date: string;
  minutes: number;
  hours: number;
};

export type CategoryTotal = {
  categoryId: string;
  name: string;
  color: string;
  minutes: number;
  hours: number;
};

/**
 * Sums duration per UTC calendar day, ascending by date. `entries` are
 * expected to already be filtered (see `filterEntries`).
 */
export function aggregateByDay(entries: TimeEntry[]): DailyTotal[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = dateKey(entry.start);
    totals.set(key, (totals.get(key) ?? 0) + entry.durationMinutes);
  }

  return [...totals.entries()]
    .map(([date, minutes]) => ({ date, minutes, hours: minutesToHours(minutes) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Sums duration per category, descending by time. Unknown category ids fall
 * back to the "Uncategorized" label. Zero-minute categories are omitted.
 */
export function aggregateByCategory(
  entries: TimeEntry[],
  categories: Category[],
): CategoryTotal[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const entry of entries) {
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.durationMinutes);
  }

  return [...totals.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([categoryId, minutes]) => {
      const category = byId.get(categoryId);
      return {
        categoryId:
          category?.id ?? (categoryId || UNCATEGORIZED_ID),
        name: category?.name ?? "Uncategorized",
        color: category?.color ?? "#9ca3af",
        minutes,
        hours: minutesToHours(minutes),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/** One day of the dashboard's stacked bar chart. */
export type StackedDay = {
  date: string;
  /** Total minutes across every category on this day. */
  total: number;
  /** Minutes per category id (missing ids are absent, i.e. zero). */
  values: Record<string, number>;
};

/**
 * Stacks minutes per category for each day in `days` (local `YYYY-MM-DD`
 * keys), always emitting a row per requested day so days without entries show
 * as genuine zeros. Entries whose category no longer exists fall back to
 * Uncategorized, matching `aggregateByCategory`.
 */
export function aggregateStackedByDay(
  entries: TimeEntry[],
  categories: Category[],
  days: string[],
): StackedDay[] {
  const known = new Set(categories.map((category) => category.id));
  const wanted = new Set(days);
  const totals = new Map<string, Map<string, number>>();

  for (const day of days) totals.set(day, new Map());

  for (const entry of entries) {
    const key = isoToLocalDateKey(entry.start);
    if (!wanted.has(key)) continue;
    const categoryId = known.has(entry.categoryId)
      ? entry.categoryId
      : UNCATEGORIZED_ID;
    const dayTotals = totals.get(key);
    if (!dayTotals) continue;
    dayTotals.set(
      categoryId,
      (dayTotals.get(categoryId) ?? 0) + entry.durationMinutes,
    );
  }

  return days.map((day) => {
    const values: Record<string, number> = {};
    let total = 0;
    for (const [categoryId, minutes] of totals.get(day) ?? []) {
      values[categoryId] = minutes;
      total += minutes;
    }
    return { date: day, total, values };
  });
}

/** Default filter range helper: everything from the first to the last day. */
export function fullRange(entries: TimeEntry[]): EntryFilters {
  if (entries.length === 0) return {};
  const keys = entries.map((entry) => dateKey(entry.start)).sort();
  return { from: keys[0], to: keys[keys.length - 1] };
}
