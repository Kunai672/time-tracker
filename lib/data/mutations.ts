/**
 * Optimistic TanStack Query mutation options.
 *
 * Each option object applies its change to the query cache up front
 * (`onMutate`), restores the previous value and reports a toast on failure
 * (`onError`), then invalidates the affected queries so the server remains the
 * source of truth (`onSettled`). Keeping them as plain option builders (no
 * React) means they can be exercised with `MutationObserver` in tests.
 */
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";

import {
  createCategory,
  deleteCategory,
  recolorCategory,
  renameCategory,
} from "../categories";
import {
  createEntry,
  deleteEntry,
  restoreEntry,
  updateEntry,
} from "../entries";
import { newId } from "../ids";
import { startTimerWithDescription, stopTimer } from "../timer";
import type { AppData, Category, RunningTimer, TimeEntry } from "../types";
import { dataKeys, invalidateData } from "./query-keys";
import type {
  CategoryDraft,
  CategoryPatch,
  DataRepository,
  EntryDraft,
  StartTimerInput,
  StopTimerInput,
} from "./types";

export type NotifyError = (message: string) => void;

function readTimer(queryClient: QueryClient): RunningTimer | null {
  return queryClient.getQueryData<RunningTimer | null>(dataKeys.runningTimer) ?? null;
}

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export function createCategoryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  Category,
  Error,
  CategoryDraft,
  { previous: Category[] | undefined }
> {
  return {
    mutationFn: (draft) => repository.createCategory(draft),
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.categories });
      const previous = queryClient.getQueryData<Category[]>(dataKeys.categories);
      queryClient.setQueryData(
        dataKeys.categories,
        createCategory(previous ?? [], draft, newId("cat")),
      );
      return { previous };
    },
    onError: (error, _draft, context) => {
      queryClient.setQueryData(dataKeys.categories, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

export function updateCategoryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  Category,
  Error,
  { id: string; patch: CategoryPatch },
  { previous: Category[] | undefined }
> {
  return {
    mutationFn: ({ id, patch }) => repository.updateCategory(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.categories });
      const previous = queryClient.getQueryData<Category[]>(dataKeys.categories);
      let next = previous ?? [];
      if (patch.name !== undefined) next = renameCategory(next, id, patch.name);
      if (patch.color !== undefined) next = recolorCategory(next, id, patch.color);
      queryClient.setQueryData(dataKeys.categories, next);
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(dataKeys.categories, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

type DeleteCategoryContext = {
  previousCategories: Category[] | undefined;
  previousEntries: TimeEntry[] | undefined;
  previousTimer: RunningTimer | null | undefined;
};

export function deleteCategoryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<void, Error, string, DeleteCategoryContext> {
  return {
    mutationFn: (id) => repository.deleteCategory(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: dataKeys.categories }),
        queryClient.cancelQueries({ queryKey: dataKeys.entries }),
        queryClient.cancelQueries({ queryKey: dataKeys.runningTimer }),
      ]);
      const previousCategories = queryClient.getQueryData<Category[]>(
        dataKeys.categories,
      );
      const previousEntries = queryClient.getQueryData<TimeEntry[]>(
        dataKeys.entries,
      );
      const previousTimer = queryClient.getQueryData<RunningTimer | null>(
        dataKeys.runningTimer,
      );

      const result = deleteCategory(
        previousCategories ?? [],
        previousEntries ?? [],
        id,
      );
      const timer =
        previousTimer && previousTimer.categoryId !== id ? previousTimer : null;

      queryClient.setQueryData(dataKeys.categories, result.categories);
      queryClient.setQueryData(dataKeys.entries, result.entries);
      queryClient.setQueryData(dataKeys.runningTimer, timer);

      return { previousCategories, previousEntries, previousTimer };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(dataKeys.categories, context?.previousCategories);
      queryClient.setQueryData(dataKeys.entries, context?.previousEntries);
      queryClient.setQueryData(dataKeys.runningTimer, context?.previousTimer);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

/* ------------------------------------------------------------------ *
 * Entries
 * ------------------------------------------------------------------ */

export function createEntryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  TimeEntry,
  Error,
  EntryDraft,
  { previous: TimeEntry[] | undefined }
> {
  return {
    mutationFn: (draft) => repository.createEntry(draft),
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.entries });
      const previous = queryClient.getQueryData<TimeEntry[]>(dataKeys.entries);
      queryClient.setQueryData(
        dataKeys.entries,
        createEntry(previous ?? [], draft, newId("entry")),
      );
      return { previous };
    },
    onError: (error, _draft, context) => {
      queryClient.setQueryData(dataKeys.entries, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

export function updateEntryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  TimeEntry,
  Error,
  { id: string; draft: EntryDraft },
  { previous: TimeEntry[] | undefined }
> {
  return {
    mutationFn: ({ id, draft }) => repository.updateEntry(id, draft),
    onMutate: async ({ id, draft }) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.entries });
      const previous = queryClient.getQueryData<TimeEntry[]>(dataKeys.entries);
      queryClient.setQueryData(
        dataKeys.entries,
        updateEntry(previous ?? [], id, draft),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(dataKeys.entries, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

export function deleteEntryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<void, Error, string, { previous: TimeEntry[] | undefined }> {
  return {
    mutationFn: (id) => repository.deleteEntry(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.entries });
      const previous = queryClient.getQueryData<TimeEntry[]>(dataKeys.entries);
      queryClient.setQueryData(
        dataKeys.entries,
        deleteEntry(previous ?? [], id),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(dataKeys.entries, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

export function restoreEntryMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  TimeEntry,
  Error,
  TimeEntry,
  { previous: TimeEntry[] | undefined }
> {
  return {
    mutationFn: (entry) => repository.restoreEntry(entry),
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.entries });
      const previous = queryClient.getQueryData<TimeEntry[]>(dataKeys.entries);
      queryClient.setQueryData(
        dataKeys.entries,
        restoreEntry(previous ?? [], entry),
      );
      return { previous };
    },
    onError: (error, _entry, context) => {
      queryClient.setQueryData(dataKeys.entries, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

/* ------------------------------------------------------------------ *
 * Running timer
 * ------------------------------------------------------------------ */

export function startTimerMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  RunningTimer,
  Error,
  StartTimerInput,
  { previous: RunningTimer | null | undefined }
> {
  return {
    mutationFn: (input) => repository.startTimer(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: dataKeys.runningTimer });
      const previous = queryClient.getQueryData<RunningTimer | null>(
        dataKeys.runningTimer,
      );
      const now = input.startedAt ? new Date(input.startedAt) : new Date();
      queryClient.setQueryData(
        dataKeys.runningTimer,
        startTimerWithDescription(
          input.categoryId,
          now,
          input.description ?? "",
        ),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(dataKeys.runningTimer, context?.previous);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

type StopTimerContext = {
  previousEntries: TimeEntry[] | undefined;
  previousTimer: RunningTimer | null | undefined;
};

export function stopTimerMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<
  TimeEntry | null,
  Error,
  StopTimerInput,
  StopTimerContext
> {
  return {
    mutationFn: (input) => repository.stopTimer(input),
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: dataKeys.entries }),
        queryClient.cancelQueries({ queryKey: dataKeys.runningTimer }),
      ]);
      const previousEntries = queryClient.getQueryData<TimeEntry[]>(
        dataKeys.entries,
      );
      const previousTimer = readTimer(queryClient);

      if (previousTimer) {
        const now = input.end ? new Date(input.end) : new Date();
        const stopped = stopTimer(
          previousEntries ?? [],
          previousTimer,
          now,
          newId("entry"),
          input.description ?? "",
        );
        queryClient.setQueryData(dataKeys.entries, stopped.entries);
        queryClient.setQueryData(dataKeys.runningTimer, null);
      }

      return { previousEntries, previousTimer };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(dataKeys.entries, context?.previousEntries);
      queryClient.setQueryData(dataKeys.runningTimer, context?.previousTimer);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}

/* ------------------------------------------------------------------ *
 * Import / reset
 * ------------------------------------------------------------------ */

type ImportContext = {
  previousCategories: Category[] | undefined;
  previousEntries: TimeEntry[] | undefined;
  previousTimer: RunningTimer | null | undefined;
};

export function importAllMutationOptions(
  repository: DataRepository,
  queryClient: QueryClient,
  notifyError: NotifyError,
): UseMutationOptions<void, Error, AppData, ImportContext> {
  return {
    mutationFn: (data) => repository.importAll(data),
    onMutate: async (data) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: dataKeys.categories }),
        queryClient.cancelQueries({ queryKey: dataKeys.entries }),
        queryClient.cancelQueries({ queryKey: dataKeys.runningTimer }),
      ]);
      const previousCategories = queryClient.getQueryData<Category[]>(
        dataKeys.categories,
      );
      const previousEntries = queryClient.getQueryData<TimeEntry[]>(
        dataKeys.entries,
      );
      const previousTimer = queryClient.getQueryData<RunningTimer | null>(
        dataKeys.runningTimer,
      );

      queryClient.setQueryData(dataKeys.categories, data.categories);
      queryClient.setQueryData(dataKeys.entries, data.entries);
      queryClient.setQueryData(dataKeys.runningTimer, data.runningTimer);

      return { previousCategories, previousEntries, previousTimer };
    },
    onError: (error, _data, context) => {
      queryClient.setQueryData(dataKeys.categories, context?.previousCategories);
      queryClient.setQueryData(dataKeys.entries, context?.previousEntries);
      queryClient.setQueryData(dataKeys.runningTimer, context?.previousTimer);
      notifyError(error.message);
    },
    onSettled: () => invalidateData(queryClient),
  };
}
