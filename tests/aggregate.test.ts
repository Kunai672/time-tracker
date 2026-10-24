import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggregateByCategory,
  aggregateByDay,
  fullRange,
  totalMinutes,
} from "../lib/aggregate";
import { UNCATEGORIZED_CATEGORY } from "../lib/constants";
import type { Category, TimeEntry } from "../lib/types";

const categories: Category[] = [
  { ...UNCATEGORIZED_CATEGORY },
  { id: "work", name: "Work", color: "#4f46e5" },
  { id: "study", name: "Study", color: "#059669" },
];

function entry(
  id: string,
  categoryId: string,
  start: string,
  durationMinutes: number,
): TimeEntry {
  return { id, description: id, categoryId, start, end: start, durationMinutes };
}

const entries: TimeEntry[] = [
  entry("a", "work", "2024-05-01T09:00:00.000Z", 60),
  entry("b", "work", "2024-05-01T14:00:00.000Z", 30),
  entry("c", "study", "2024-05-02T09:00:00.000Z", 45),
];

test("aggregateByDay sums per day ascending", () => {
  assert.deepEqual(aggregateByDay(entries), [
    { date: "2024-05-01", minutes: 90, hours: 1.5 },
    { date: "2024-05-02", minutes: 45, hours: 0.75 },
  ]);
});

test("aggregateByDay returns an empty array with no entries", () => {
  assert.deepEqual(aggregateByDay([]), []);
});

test("aggregateByCategory sums per category, descending", () => {
  assert.deepEqual(aggregateByCategory(entries, categories), [
    { categoryId: "work", name: "Work", color: "#4f46e5", minutes: 90, hours: 1.5 },
    { categoryId: "study", name: "Study", color: "#059669", minutes: 45, hours: 0.75 },
  ]);
});

test("aggregateByCategory omits zero-minute categories", () => {
  assert.deepEqual(aggregateByCategory([], categories), []);
});

test("aggregateByCategory labels unknown categories as Uncategorized", () => {
  const result = aggregateByCategory(
    [entry("x", "ghost", "2024-05-01T09:00:00.000Z", 15)],
    categories,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Uncategorized");
});

test("totalMinutes sums every entry", () => {
  assert.equal(totalMinutes(entries), 135);
  assert.equal(totalMinutes([]), 0);
});

test("fullRange spans the earliest and latest entry dates", () => {
  assert.deepEqual(fullRange(entries), { from: "2024-05-01", to: "2024-05-02" });
  assert.deepEqual(fullRange([]), {});
});
