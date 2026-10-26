import type { QueryClient } from "@tanstack/react-query";

/** Central query keys so queries and mutation invalidation never drift. */
export const dataKeys = {
  categories: ["categories"] as const,
  entries: ["entries"] as const,
  runningTimer: ["running-timer"] as const,
  storageStatus: ["storage-status"] as const,
};

/** Marks every data query stale after a write. */
export function invalidateData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: dataKeys.categories });
  void queryClient.invalidateQueries({ queryKey: dataKeys.entries });
  void queryClient.invalidateQueries({ queryKey: dataKeys.runningTimer });
  void queryClient.invalidateQueries({ queryKey: dataKeys.storageStatus });
}
