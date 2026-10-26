"use client";

/**
 * Domain-facing data provider.
 *
 * It composes the TanStack Query hooks in `data-hooks.ts` into the single
 * `useAppData()` surface the UI already uses: the current `AppData`, a
 * `ready` flag for skeletons, an error surface, and the action functions.
 * Validation stays synchronous so forms keep their immediate feedback; the
 * actual writes go through the active repository.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { createDefaultData } from "../lib/storage";
import { SCHEMA_VERSION } from "../lib/constants";
import {
  validateCategoryInput,
  validateCategoryName,
  validateColor,
  validateTimeEntryInput,
  type TimeEntryInput,
} from "../lib/validation";
import type { ActionResult, AppData, TimeEntry } from "../lib/types";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateEntryMutation,
  useDeleteCategoryMutation,
  useDeleteEntryMutation,
  useEntriesQuery,
  useImportAllMutation,
  useRestoreEntryMutation,
  useRunningTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
  useStorageStatusQuery,
  useUpdateCategoryMutation,
  useUpdateEntryMutation,
} from "./data-hooks";

export type AppDataContextValue = {
  data: AppData;
  ready: boolean;
  /** `"corrupt"` when stored data could not be read, so pages can recover. */
  storageStatus: "ok" | "empty" | "corrupt";
  /** First query error, so the shell can show a retry state. */
  error: Error | null;
  refetchAll: () => void;
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
  const categoriesQuery = useCategoriesQuery();
  const entriesQuery = useEntriesQuery();
  const timerQuery = useRunningTimerQuery();
  const statusQuery = useStorageStatusQuery();

  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createEntryMutation = useCreateEntryMutation();
  const updateEntryMutation = useUpdateEntryMutation();
  const deleteEntryMutation = useDeleteEntryMutation();
  const restoreEntryMutation = useRestoreEntryMutation();
  const startTimerMutation = useStartTimerMutation();
  const stopTimerMutation = useStopTimerMutation();
  const importAllMutation = useImportAllMutation();

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const runningTimer = timerQuery.data ?? null;
  const ready =
    categoriesQuery.isSuccess &&
    entriesQuery.isSuccess &&
    timerQuery.isSuccess;

  const data = useMemo<AppData>(
    () => ({ version: SCHEMA_VERSION, categories, entries, runningTimer }),
    [categories, entries, runningTimer],
  );

  const error =
    categoriesQuery.error ??
    entriesQuery.error ??
    timerQuery.error ??
    statusQuery.error ??
    null;

  const refetchAll = useCallback(() => {
    void categoriesQuery.refetch();
    void entriesQuery.refetch();
    void timerQuery.refetch();
    void statusQuery.refetch();
  }, [categoriesQuery, entriesQuery, timerQuery, statusQuery]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      ready,
      storageStatus: statusQuery.data ?? "ok",
      error,
      refetchAll,

      createCategoryAction(draft) {
        const result = validateCategoryInput(draft);
        if (!result.ok) return result;
        createCategoryMutation.mutate(result.value);
        return { ok: true };
      },

      renameCategoryAction(id, name) {
        const errorMessage = validateCategoryName(name);
        if (errorMessage) return { ok: false, errors: [errorMessage] };
        updateCategoryMutation.mutate({ id, patch: { name } });
        return { ok: true };
      },

      recolorCategoryAction(id, color) {
        const errorMessage = validateColor(color);
        if (errorMessage) return { ok: false, errors: [errorMessage] };
        updateCategoryMutation.mutate({ id, patch: { color } });
        return { ok: true };
      },

      deleteCategoryAction(id) {
        deleteCategoryMutation.mutate(id);
      },

      createEntryAction(draft) {
        const result = validateTimeEntryInput(draft);
        if (!result.ok) return result;
        createEntryMutation.mutate(result.value);
        return { ok: true };
      },

      updateEntryAction(id, draft) {
        const result = validateTimeEntryInput(draft);
        if (!result.ok) return result;
        updateEntryMutation.mutate({ id, draft: result.value });
        return { ok: true };
      },

      deleteEntryAction(id) {
        deleteEntryMutation.mutate(id);
      },

      restoreEntryAction(entry) {
        restoreEntryMutation.mutate(entry);
      },

      startTimerAction(categoryId, description = "") {
        startTimerMutation.mutate({ categoryId, description });
      },

      stopTimerAction(description) {
        stopTimerMutation.mutate({ description });
      },

      replaceDataAction(next) {
        importAllMutation.mutate(next);
      },

      resetAction() {
        importAllMutation.mutate(createDefaultData());
      },
    }),
    [
      data,
      ready,
      statusQuery.data,
      error,
      refetchAll,
      createCategoryMutation,
      updateCategoryMutation,
      deleteCategoryMutation,
      createEntryMutation,
      updateEntryMutation,
      deleteEntryMutation,
      restoreEntryMutation,
      startTimerMutation,
      stopTimerMutation,
      importAllMutation,
    ],
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
