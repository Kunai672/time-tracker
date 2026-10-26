/**
 * Exercises the optimistic mutation options without React, using TanStack
 * Query's `MutationObserver`. Covers rollback on failure, undo, and the timer
 * start/stop path through the fake Supabase repository.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { MutationObserver, QueryClient } from "@tanstack/react-query";

import { UNCATEGORIZED_ID } from "../lib/constants";
import { createMemoryRepository } from "../lib/data/memory-repository";
import {
  createEntryMutationOptions,
  deleteCategoryMutationOptions,
  deleteEntryMutationOptions,
  restoreEntryMutationOptions,
  startTimerMutationOptions,
  stopTimerMutationOptions,
} from "../lib/data/mutations";
import { dataKeys } from "../lib/data/query-keys";
import { createSupabaseRepository } from "../lib/data/supabase-repository";
import type { DataRepository } from "../lib/data/types";
import type { Category, RunningTimer, TimeEntry } from "../lib/types";
import { createFakeSupabaseClient } from "./fake-supabase";

const draft = {
  description: "Deep work",
  categoryId: UNCATEGORIZED_ID,
  start: "2024-05-01T09:00:00.000Z",
  end: "2024-05-01T10:30:00.000Z",
};

test("a failed create rolls the optimistic entry back and reports the error", async () => {
  const base = createMemoryRepository();
  const repository: DataRepository = {
    ...base,
    createEntry: async () => {
      throw new Error("network down");
    },
  };
  const client = new QueryClient();
  client.setQueryData(dataKeys.entries, [] as TimeEntry[]);

  const errors: string[] = [];
  const observer = new MutationObserver(
    client,
    createEntryMutationOptions(repository, client, (message) => errors.push(message)),
  );

  await assert.rejects(() => observer.mutate(draft));

  assert.equal(observer.getCurrentResult().isError, true);
  assert.deepEqual(client.getQueryData(dataKeys.entries), []);
  assert.deepEqual(errors, ["network down"]);
});

test("undo restores a deleted entry with the same id", async () => {
  const repository = createMemoryRepository();
  const created = await repository.createEntry(draft);
  const client = new QueryClient();
  client.setQueryData(dataKeys.entries, [created]);

  const deleteObserver = new MutationObserver(
    client,
    deleteEntryMutationOptions(repository, client, () => {}),
  );
  await deleteObserver.mutate(created.id);
  assert.deepEqual(client.getQueryData(dataKeys.entries), []);

  const restoreObserver = new MutationObserver(
    client,
    restoreEntryMutationOptions(repository, client, () => {}),
  );
  await restoreObserver.mutate(created);

  const entries = client.getQueryData<TimeEntry[]>(dataKeys.entries) ?? [];
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, created.id);
});

test("a failed category delete rolls categories, entries and timer back", async () => {
  const base = createMemoryRepository();
  const category = await base.createCategory({ name: "Work", color: "#4f46e5" });
  const entry = await base.createEntry({ ...draft, categoryId: category.id });

  const repository: DataRepository = {
    ...base,
    deleteCategory: async () => {
      throw new Error("nope");
    },
  };
  const client = new QueryClient();
  client.setQueryData(dataKeys.categories, await base.listCategories());
  client.setQueryData(dataKeys.entries, [entry]);
  client.setQueryData(dataKeys.runningTimer, null);

  const errors: string[] = [];
  const observer = new MutationObserver(
    client,
    deleteCategoryMutationOptions(repository, client, (message) => errors.push(message)),
  );

  await assert.rejects(() => observer.mutate(category.id));

  const categories = client.getQueryData<Category[]>(dataKeys.categories) ?? [];
  assert.ok(categories.some((candidate) => candidate.id === category.id));
  const entries = client.getQueryData<TimeEntry[]>(dataKeys.entries) ?? [];
  assert.equal(entries[0].categoryId, category.id);
  assert.deepEqual(errors, ["nope"]);
});

test("timer start/stop through the fake Supabase repository", async () => {
  const repository = createSupabaseRepository(createFakeSupabaseClient());
  const category = await repository.createCategory({
    name: "Work",
    color: "#4f46e5",
  });
  const client = new QueryClient();
  client.setQueryData(dataKeys.entries, [] as TimeEntry[]);
  client.setQueryData(dataKeys.runningTimer, null);

  const startObserver = new MutationObserver(
    client,
    startTimerMutationOptions(repository, client, () => {}),
  );
  await startObserver.mutate({
    categoryId: category.id,
    description: "Focus",
    startedAt: "2024-05-01T09:00:00.000Z",
  });

  const timer = client.getQueryData<RunningTimer | null>(dataKeys.runningTimer);
  assert.equal(timer?.categoryId, category.id);
  assert.equal(timer?.description, "Focus");

  const stopObserver = new MutationObserver(
    client,
    stopTimerMutationOptions(repository, client, () => {}),
  );
  await stopObserver.mutate({ end: "2024-05-01T10:00:00.000Z" });

  const entries = client.getQueryData<TimeEntry[]>(dataKeys.entries) ?? [];
  assert.equal(entries.length, 1);
  assert.equal(entries[0].description, "Focus");
  assert.equal(entries[0].start, "2024-05-01T09:00:00.000Z");
  assert.equal(entries[0].end, "2024-05-01T10:00:00.000Z");
  assert.equal(client.getQueryData(dataKeys.runningTimer), null);
});
