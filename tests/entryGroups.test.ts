import { test } from "node:test";
import assert from "node:assert/strict";

import { groupEntriesByDay } from "../lib/entryGroups";
import type { TimeEntry } from "../lib/types";

function entry(id: string, start: string, minutes: number): TimeEntry {
  return {
    id,
    description: id,
    categoryId: "work",
    start,
    end: start,
    durationMinutes: minutes,
  };
}

test("entries are grouped by day with a daily total", () => {
  const groups = groupEntriesByDay([
    entry("a", "2024-05-01T09:00:00.000Z", 60),
    entry("b", "2024-05-02T09:00:00.000Z", 45),
    entry("c", "2024-05-01T14:00:00.000Z", 30),
  ]);

  assert.equal(groups.length, 2);
  // Newest day first.
  assert.equal(groups[0].date, "2024-05-02");
  assert.equal(groups[0].totalMinutes, 45);
  assert.equal(groups[1].date, "2024-05-01");
  assert.equal(groups[1].totalMinutes, 90);
  // Within a day, newest first.
  assert.deepEqual(
    groups[1].entries.map((item) => item.id),
    ["c", "a"],
  );
});

test("grouping an empty list yields no groups", () => {
  assert.deepEqual(groupEntriesByDay([]), []);
});
