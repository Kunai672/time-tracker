import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createCategory,
  deleteCategory,
  findCategory,
  isUncategorized,
  recolorCategory,
  renameCategory,
} from "../lib/categories";
import { UNCATEGORIZED_CATEGORY, UNCATEGORIZED_ID } from "../lib/constants";
import type { Category, TimeEntry } from "../lib/types";

const work: Category = { id: "work", name: "Work", color: "#4f46e5" };
const study: Category = { id: "study", name: "Study", color: "#059669" };
const base: Category[] = [{ ...UNCATEGORIZED_CATEGORY }, work, study];

function entry(id: string, categoryId: string): TimeEntry {
  return {
    id,
    description: id,
    categoryId,
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:00:00.000Z",
    durationMinutes: 60,
  };
}

test("createCategory appends a trimmed category", () => {
  const next = createCategory(base, { name: "  Gym  ", color: "#dc2626" }, "gym");
  assert.equal(next.length, base.length + 1);
  assert.deepEqual(next[next.length - 1], {
    id: "gym",
    name: "Gym",
    color: "#dc2626",
  });
  // Original array is untouched.
  assert.equal(base.length, 3);
});

test("renameCategory renames only the target", () => {
  const next = renameCategory(base, "work", "  Day job ");
  assert.equal(findCategory(next, "work")?.name, "Day job");
  assert.equal(findCategory(next, "study")?.name, "Study");
});

test("recolorCategory recolours only the target", () => {
  const next = recolorCategory(base, "work", "#000000");
  assert.equal(findCategory(next, "work")?.color, "#000000");
  assert.equal(findCategory(next, "study")?.color, "#059669");
});

test("deleteCategory reassigns its entries to Uncategorized", () => {
  const entries = [entry("e1", "work"), entry("e2", "study")];
  const result = deleteCategory(base, entries, "work");

  assert.equal(result.categories.some((c) => c.id === "work"), false);
  assert.equal(result.entries.find((e) => e.id === "e1")?.categoryId, UNCATEGORIZED_ID);
  assert.equal(result.entries.find((e) => e.id === "e2")?.categoryId, "study");
  // No orphaned entries remain.
  assert.ok(
    result.entries.every((e) =>
      result.categories.some((c) => c.id === e.categoryId),
    ),
  );
});

test("deleteCategory refuses to delete Uncategorized", () => {
  const entries = [entry("e1", UNCATEGORIZED_ID)];
  const result = deleteCategory(base, entries, UNCATEGORIZED_ID);
  assert.equal(result.categories.length, base.length);
  assert.deepEqual(result.entries, entries);
});

test("isUncategorized identifies the built-in category", () => {
  assert.equal(isUncategorized(UNCATEGORIZED_ID), true);
  assert.equal(isUncategorized("work"), false);
});
