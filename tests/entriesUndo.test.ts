import { test } from "node:test";
import assert from "node:assert/strict";

import { createEntry, deleteEntry, restoreEntry } from "../lib/entries";

const draft = {
  description: "Deep work",
  categoryId: "work",
  start: "2024-05-01T09:00:00.000Z",
  end: "2024-05-01T10:30:00.000Z",
};

test("delete then undo restores the entry", () => {
  const entries = createEntry([], draft, "e1");
  const deleted = deleteEntry(entries, "e1");
  assert.equal(deleted.length, 0);

  const restored = restoreEntry(deleted, entries[0]);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].id, "e1");
  assert.equal(restored[0].description, "Deep work");
  assert.equal(restored[0].durationMinutes, 90);
});

test("restoring an entry twice does not duplicate it", () => {
  const entries = createEntry([], draft, "e1");
  const restored = restoreEntry([], entries[0]);
  assert.equal(restoreEntry(restored, entries[0]).length, 1);
});
