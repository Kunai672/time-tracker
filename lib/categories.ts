/**
 * Pure category CRUD. All functions take and return new arrays; nothing is
 * mutated and nothing touches storage or the DOM.
 */
import { UNCATEGORIZED_ID } from "./constants";
import type { Category, TimeEntry } from "./types";

export type CategoryDraft = {
  name: string;
  color: string;
};

export function findCategory(
  categories: Category[],
  id: string,
): Category | undefined {
  return categories.find((category) => category.id === id);
}

export function isUncategorized(id: string): boolean {
  return id === UNCATEGORIZED_ID;
}

/** Adds a category. `id` is injected so tests and callers control identity. */
export function createCategory(
  categories: Category[],
  draft: CategoryDraft,
  id: string,
): Category[] {
  const category: Category = {
    id,
    name: draft.name.trim(),
    color: draft.color.trim(),
  };
  return [...categories, category];
}

export function renameCategory(
  categories: Category[],
  id: string,
  name: string,
): Category[] {
  return categories.map((category) =>
    category.id === id ? { ...category, name: name.trim() } : category,
  );
}

export function recolorCategory(
  categories: Category[],
  id: string,
  color: string,
): Category[] {
  return categories.map((category) =>
    category.id === id ? { ...category, color: color.trim() } : category,
  );
}

export type DeleteCategoryResult = {
  categories: Category[];
  entries: TimeEntry[];
};

/**
 * Deletes a category and reassigns its entries to "Uncategorized" instead of
 * orphaning them. The built-in Uncategorized category cannot be deleted.
 */
export function deleteCategory(
  categories: Category[],
  entries: TimeEntry[],
  id: string,
): DeleteCategoryResult {
  if (isUncategorized(id)) {
    return { categories, entries };
  }

  return {
    categories: categories.filter((category) => category.id !== id),
    entries: entries.map((entry) =>
      entry.categoryId === id
        ? { ...entry, categoryId: UNCATEGORIZED_ID }
        : entry,
    ),
  };
}
