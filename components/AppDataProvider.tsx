"use client";

/**
 * Client-only data provider. It is the single bridge between React and the
 * storage layer: components call the actions here, the actions call pure
 * business functions from `lib/`, and only `lib/storage.ts` persists.
 *
 * State lives in the storage module's external store and is read with
 * `useSyncExternalStore`, so server rendering uses a stable default snapshot
 * and the browser loads from localStorage without a hydration mismatch.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  createDefaultData,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  writeData,
  type StorageStatus,
} from "../lib/storage";
import {
  createCategory,
  deleteCategory,
  recolorCategory,
  renameCategory,
} from "../lib/categories";
import {
  createEntry,
  deleteEntry,
  restoreEntry,
  updateEntry,
} from "../lib/entries";
import { newId } from "../lib/ids";
import {
  defaultClock,
  startTimerWithDescription,
  stopTimer,
} from "../lib/timer";
import {
  validateCategoryInput,
  validateCategoryName,
  validateColor,
  validateTimeEntryInput,
  type TimeEntryInput,
} from "../lib/validation";
import type { ActionResult, AppData, TimeEntry } from "../lib/types";

export type AppDataContextValue = {
  data: AppData;
  ready: boolean;
  /** `"corrupt"` when stored data could not be read, so pages can recover. */
  storageStatus: StorageStatus;
  createCategoryAction: (draft: { name: string; color: string }) => ActionResult;
  renameCategoryAction: (id: string, name: string) => ActionResult;
  recolorCategoryAction: (id: string, color: string) => ActionResult;
  deleteCategoryAction: (id: string) => void;
  createEntryAction: (draft: TimeEntryInput) => ActionResult;
  updateEntryAction: (id: string, draft: TimeEntryInput) => ActionResult;
  deleteEntryAction: (id: string) => void;
  restoreEntryAction: (entry: TimeEntry) => void;
  startTimerAction: (categoryId: string, description?: string) => void;
  stopTimerAction: (description: string) => void;
  replaceDataAction: (data: AppData) => void;
  resetAction: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { data, ready, status } = snapshot;

  const commit = useCallback((updater: (current: AppData) => AppData) => {
    writeData(updater(getSnapshot().data));
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      ready,
      storageStatus: status,

      createCategoryAction(draft) {
        const result = validateCategoryInput(draft);
        if (!result.ok) return result;
        commit((state) => ({
          ...state,
          categories: createCategory(state.categories, result.value, newId("cat")),
        }));
        return { ok: true };
      },

      renameCategoryAction(id, name) {
        const error = validateCategoryName(name);
        if (error) return { ok: false, errors: [error] };
        commit((state) => ({
          ...state,
          categories: renameCategory(state.categories, id, name),
        }));
        return { ok: true };
      },

      recolorCategoryAction(id, color) {
        const error = validateColor(color);
        if (error) return { ok: false, errors: [error] };
        commit((state) => ({
          ...state,
          categories: recolorCategory(state.categories, id, color),
        }));
        return { ok: true };
      },

      deleteCategoryAction(id) {
        commit((state) => {
          const result = deleteCategory(state.categories, state.entries, id);
          const runningTimer =
            state.runningTimer?.categoryId === id ? null : state.runningTimer;
          return {
            ...state,
            categories: result.categories,
            entries: result.entries,
            runningTimer,
          };
        });
      },

      createEntryAction(draft) {
        const result = validateTimeEntryInput(draft);
        if (!result.ok) return result;
        commit((state) => ({
          ...state,
          entries: createEntry(state.entries, result.value, newId("entry")),
        }));
        return { ok: true };
      },

      updateEntryAction(id, draft) {
        const result = validateTimeEntryInput(draft);
        if (!result.ok) return result;
        commit((state) => ({
          ...state,
          entries: updateEntry(state.entries, id, result.value),
        }));
        return { ok: true };
      },

      deleteEntryAction(id) {
        commit((state) => ({ ...state, entries: deleteEntry(state.entries, id) }));
      },

      restoreEntryAction(entry) {
        commit((state) => ({
          ...state,
          entries: restoreEntry(state.entries, entry),
        }));
      },

      startTimerAction(categoryId, description = "") {
        commit((state) => ({
          ...state,
          runningTimer: startTimerWithDescription(
            categoryId,
            defaultClock(),
            description,
          ),
        }));
      },

      stopTimerAction(description) {
        commit((state) => {
          const result = stopTimer(
            state.entries,
            state.runningTimer,
            defaultClock(),
            newId("entry"),
            description,
          );
          return {
            ...state,
            entries: result.entries,
            runningTimer: result.timer,
          };
        });
      },

      replaceDataAction(next) {
        commit(() => next);
      },

      resetAction() {
        commit(() => createDefaultData());
      },
    }),
    [commit, data, ready, status],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
