import type { Category } from "./types";

/** Bumped whenever the persisted shape changes; migrations handle the rest. */
export const SCHEMA_VERSION = 1;

/** Single key used for all persistence. */
export const STORAGE_KEY = "time-tracker";

/** Entries whose category was deleted are reassigned here instead of orphaned. */
export const UNCATEGORIZED_ID = "uncategorized";

export const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_ID,
  name: "Uncategorized",
  color: "#9ca3af",
};

/** Default palette offered when creating a category. */
export const CATEGORY_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#65a30d",
] as const;
