import { test } from "node:test";
import assert from "node:assert/strict";

import { categoryPercentages, chartRangeDays } from "../lib/chart-data";
import type { CategoryTotal } from "../lib/aggregate";

function total(
  categoryId: string,
  minutes: number,
  name = categoryId,
): CategoryTotal {
  return {
    categoryId,
    name,
    color: "#4f46e5",
    minutes,
    hours: Math.round((minutes / 60) * 100) / 100,
  };
}

test("percentages are empty without data", () => {
  assert.deepEqual(categoryPercentages([]), []);
  assert.deepEqual(categoryPercentages([total("work", 0)]), []);
});

test("legend percentages always sum to 100", () => {
  const slices = categoryPercentages([
    total("a", 1),
    total("b", 1),
    total("c", 1),
  ]);
  assert.equal(slices.length, 3);
  const sum = slices.reduce((acc, slice) => acc + slice.percent, 0);
  assert.equal(sum, 100);
  // No slice should be off by more than one rounding unit.
  for (const slice of slices) {
    assert.ok(slice.percent >= 33 && slice.percent <= 34);
  }
});

test("percentages reflect the underlying proportions", () => {
  const slices = categoryPercentages([
    total("work", 60),
    total("study", 30),
    total("play", 10),
  ]);
  assert.deepEqual(
    slices.map((slice) => slice.percent),
    [60, 30, 10],
  );
});

test("chartRangeDays returns inclusive local day keys ending today", () => {
  const now = new Date(2024, 4, 22, 15, 30, 0); // Wed May 22 2024, local

  const week = chartRangeDays("7d", now);
  assert.equal(week.length, 7);
  assert.equal(week[0], "2024-05-16");
  assert.equal(week[6], "2024-05-22");

  const month = chartRangeDays("30d", now);
  assert.equal(month.length, 30);
  assert.equal(month[29], "2024-05-22");

  const thisMonth = chartRangeDays("month", now);
  assert.equal(thisMonth[0], "2024-05-01");
  assert.equal(thisMonth[thisMonth.length - 1], "2024-05-22");
});
