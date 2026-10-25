import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createEntry,
  deleteEntry,
  duplicateEntry,
  findEntry,
  sortEntriesNewestFirst,
  updateEntry,
} from "../lib/entries";
import type { TimeEntry } from "../lib/types";

const draft = {
  description: "  Deep work ",
  categoryId: "work",
  start: "2024-05-01T09:00:00.000Z",
  end: "2024-05-01T10:30:00.000Z",
};

test("createEntry appends an entry with a computed duration", () => {
  const next = createEntry([], draft, "e1");
  assert.equal(next.length, 1);
  assert.deepEqual(next[0], {
    id: "e1",
    description: "Deep work",
    categoryId: "work",
    start: draft.start,
    end: draft.end,
    durationMinutes: 90,
  });
});

test("updateEntry replaces fields and recomputes duration", () => {
  const existing = createEntry([], draft, "e1");
  const next = updateEntry(existing, "e1", {
    ...draft,
    end: "2024-05-01T12:00:00.000Z",
  });
  assert.equal(next[0].id, "e1");
  assert.equal(next[0].durationMinutes, 180);
  // Other entries are untouched.
  const other = [...existing, { ...existing[0], id: "e2", durationMinutes: 1 }];
  assert.equal(updateEntry(other, "e1", draft).length, 2);
});

test("deleteEntry removes only the target", () => {
  const entries = createEntry(createEntry([], draft, "e1"), draft, "e2");
  const next = deleteEntry(entries, "e1");
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "e2");
});

test("findEntry returns the matching entry", () => {
  const entries = createEntry([], draft, "e1");
  assert.equal(findEntry(entries, "e1")?.id, "e1");
  assert.equal(findEntry(entries, "missing"), undefined);
});

test("sortEntriesNewestFirst orders by most recent start", () => {
  const entries: TimeEntry[] = [
    { ...draft, id: "old", durationMinutes: 60, start: "2024-05-01T08:00:00.000Z", end: "2024-05-01T09:00:00.000Z" },
    { ...draft, id: "new", durationMinutes: 60, start: "2024-05-03T08:00:00.000Z", end: "2024-05-03T09:00:00.000Z" },
    { ...draft, id: "mid", durationMinutes: 60, start: "2024-05-02T08:00:00.000Z", end: "2024-05-02T09:00:00.000Z" },
  ];
  assert.deepEqual(
    sortEntriesNewestFirst(entries).map((e) => e.id),
    ["new", "mid", "old"],
  );
  // Input order is not mutated.
  assert.equal(entries[0].id, "old");
});

test("sortEntriesNewestFirst breaks ties deterministically", () => {
  const entries: TimeEntry[] = [
    { ...draft, id: "b", durationMinutes: 60, start: "2024-05-01T09:00:00.000Z", end: "2024-05-01T10:00:00.000Z" },
    { ...draft, id: "a", durationMinutes: 60, start: "2024-05-01T09:00:00.000Z", end: "2024-05-01T10:00:00.000Z" },
  ];
  assert.deepEqual(
    sortEntriesNewestFirst(entries).map((e) => e.id),
    ["a", "b"],
  );
});

test("duplicateEntry copies every field under a new id", () => {
  const original = createEntry([], draft, "e1")[0];
  const withCopy = duplicateEntry([original], original, "e2");

  assert.equal(withCopy.length, 2);
  const copy = findEntry(withCopy, "e2");
  assert.ok(copy);
  assert.equal(copy.description, original.description);
  assert.equal(copy.categoryId, original.categoryId);
  assert.equal(copy.start, original.start);
  assert.equal(copy.end, original.end);
  assert.equal(copy.durationMinutes, original.durationMinutes);
  // The source row is untouched.
  assert.deepEqual(findEntry(withCopy, "e1"), original);
});
