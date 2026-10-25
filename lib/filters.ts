/**
 * Pure entry filtering. Dates are compared as UTC `YYYY-MM-DD` keys derived
 * from the stored ISO timestamps; both `from` and `to` are inclusive.
 */
import type { TimeEntry } from "./types";

export const ALL_CATEGORIES = "all" as const;

export type EntryFilters = {
  /** `"all"`, `undefined`, or a category id. */
  categoryId?: string;
  /** Multiple category ids; when non-empty these take precedence. */
  categoryIds?: string[];
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  to?: string;
  /** Case-insensitive substring match against the description. */
  search?: string;
};

export type DateRangePreset = "today" | "7d" | "30d" | "month" | "all";

export const DATE_RANGE_PRESETS: readonly {
  value: DateRangePreset;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
] as const;

function utcKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Turns a preset into concrete inclusive `YYYY-MM-DD` bounds, evaluated in
 * UTC so it lines up with `filterEntries`' date keys. `"all"` removes bounds.
 */
export function presetRange(
  preset: DateRangePreset,
  now: Date = new Date(),
): { from?: string; to?: string } {
  const today = utcKey(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: utcKey(addUtcDays(now, -6)), to: today };
    case "30d":
      return { from: utcKey(addUtcDays(now, -29)), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "all":
    default:
      return {};
  }
}

/** Extracts the UTC calendar date from an ISO timestamp. */
export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterEntries(
  entries: TimeEntry[],
  filters: EntryFilters = {},
): TimeEntry[] {
  const { categoryId, categoryIds, from, to, search } = filters;

  return entries.filter((entry) => {
    if (categoryId && categoryId !== ALL_CATEGORIES && entry.categoryId !== categoryId) {
      return false;
    }

    if (categoryIds && categoryIds.length > 0) {
      if (!categoryIds.includes(entry.categoryId)) return false;
    }

    if (search && search.trim().length > 0) {
      if (!entry.description.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
    }

    const key = dateKey(entry.start);
    if (from && key < from) return false;
    if (to && key > to) return false;

    return true;
  });
}

/** A removable summary of one active filter, shown as a chip. */
export type FilterChip = {
  /** Unique per chip: `"date"`, `"search"` or a category id. */
  id: string;
  kind: "date" | "search" | "category";
  label: string;
};

/** Whether any filter (including a non-default date preset) is applied. */
export function hasActiveFilters(
  filters: EntryFilters,
  preset: DateRangePreset,
): boolean {
  return (
    preset !== "all" ||
    Boolean(filters.search?.trim()) ||
    Boolean(filters.categoryId && filters.categoryId !== ALL_CATEGORIES) ||
    (filters.categoryIds?.length ?? 0) > 0 ||
    Boolean(filters.from || filters.to)
  );
}

/**
 * Turns the active filters into removable chips. Category chips resolve their
 * label from `categories`; a date chip uses the preset label, or
 * "Custom range" when only explicit bounds are set.
 */
export function activeFilterChips(
  filters: EntryFilters,
  preset: DateRangePreset,
  categories: readonly { id: string; name: string }[] = [],
): FilterChip[] {
  const chips: FilterChip[] = [];

  const presetLabel = DATE_RANGE_PRESETS.find(
    (item) => item.value === preset,
  )?.label;
  if (preset !== "all" && presetLabel) {
    chips.push({ id: "date", kind: "date", label: presetLabel });
  } else if (filters.from || filters.to) {
    chips.push({ id: "date", kind: "date", label: "Custom range" });
  }

  const search = filters.search?.trim();
  if (search) {
    chips.push({ id: "search", kind: "search", label: `“${search}”` });
  }

  const categoryIds =
    filters.categoryIds ??
    (filters.categoryId && filters.categoryId !== ALL_CATEGORIES
      ? [filters.categoryId]
      : []);
  for (const id of categoryIds) {
    chips.push({
      id,
      kind: "category",
      label: categories.find((category) => category.id === id)?.name ?? "Uncategorized",
    });
  }

  return chips;
}
