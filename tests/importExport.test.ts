import { test } from "node:test";
import assert from "node:assert/strict";

import { exportData, importData } from "../lib/importExport";
import { createDefaultData } from "../lib/storage";
import { SCHEMA_VERSION } from "../lib/constants";
import type { AppData } from "../lib/types";

const sample: AppData = {
  version: SCHEMA_VERSION,
  categories: [
    { id: "uncategorized", name: "Uncategorized", color: "#9ca3af" },
    { id: "work", name: "Work", color: "#4f46e5" },
  ],
  entries: [
    {
      id: "e1",
      description: "Standup",
      categoryId: "work",
      start: "2024-05-01T09:00:00.000Z",
      end: "2024-05-01T09:30:00.000Z",
      durationMinutes: 30,
    },
  ],
  runningTimer: null,
};

test("export then import round-trips data", () => {
  const result = importData(exportData(sample));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, sample);
  }
});

test("import rejects an empty string", () => {
  const result = importData("   ");
  assert.equal(result.ok, false);
});

test("import rejects invalid JSON", () => {
  const result = importData("{not json");
  assert.equal(result.ok, false);
});

test("import rejects a non-object payload", () => {
  const result = importData("[]");
  assert.equal(result.ok, false);
});

test("import rejects a missing version", () => {
  const result = importData(JSON.stringify({ categories: [], entries: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /version/i);
});

test("import rejects a newer schema version", () => {
  const result = importData(
    JSON.stringify({ version: SCHEMA_VERSION + 1, categories: [], entries: [] }),
  );
  assert.equal(result.ok, false);
});

test("import rejects malformed categories", () => {
  const result = importData(
    JSON.stringify({
      version: SCHEMA_VERSION,
      categories: [{ id: "work", name: "", color: "#4f46e5" }],
      entries: [],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /categor/i);
});

test("import rejects malformed entries", () => {
  const result = importData(
    JSON.stringify({
      version: SCHEMA_VERSION,
      categories: [],
      entries: [{ id: "e1", description: "x", categoryId: "c", start: "bad", end: "bad", durationMinutes: 1 }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /entr/i);
});

test("import rejects a malformed running timer", () => {
  const result = importData(
    JSON.stringify({
      version: SCHEMA_VERSION,
      categories: [],
      entries: [],
      runningTimer: { categoryId: "x" },
    }),
  );
  assert.equal(result.ok, false);
});

test("importing a malformed file leaves defaults untouched", () => {
  // The function is pure; the caller decides whether to persist. This asserts
  // the failure path returns no data at all.
  const before = createDefaultData();
  const result = importData("garbage");
  assert.equal(result.ok, false);
  assert.equal("data" in result, false);
  assert.deepEqual(createDefaultData(), before);
});
