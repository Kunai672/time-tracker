/**
 * Pure entry filtering. Dates are compared as UTC `YYYY-MM-DD` keys derived
 * from the stored ISO timestamps; both `from` and `to` are inclusive.
 */
import type { TimeEntry } from "./types";

export const ALL_CATEGORIES = "all" as const;

export type EntryFilters = {
  /** `"all"`, `undefined`, or a category id. */
  categoryId?: string;
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  to?: string;
};

/** Extracts the UTC calendar date from an ISO timestamp. */
export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterEntries(
  entries: TimeEntry[],
  filters: EntryFilters = {},
): TimeEntry[] {
  const { categoryId, from, to } = filters;

  return entries.filter((entry) => {
    if (categoryId && categoryId !== ALL_CATEGORIES && entry.categoryId !== categoryId) {
      return false;
    }

    const key = dateKey(entry.start);
    if (from && key < from) return false;
    if (to && key > to) return false;

    return true;
  });
}
