import { test } from "node:test";
import assert from "node:assert/strict";

import { formatChartDay } from "../lib/datetime";

test("formatChartDay reads weekday-then-day, e.g. \"Thu 22\"", () => {
  // 2024-05-23 is a Thursday; 2024-05-05 is a Sunday with a single-digit day.
  assert.equal(formatChartDay("2024-05-23"), "Thu 23");
  assert.equal(formatChartDay("2024-05-05"), "Sun 5");
  assert.equal(formatChartDay("2026-10-22"), "Thu 22");
});

test("formatChartDay leaves an invalid key untouched", () => {
  assert.equal(formatChartDay("not-a-date"), "not-a-date");
});
