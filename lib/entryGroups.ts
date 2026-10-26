/**
 * Presentation grouping for the entries list: one section per calendar day,
 * newest day first, each with its daily total.
 */
import { dateKey } from "./filters";
import { sortEntriesNewestFirst } from "./entries";
import type { TimeEntry } from "./types";

export type EntryGroup = {
  /** `YYYY-MM-DD` (UTC, matching `filterEntries`). */
  date: string;
  /** Sum of durations for the day, in minutes. */
  totalMinutes: number;
  /** Entries for the day, newest first. */
  entries: TimeEntry[];
};

export function groupEntriesByDay(entries: TimeEntry[]): EntryGroup[] {
  const byDay = new Map<string, TimeEntry[]>();

  for (const entry of entries) {
    const key = dateKey(entry.start);
    const list = byDay.get(key);
    if (list) {
      list.push(entry);
    } else {
      byDay.set(key, [entry]);
    }
  }

  return [...byDay.entries()]
    .map(([date, list]) => ({
      date,
      totalMinutes: list.reduce((sum, entry) => sum + entry.durationMinutes, 0),
      entries: sortEntriesNewestFirst(list),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
