import { test } from "node:test";
import assert from "node:assert/strict";

import { countEntriesForCategory, deleteCategoryMessage } from "../lib/categories";
import { SETTINGS_STORAGE_KEY } from "../lib/constants";
import { formatTime } from "../lib/datetime";
import { loadSettings, saveSettings, type StorageLike } from "../lib/storage";
import type { TimeEntry } from "../lib/types";

function entry(id: string, categoryId: string): TimeEntry {
  return {
    id,
    description: id,
    categoryId,
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:00:00.000Z",
    durationMinutes: 60,
  };
}

test("the 12/24h setting changes the time display", () => {
  const iso = new Date(2024, 4, 1, 13, 5).toISOString();

  assert.equal(formatTime(iso, false), "13:05");
  assert.equal(formatTime(iso, true), "1:05 PM");
  assert.notEqual(formatTime(iso, false), formatTime(iso, true));
});

test("the delete dialog reports how many entries will move", () => {
  const entries = [
    entry("a", "work"),
    entry("b", "work"),
    entry("c", "work"),
    entry("d", "study"),
  ];

  assert.equal(countEntriesForCategory(entries, "work"), 3);
  assert.equal(countEntriesForCategory(entries, "missing"), 0);
  assert.match(deleteCategoryMessage(3), /3 entries will move to Uncategorized\./);
  assert.match(deleteCategoryMessage(1), /1 entry will move to Uncategorized\./);
  assert.match(deleteCategoryMessage(0), /0 entries will move to Uncategorized\./);
});

test("time format setting round-trips through storage", () => {
  const map = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };

  assert.deepEqual(loadSettings(storage), { timeFormat: "24h" });
  saveSettings({ timeFormat: "12h" }, storage);
  assert.deepEqual(loadSettings(storage), { timeFormat: "12h" });

  storage.setItem(SETTINGS_STORAGE_KEY, "{not valid json");
  assert.deepEqual(loadSettings(storage), { timeFormat: "24h" });
});
