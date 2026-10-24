/**
 * Pure time-entry CRUD plus the canonical sort order (newest first).
 */
import { durationMinutesBetween } from "./duration";
import type { TimeEntry } from "./types";

export type TimeEntryDraft = {
  description: string;
  categoryId: string;
  start: string;
  end: string;
};

function withDuration(draft: TimeEntryDraft): Omit<TimeEntry, "id"> {
  return {
    description: draft.description.trim(),
    categoryId: draft.categoryId,
    start: draft.start,
    end: draft.end,
    durationMinutes: durationMinutesBetween(draft.start, draft.end),
  };
}

/** Creates an entry. `id` is injected so tests are deterministic. */
export function createEntry(
  entries: TimeEntry[],
  draft: TimeEntryDraft,
  id: string,
): TimeEntry[] {
  return [...entries, { id, ...withDuration(draft) }];
}

/** Replaces the editable fields of an entry, recomputing the duration. */
export function updateEntry(
  entries: TimeEntry[],
  id: string,
  draft: TimeEntryDraft,
): TimeEntry[] {
  return entries.map((entry) =>
    entry.id === id ? { id, ...withDuration(draft) } : entry,
  );
}

export function deleteEntry(entries: TimeEntry[], id: string): TimeEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function findEntry(
  entries: TimeEntry[],
  id: string,
): TimeEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

/**
 * Puts a deleted entry back, keeping its original id. Used by the undo toast.
 * Restoring an entry that already exists is a no-op.
 */
export function restoreEntry(
  entries: TimeEntry[],
  entry: TimeEntry,
): TimeEntry[] {
  if (entries.some((existing) => existing.id === entry.id)) return entries;
  return [...entries, { ...entry }];
}

/** Newest first by start time; ties fall back to end time then id. */
export function sortEntriesNewestFirst(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) => {
    const byStart = new Date(b.start).getTime() - new Date(a.start).getTime();
    if (byStart !== 0) return byStart;
    const byEnd = new Date(b.end).getTime() - new Date(a.end).getTime();
    if (byEnd !== 0) return byEnd;
    return a.id.localeCompare(b.id);
  });
}
