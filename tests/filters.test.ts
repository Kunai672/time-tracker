import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALL_CATEGORIES,
  activeFilterChips,
  dateKey,
  filterEntries,
  hasActiveFilters,
} from "../lib/filters";
import type { TimeEntry } from "../lib/types";

function entry(id: string, categoryId: string, start: string): TimeEntry {
  return {
    id,
    description: id,
    categoryId,
    start,
    end: start,
    durationMinutes: 30,
  };
}

const entries: TimeEntry[] = [
  entry("a", "work", "2024-04-30T10:00:00.000Z"),
  entry("b", "work", "2024-05-01T10:00:00.000Z"),
  entry("c", "study", "2024-05-02T10:00:00.000Z"),
  entry("d", "study", "2024-05-03T10:00:00.000Z"),
];

test("dateKey extracts the UTC calendar date", () => {
  assert.equal(dateKey("2024-05-01T23:59:59.000Z"), "2024-05-01");
});

test("filterEntries with no filters returns everything", () => {
  assert.deepEqual(filterEntries(entries).map((e) => e.id), ["a", "b", "c", "d"]);
});

test("from boundary is inclusive", () => {
  assert.deepEqual(
    filterEntries(entries, { from: "2024-05-01" }).map((e) => e.id),
    ["b", "c", "d"],
  );
});

test("to boundary is inclusive", () => {
  assert.deepEqual(
    filterEntries(entries, { to: "2024-05-02" }).map((e) => e.id),
    ["a", "b", "c"],
  );
});

test("from and to together select an inclusive range", () => {
  assert.deepEqual(
    filterEntries(entries, { from: "2024-05-01", to: "2024-05-02" }).map((e) => e.id),
    ["b", "c"],
  );
});

test("a single-day range matches that day", () => {
  assert.deepEqual(
    filterEntries(entries, { from: "2024-05-02", to: "2024-05-02" }).map((e) => e.id),
    ["c"],
  );
});

test("category filter selects one category", () => {
  assert.deepEqual(
    filterEntries(entries, { categoryId: "study" }).map((e) => e.id),
    ["c", "d"],
  );
});

test("the all-categories sentinel disables category filtering", () => {
  assert.equal(filterEntries(entries, { categoryId: ALL_CATEGORIES }).length, 4);
});

test("filters combine category and date range", () => {
  assert.deepEqual(
    filterEntries(entries, {
      categoryId: "study",
      from: "2024-05-03",
    }).map((e) => e.id),
    ["d"],
  );
});

test("a range with no matches returns an empty array", () => {
  assert.deepEqual(
    filterEntries(entries, { from: "2025-01-01", to: "2025-01-31" }),
    [],
  );
});

test("hasActiveFilters ignores the default empty state", () => {
  assert.equal(hasActiveFilters({}, "all"), false);
  assert.equal(hasActiveFilters({ search: "   " }, "all"), false);
  assert.equal(hasActiveFilters({}, "7d"), true);
  assert.equal(hasActiveFilters({ search: "work" }, "all"), true);
  assert.equal(hasActiveFilters({ categoryIds: ["work"] }, "all"), true);
  assert.equal(hasActiveFilters({ from: "2024-05-01" }, "all"), true);
});

test("activeFilterChips summarises date, search and category filters", () => {
  const chips = activeFilterChips(
    { search: "deep", categoryIds: ["work", "study"] },
    "7d",
    [
      { id: "work", name: "Work" },
      { id: "study", name: "Study" },
    ],
  );

  assert.deepEqual(chips, [
    { id: "date", kind: "date", label: "Last 7 days" },
    { id: "search", kind: "search", label: "“deep”" },
    { id: "work", kind: "category", label: "Work" },
    { id: "study", kind: "category", label: "Study" },
  ]);
});

test("activeFilterChips labels explicit bounds as a custom range", () => {
  const chips = activeFilterChips(
    { from: "2024-05-01", to: "2024-05-31" },
    "all",
  );
  assert.deepEqual(chips, [
    { id: "date", kind: "date", label: "Custom range" },
  ]);
});

test("activeFilterChips is empty without filters", () => {
  assert.deepEqual(activeFilterChips({}, "all"), []);
});
