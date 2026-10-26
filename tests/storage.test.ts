import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clear,
  createDefaultData,
  getDefaultStorage,
  load,
  migrate,
  save,
  type StorageLike,
} from "../lib/storage";
import { SCHEMA_VERSION, STORAGE_KEY, UNCATEGORIZED_ID } from "../lib/constants";
import type { AppData } from "../lib/types";

function memoryStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key: string) {
      return key === STORAGE_KEY ? this.value : null;
    },
    setItem(key: string, value: string) {
      if (key === STORAGE_KEY) this.value = value;
    },
    removeItem(key: string) {
      if (key === STORAGE_KEY) this.value = null;
    },
  };
}

test("getDefaultStorage does not throw when window is undefined", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(getDefaultStorage(), null);
});

test("load returns defaults when window is undefined", () => {
  const data = load();
  assert.equal(data.version, SCHEMA_VERSION);
  assert.equal(data.entries.length, 0);
  assert.equal(data.runningTimer, null);
  assert.ok(data.categories.some((c) => c.id === UNCATEGORIZED_ID));
});

test("load returns defaults for empty storage", () => {
  const storage = memoryStorage();
  assert.deepEqual(load(storage), createDefaultData());
});

test("load returns defaults for corrupt JSON", () => {
  const storage = memoryStorage("{not valid json");
  assert.deepEqual(load(storage), createDefaultData());
});

test("load returns defaults for non-object JSON", () => {
  assert.deepEqual(load(memoryStorage("[1,2,3]")), createDefaultData());
  assert.deepEqual(load(memoryStorage("42")), createDefaultData());
  assert.deepEqual(load(memoryStorage("null")), createDefaultData());
});

test("load round-trips versioned data written by save", () => {
  const storage = memoryStorage();
  const data: AppData = {
    version: SCHEMA_VERSION,
    categories: [
      { id: UNCATEGORIZED_ID, name: "Uncategorized", color: "#9ca3af" },
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

  save(data, storage);
  assert.deepEqual(load(storage), data);
});

test("a running timer survives a save/load cycle (page reload)", () => {
  const storage = memoryStorage();
  const data: AppData = {
    version: SCHEMA_VERSION,
    categories: [{ id: "work", name: "Work", color: "#4f46e5" }],
    entries: [],
    runningTimer: { categoryId: "work", startedAt: "2024-05-01T09:00:00.000Z" },
  };
  save(data, storage);
  assert.deepEqual(load(storage).runningTimer, data.runningTimer);
});

test("save is a no-op without storage and never throws", () => {
  assert.doesNotThrow(() => save(createDefaultData(), null));
});

test("clear removes persisted data", () => {
  const storage = memoryStorage();
  save(createDefaultData(), storage);
  clear(storage);
  assert.equal(storage.value, null);
});

test("migrate upgrades a legacy unversioned payload", () => {
  const legacy = {
    categories: [{ id: "work", name: "Work", color: "#4f46e5" }],
    entries: [],
  };
  const result = migrate(legacy);
  assert.equal(result.version, SCHEMA_VERSION);
  assert.equal(result.runningTimer, null);
  assert.ok(result.categories.some((c) => c.id === UNCATEGORIZED_ID));
});

test("migrate drops malformed categories and entries", () => {
  const result = migrate({
    version: SCHEMA_VERSION,
    categories: [
      { id: UNCATEGORIZED_ID, name: "Uncategorized", color: "#9ca3af" },
      { id: "", name: "bad", color: "#000000" },
      { id: "noname", name: "   ", color: "#000000" },
      "garbage",
    ],
    entries: [
      {
        id: "e1",
        description: "ok",
        categoryId: "missing",
        start: "2024-05-01T09:00:00.000Z",
        end: "2024-05-01T10:00:00.000Z",
        durationMinutes: 60,
      },
      { id: "e2", description: "bad date", categoryId: "x", start: "nope", end: "nope", durationMinutes: 0 },
      null,
    ],
    runningTimer: null,
  });

  assert.equal(result.categories.length, 1);
  assert.equal(result.entries.length, 1);
  // Entry referencing a now-missing category is reassigned, not orphaned.
  assert.equal(result.entries[0].categoryId, UNCATEGORIZED_ID);
});

test("migrate rejects data from a newer schema version", () => {
  assert.deepEqual(
    migrate({ version: SCHEMA_VERSION + 5, categories: [], entries: [] }),
    createDefaultData(),
  );
});

test("migrate clears a running timer pointing at a missing category", () => {
  const result = migrate({
    version: SCHEMA_VERSION,
    categories: [{ id: UNCATEGORIZED_ID, name: "Uncategorized", color: "#9ca3af" }],
    entries: [],
    runningTimer: { categoryId: "ghost", startedAt: "2024-05-01T09:00:00.000Z" },
  });
  assert.equal(result.runningTimer, null);
});

test("migrate keeps a valid running timer", () => {
  const result = migrate({
    version: SCHEMA_VERSION,
    categories: [{ id: "work", name: "Work", color: "#4f46e5" }],
    entries: [],
    runningTimer: { categoryId: "work", startedAt: "2024-05-01T09:00:00.000Z" },
  });
  assert.deepEqual(result.runningTimer, {
    categoryId: "work",
    startedAt: "2024-05-01T09:00:00.000Z",
  });
});
