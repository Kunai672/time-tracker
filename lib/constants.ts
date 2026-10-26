import {
  CATEGORY_PALETTE_VALUES,
  UNCATEGORIZED_COLOR,
} from "./category-colors";
import type { Category, Settings } from "./types";

/** Bumped whenever the persisted shape changes; migrations handle the rest. */
export const SCHEMA_VERSION = 1;

/** Single key used for all persistence. */
export const STORAGE_KEY = "time-tracker";

/** localStorage key for user preferences (theme lives in next-themes). */
export const SETTINGS_STORAGE_KEY = "time-tracker-settings";

/** Default preferences. */
export const DEFAULT_SETTINGS: Settings = { timeFormat: "24h" };

/** Entries whose category was deleted are reassigned here instead of orphaned. */
export const UNCATEGORIZED_ID = "uncategorized";

export const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_ID,
  name: "Uncategorized",
  color: UNCATEGORIZED_COLOR,
};

/** Default palette offered when creating a category (see category-colors.ts). */
export const CATEGORY_COLORS = CATEGORY_PALETTE_VALUES;
