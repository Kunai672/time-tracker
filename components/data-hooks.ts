"use client";

/**
 * TanStack Query hooks over the active `DataRepository`.
 *
 * Queries expose the raw collections. Mutations apply optimistic updates with
 * rollback (see `lib/data/mutations.ts`), surface failures as a toast, and
 * invalidate the affected queries. UI code depends on these hooks (via
 * `useAppData`) rather than on any storage module.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import {
  createCategoryMutationOptions,
  createEntryMutationOptions,
  deleteCategoryMutationOptions,
  deleteEntryMutationOptions,
  importAllMutationOptions,
  restoreEntryMutationOptions,
  startTimerMutationOptions,
  stopTimerMutationOptions,
  updateCategoryMutationOptions,
  updateEntryMutationOptions,
  type NotifyError,
} from "../lib/data/mutations";
import { dataKeys, invalidateData } from "../lib/data/query-keys";
import type { StorageStatus } from "../lib/storage";
import type { Category, RunningTimer, TimeEntry } from "../lib/types";
import { useRepository } from "./DataProvider";

export { dataKeys };

const notifyError: NotifyError = (message) => {
  toast.error(message);
};

export function useCategoriesQuery(): UseQueryResult<Category[]> {
  const repository = useRepository();
  return useQuery({
    queryKey: dataKeys.categories,
    queryFn: () => repository.listCategories(),
  });
}

export function useEntriesQuery(): UseQueryResult<TimeEntry[]> {
  const repository = useRepository();
  return useQuery({
    queryKey: dataKeys.entries,
    queryFn: () => repository.listEntries(),
  });
}

export function useRunningTimerQuery(): UseQueryResult<RunningTimer | null> {
  const repository = useRepository();
  return useQuery({
    queryKey: dataKeys.runningTimer,
    queryFn: () => repository.getRunningTimer(),
  });
}

export function useStorageStatusQuery(): UseQueryResult<StorageStatus> {
  const repository = useRepository();
  return useQuery({
    queryKey: dataKeys.storageStatus,
    queryFn: () => repository.getStorageStatus?.() ?? Promise.resolve("ok"),
  });
}

/** Invalidates every data query after a write. */
export function useInvalidateData(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => invalidateData(queryClient), [queryClient]);
}

export function useCreateCategoryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    createCategoryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useUpdateCategoryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    updateCategoryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useDeleteCategoryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    deleteCategoryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useCreateEntryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    createEntryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useUpdateEntryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    updateEntryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useDeleteEntryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    deleteEntryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useRestoreEntryMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    restoreEntryMutationOptions(repository, queryClient, notifyError),
  );
}

export function useStartTimerMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    startTimerMutationOptions(repository, queryClient, notifyError),
  );
}

export function useStopTimerMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    stopTimerMutationOptions(repository, queryClient, notifyError),
  );
}

export function useImportAllMutation() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  return useMutation(
    importAllMutationOptions(repository, queryClient, notifyError),
  );
}
