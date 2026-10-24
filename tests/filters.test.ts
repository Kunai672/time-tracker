import { test } from "node:test";
import assert from "node:assert/strict";

import { ALL_CATEGORIES, dateKey, filterEntries } from "../lib/filters";
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
