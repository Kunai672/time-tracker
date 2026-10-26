/**
 * Backend-agnostic repository implementation.
 *
 * All the CRUD rules live in the pure functions in `lib/`; this module only
 * orchestrates them around a tiny synchronous key/value `DataStore`. The
 * localStorage backend and the in-memory fake are both built from it, which
 * keeps their behaviour identical (and is what the shared contract test
 * exercises).
 */
import {
  createCategory as addCategory,
  deleteCategory as removeCategory,
  recolorCategory,
  renameCategory,
} from "../categories";
import { createEntry as addEntry, deleteEntry as removeEntry, restoreEntry as restore, updateEntry as update } from "../entries";
import { newId } from "../ids";
import { importData } from "../importExport";
import { startTimerWithDescription, stopTimer as stopTimerPure } from "../timer";
import type { AppData, TimeEntry } from "../types";
import {
  DataValidationError,
  type CategoryDraft,
  type CategoryPatch,
  type DataRepository,
  type EntryDraft,
  type StartTimerInput,
  type StopTimerInput,
} from "./types";

/** The minimal persistence primitive a repository needs. */
export type DataStore = {
  read(): AppData;
  write(data: AppData): void;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Builds a `DataRepository` on top of any synchronous store. Reads return
 * defensive copies so callers can never mutate persisted state by accident.
 */
export function createDataRepository(store: DataStore): DataRepository {
  function read(): AppData {
    return clone(store.read());
  }

  return {
    async listCategories() {
      return read().categories;
    },

    async createCategory(draft: CategoryDraft) {
      const data = read();
      const id = newId("cat");
      const categories = addCategory(data.categories, draft, id);
      store.write({ ...data, categories });
      return categories[categories.length - 1];
    },

    async updateCategory(id: string, patch: CategoryPatch) {
      const data = read();
      let categories = data.categories;
      if (patch.name !== undefined) {
        categories = renameCategory(categories, id, patch.name);
      }
      if (patch.color !== undefined) {
        categories = recolorCategory(categories, id, patch.color);
      }
      const updated = categories.find((category) => category.id === id);
      if (!updated) throw new DataValidationError(`Unknown category: ${id}`);
      store.write({ ...data, categories });
      return updated;
    },

    async deleteCategory(id: string) {
      const data = read();
      const result = removeCategory(data.categories, data.entries, id);
      const runningTimer =
        data.runningTimer?.categoryId === id ? null : data.runningTimer;
      store.write({
        ...data,
        categories: result.categories,
        entries: result.entries,
        runningTimer,
      });
    },

    async listEntries() {
      return read().entries;
    },

    async createEntry(draft: EntryDraft) {
      const data = read();
      const id = newId("entry");
      const entries = addEntry(data.entries, draft, id);
      store.write({ ...data, entries });
      return entries[entries.length - 1];
    },

    async updateEntry(id: string, draft: EntryDraft) {
      const data = read();
      const entries = update(data.entries, id, draft);
      const updated = entries.find((entry) => entry.id === id);
      if (!updated) throw new DataValidationError(`Unknown entry: ${id}`);
      store.write({ ...data, entries });
      return updated;
    },

    async deleteEntry(id: string) {
      const data = read();
      store.write({ ...data, entries: removeEntry(data.entries, id) });
    },

    async restoreEntry(entry: TimeEntry) {
      const data = read();
      store.write({ ...data, entries: restore(data.entries, entry) });
      return clone(entry);
    },

    async getRunningTimer() {
      return read().runningTimer;
    },

    async startTimer(input: StartTimerInput) {
      const data = read();
      const now = input.startedAt ? new Date(input.startedAt) : new Date();
      const runningTimer = startTimerWithDescription(
        input.categoryId,
        now,
        input.description ?? "",
      );
      store.write({ ...data, runningTimer });
      return runningTimer;
    },

    async stopTimer(input: StopTimerInput = {}) {
      const data = read();
      const now = input.end ? new Date(input.end) : new Date();
      const result = stopTimerPure(
        data.entries,
        data.runningTimer,
        now,
        newId("entry"),
        input.description ?? "",
      );
      if (!result.entry) return null;
      store.write({ ...data, entries: result.entries, runningTimer: null });
      return result.entry;
    },

    async exportAll() {
      return read();
    },

    async importAll(data: AppData) {
      const result = importData(JSON.stringify(data));
      if (!result.ok) throw new DataValidationError(result.error);
      store.write(result.data);
    },
  };
}
