/**
 * Live-timer logic. The time source is always injected as a `Date` (or a
 * `Clock` function) so callers and tests are never at the mercy of the real
 * wall clock.
 */
import { durationMinutesBetween } from "./duration";
import { createEntry, type TimeEntryDraft } from "./entries";
import type { RunningTimer, TimeEntry } from "./types";

export type Clock = () => Date;

export const defaultClock: Clock = () => new Date();

export function startTimer(categoryId: string, now: Date): RunningTimer {
  return { categoryId, startedAt: now.toISOString() };
}

/** Whole minutes elapsed on a running timer. */
export function elapsedMinutes(timer: RunningTimer, now: Date): number {
  return durationMinutesBetween(timer.startedAt, now);
}

/** Whole seconds elapsed on a running timer (for the live clock). */
export function elapsedSeconds(timer: RunningTimer, now: Date): number {
  const start = new Date(timer.startedAt).getTime();
  const end = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  const diff = end - start;
  if (diff <= 0) return 0;
  return Math.floor(diff / 1000);
}

export type StopTimerResult = {
  entries: TimeEntry[];
  timer: null;
  entry: TimeEntry | null;
};

/**
 * Stops a running timer and turns it into a completed entry. A no-op when
 * there is nothing running.
 */
export function stopTimer(
  entries: TimeEntry[],
  timer: RunningTimer | null,
  now: Date,
  id: string,
  description = "",
): StopTimerResult {
  if (!timer) {
    return { entries, timer: null, entry: null };
  }

  const draft: TimeEntryDraft = {
    description: description.trim() || "Tracked time",
    categoryId: timer.categoryId,
    start: timer.startedAt,
    end: now.toISOString(),
  };

  const nextEntries = createEntry(entries, draft, id);
  return {
    entries: nextEntries,
    timer: null,
    entry: nextEntries[nextEntries.length - 1],
  };
}
