import { test } from "node:test";
import assert from "node:assert/strict";

import {
  durationMinutesBetween,
  formatDuration,
  minutesToHours,
  toDate,
} from "../lib/duration";
import {
  validateCategoryInput,
  validateCategoryName,
  validateColor,
  validateTimeEntryInput,
} from "../lib/validation";

test("toDate parses valid values and rejects invalid ones", () => {
  assert.ok(toDate("2024-05-01T09:00:00.000Z"));
  assert.equal(toDate("not-a-date"), null);
  assert.equal(toDate(""), null);
});

test("durationMinutesBetween computes whole minutes", () => {
  assert.equal(
    durationMinutesBetween("2024-05-01T09:00:00.000Z", "2024-05-01T10:30:00.000Z"),
    90,
  );
});

test("durationMinutesBetween floors partial minutes", () => {
  assert.equal(
    durationMinutesBetween("2024-05-01T09:00:00.000Z", "2024-05-01T09:01:59.000Z"),
    1,
  );
});

test("durationMinutesBetween never returns a negative value", () => {
  assert.equal(
    durationMinutesBetween("2024-05-01T10:00:00.000Z", "2024-05-01T09:00:00.000Z"),
    0,
  );
});

test("durationMinutesBetween returns 0 for invalid input", () => {
  assert.equal(durationMinutesBetween("nope", "2024-05-01T09:00:00.000Z"), 0);
});

test("formatDuration renders hours and minutes", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(45), "45m");
  assert.equal(formatDuration(60), "1h");
  assert.equal(formatDuration(90), "1h 30m");
  assert.equal(formatDuration(-5), "0m");
});

test("minutesToHours converts and rounds", () => {
  assert.equal(minutesToHours(30), 0.5);
  assert.equal(minutesToHours(20), 0.33);
  assert.equal(minutesToHours(-1), 0);
});

test("validateCategoryName rejects empty and whitespace names", () => {
  assert.ok(validateCategoryName(""));
  assert.ok(validateCategoryName("   "));
  assert.equal(validateCategoryName("Work"), null);
});

test("validateCategoryName rejects overly long names", () => {
  assert.ok(validateCategoryName("x".repeat(61)));
  assert.equal(validateCategoryName("x".repeat(60)), null);
});

test("validateColor requires a 6 digit hex colour", () => {
  assert.equal(validateColor("#4f46e5"), null);
  assert.ok(validateColor("blue"));
  assert.ok(validateColor("#fff"));
  assert.ok(validateColor(""));
});

test("validateCategoryInput trims and returns a typed value", () => {
  const result = validateCategoryInput({ name: "  Work  ", color: "#4f46e5" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, { name: "Work", color: "#4f46e5" });
  }
});

test("validateCategoryInput reports all errors", () => {
  const result = validateCategoryInput({ name: "", color: "nope" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.length, 2);
  }
});

test("validateTimeEntryInput rejects an end before the start", () => {
  const result = validateTimeEntryInput({
    description: "Backwards",
    categoryId: "work",
    start: "2024-05-01T10:00:00.000Z",
    end: "2024-05-01T09:00:00.000Z",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /before start/i);
  }
});

test("validateTimeEntryInput accepts a valid entry", () => {
  const result = validateTimeEntryInput({
    description: "  Deep work ",
    categoryId: "work",
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:30:00.000Z",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.description, "Deep work");
    assert.equal(result.value.start, "2024-05-01T09:00:00.000Z");
    assert.equal(result.value.end, "2024-05-01T10:30:00.000Z");
  }
});

test("validateTimeEntryInput requires a description and category", () => {
  const result = validateTimeEntryInput({
    description: "   ",
    categoryId: "",
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:00:00.000Z",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.length, 2);
  }
});

test("validateTimeEntryInput rejects invalid timestamps", () => {
  const result = validateTimeEntryInput({
    description: "x",
    categoryId: "work",
    start: "nope",
    end: "also-nope",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.length, 2);
  }
});
