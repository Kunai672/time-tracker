/**
 * The data-access contract shared by every backend.
 *
 * Everything is async so a remote backend (Supabase) and the local
 * localStorage backend are interchangeable. The UI only ever talks to a
 * `DataRepository`; it never imports `lib/storage.ts` directly.
 */
import type { StorageStatus } from "../storage";
import type { AppData, Category, RunningTimer, TimeEntry } from "../types";

export type CategoryDraft = {
  name: string;
  color: string;
};

export type CategoryPatch = {
  name?: string;
  color?: string;
};

/** The editable fields of a time entry; ids are assigned by the backend. */
export type EntryDraft = {
  description: string;
  categoryId: string;
  start: string;
  end: string;
};

export type StartTimerInput = {
  categoryId: string;
  description?: string;
  /** Overrides the clock; used by tests to stay deterministic. */
  startedAt?: string;
};

export type StopTimerInput = {
  description?: string;
  /** Overrides the clock; used by tests to stay deterministic. */
  end?: string;
};

export type DataRepository = {
  listCategories(): Promise<Category[]>;
  createCategory(draft: CategoryDraft): Promise<Category>;
  updateCategory(id: string, patch: CategoryPatch): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  listEntries(): Promise<TimeEntry[]>;
  createEntry(draft: EntryDraft): Promise<TimeEntry>;
  updateEntry(id: string, draft: EntryDraft): Promise<TimeEntry>;
  deleteEntry(id: string): Promise<void>;
  /** Puts a deleted entry back, keeping its original id (Undo). */
  restoreEntry(entry: TimeEntry): Promise<TimeEntry>;

  getRunningTimer(): Promise<RunningTimer | null>;
  startTimer(input: StartTimerInput): Promise<RunningTimer>;
  stopTimer(input?: StopTimerInput): Promise<TimeEntry | null>;

  exportAll(): Promise<AppData>;
  /** Replaces all data. Rejects malformed payloads before writing anything. */
  importAll(data: AppData): Promise<void>;

  /** Local backends report whether persisted data was corrupt. */
  getStorageStatus?(): Promise<StorageStatus>;
};

/** Raised when a payload or id cannot be resolved by a repository. */
export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataValidationError";
  }
}

/** Raised when a repository write fails (network, permissions, …). */
export class DataWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataWriteError";
  }
}
