import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defaultClock,
  elapsedMinutes,
  startTimer,
  startTimerWithDescription,
  stopTimer,
} from "../lib/timer";
import type { RunningTimer } from "../lib/types";

const start = new Date("2024-05-01T09:00:00.000Z");
const end = new Date("2024-05-01T10:15:00.000Z");

test("startTimer captures the injected time", () => {
  assert.deepEqual(startTimer("work", start), {
    categoryId: "work",
    startedAt: "2024-05-01T09:00:00.000Z",
  });
});

test("elapsedMinutes uses the injected now", () => {
  const timer: RunningTimer = { categoryId: "work", startedAt: start.toISOString() };
  assert.equal(elapsedMinutes(timer, end), 75);
});

test("stopTimer creates an entry and clears the timer", () => {
  const timer: RunningTimer = { categoryId: "work", startedAt: start.toISOString() };
  const result = stopTimer([], timer, end, "e1", "Focus");

  assert.equal(result.timer, null);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].id, "e1");
  assert.equal(result.entries[0].description, "Focus");
  assert.equal(result.entries[0].categoryId, "work");
  assert.equal(result.entries[0].durationMinutes, 75);
  assert.deepEqual(result.entry, result.entries[0]);
});

test("stopTimer uses a default description when blank", () => {
  const timer: RunningTimer = { categoryId: "work", startedAt: start.toISOString() };
  const result = stopTimer([], timer, end, "e1", "   ");
  assert.equal(result.entries[0].description, "Tracked time");
});

test("stopTimer with no running timer is a no-op", () => {
  const result = stopTimer([], null, end, "e1");
  assert.equal(result.timer, null);
  assert.deepEqual(result.entries, []);
  assert.equal(result.entry, null);
});

test("defaultClock returns a Date", () => {
  assert.ok(defaultClock() instanceof Date);
});

test("startTimerWithDescription carries a description for Resume", () => {
  assert.deepEqual(startTimerWithDescription("work", start, "Deep work"), {
    categoryId: "work",
    startedAt: "2024-05-01T09:00:00.000Z",
    description: "Deep work",
  });
  // A blank description is omitted so the base shape is unchanged.
  assert.deepEqual(startTimerWithDescription("work", start, "   "), {
    categoryId: "work",
    startedAt: "2024-05-01T09:00:00.000Z",
  });
});

test("stopTimer falls back to the resumed description", () => {
  const timer = startTimerWithDescription("work", start, "Deep work");
  const result = stopTimer([], timer, end, "e1", "");
  assert.equal(result.entries[0].description, "Deep work");
  assert.equal(result.entries[0].durationMinutes, 75);
});
