/**
 * Pure helpers behind the theme toggle. Kept free of React and `next-themes`
 * so the "which class should the document have?" decision can be unit tested
 * without a DOM.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = [
  "light",
  "dark",
  "system",
] as const;

/** Resolves a user choice, falling back to the OS preference for "system". */
export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice === "dark" ? "dark" : "light";
}

/** The class token `next-themes` toggles on `<html>`. */
export const DARK_CLASS = "dark";

/** Minimal surface of `DOMTokenList` needed to apply the theme class. */
export type ClassListLike = {
  add(token: string): void;
  remove(token: string): void;
};

/**
 * Applies the resolved theme to a class list: adds `dark` for dark mode and
 * removes it otherwise. This mirrors what `next-themes` does on `<html>`.
 */
export function applyThemeClass(
  classList: ClassListLike,
  resolved: ResolvedTheme,
): void {
  if (resolved === "dark") {
    classList.add(DARK_CLASS);
  } else {
    classList.remove(DARK_CLASS);
  }
}
