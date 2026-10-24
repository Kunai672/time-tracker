/**
 * Core domain models for the time tracker.
 *
 * These are intentionally plain data types. All behaviour lives in pure
 * functions in sibling modules so it can be unit tested without a browser.
 */

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type TimeEntry = {
  id: string;
  description: string;
  categoryId: string;
  /** ISO-8601 timestamp for the start of the entry. */
  start: string;
  /** ISO-8601 timestamp for the end of the entry. */
  end: string;
  /** Whole minutes between start and end, derived and stored for convenience. */
  durationMinutes: number;
};

export type RunningTimer = {
  categoryId: string;
  /** ISO-8601 timestamp of when the timer was started. */
  startedAt: string;
};

/** Result returned by form actions so components can surface errors. */
export type ActionResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/** 12- or 24-hour wall-clock display. */
export type TimeFormat = "12h" | "24h";

/** User preferences persisted separately from the tracked data. */
export type Settings = {
  timeFormat: TimeFormat;
};

/** Everything persisted to localStorage, under a single versioned key. */
export type AppData = {
  version: number;
  categories: Category[];
  entries: TimeEntry[];
  runningTimer: RunningTimer | null;
};
