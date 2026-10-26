/**
 * The fixed category palette.
 *
 * Ten hues chosen to stay distinguishable against both the light and dark
 * surfaces. The values are plain hex strings because a category stores its
 * colour as data; components never hard-code colours themselves, they read
 * this palette (or the category's persisted colour, which is picked from it).
 */
export type CategoryPaletteColor = {
  /** Human-readable name shown in the palette picker. */
  name: string;
  /** Mid-tone hex value that keeps enough contrast on light and dark. */
  value: string;
};

export const CATEGORY_PALETTE: readonly CategoryPaletteColor[] = [
  { name: "Indigo", value: "#4f46e5" },
  { name: "Teal", value: "#0d9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Amber", value: "#d97706" },
  { name: "Red", value: "#dc2626" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Lime", value: "#65a30d" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Orange", value: "#ea580c" },
] as const;

/** The palette values, in order. */
export const CATEGORY_PALETTE_VALUES: readonly string[] = CATEGORY_PALETTE.map(
  (color) => color.value,
);

/** Colour used for the built-in "Uncategorized" bucket. */
export const UNCATEGORIZED_COLOR = "#9ca3af";

/** Returns the palette entry matching a hex value, if any. */
export function paletteColor(value: string): CategoryPaletteColor | undefined {
  const normalized = value.trim().toLowerCase();
  return CATEGORY_PALETTE.find(
    (color) => color.value.toLowerCase() === normalized,
  );
}
