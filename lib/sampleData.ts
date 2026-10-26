/**
 * First-run helpers: detecting an untouched install and building the optional
 * sample dataset offered on the welcome card.
 */
import { SCHEMA_VERSION, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_ID } from "./constants";
import { newId } from "./ids";
import type { AppData, Category, TimeEntry } from "./types";

/** True when the user has neither entries nor categories of their own yet. */
export function isFirstRun(data: AppData): boolean {
  return (
    data.entries.length === 0 &&
    data.categories.every((category) => category.id === UNCATEGORIZED_ID)
  );
}

function at(now: Date, daysAgo: number, hour: number, minute = 0): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function entry(
  id: string,
  description: string,
  categoryId: string,
  start: Date,
  minutes: number,
): TimeEntry {
  return {
    id,
    description,
    categoryId,
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60_000).toISOString(),
    durationMinutes: minutes,
  };
}

/**
 * A believable starter dataset relative to `now`, so the dashboard charts and
 * stats have something to show immediately.
 */
export function buildSampleData(now: Date = new Date()): AppData {
  const categories: Category[] = [
    { ...UNCATEGORIZED_CATEGORY },
    { id: newId("cat"), name: "Work", color: "#4f46e5" },
    { id: newId("cat"), name: "Study", color: "#0d9488" },
    { id: newId("cat"), name: "Exercise", color: "#d97706" },
  ];
  const [work, study, exercise] = categories.slice(1);

  const entries: TimeEntry[] = [
    entry(newId("entry"), "Deep work", work.id, at(now, 0, 9), 150),
    entry(newId("entry"), "Standup", work.id, at(now, 0, 11, 30), 30),
    entry(newId("entry"), "Reading", study.id, at(now, 0, 14), 90),
    entry(newId("entry"), "Design review", work.id, at(now, 1, 9, 30), 120),
    entry(newId("entry"), "Yoga", exercise.id, at(now, 1, 18), 45),
    entry(newId("entry"), "Course", study.id, at(now, 2, 8), 75),
  ];

  return {
    version: SCHEMA_VERSION,
    categories,
    entries,
    runningTimer: null,
  };
}
