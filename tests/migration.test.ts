import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SCHEMA_VERSION,
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_ID,
} from "../lib/constants";
import {
  hasMigratableData,
  isCloudEmpty,
  isUuid,
  mapLocalDataToCloud,
  migrateLocalData,
  toCloudId,
} from "../lib/data/migration";
import { createSupabaseRepository } from "../lib/data/supabase-repository";
import { createDefaultData } from "../lib/storage";
import type { AppData } from "../lib/types";
import { FakeDatabase, createFakeSupabaseClient } from "./fake-supabase";

const localData: AppData = {
  version: SCHEMA_VERSION,
  categories: [
    { ...UNCATEGORIZED_CATEGORY },
    { id: "cat_local_1", name: "Work", color: "#4f46e5" },
  ],
  entries: [
    {
      id: "entry_local_1",
      description: "Deep work",
      categoryId: "cat_local_1",
      start: "2024-05-01T09:00:00.000Z",
      end: "2024-05-01T10:00:00.000Z",
      durationMinutes: 60,
    },
  ],
  runningTimer: null,
};

test("toCloudId is stable, uuid-shaped and preserves uuids", () => {
  const mapped = toCloudId("cat_local_1");
  assert.equal(mapped, toCloudId("cat_local_1"));
  assert.equal(isUuid(mapped), true);
  assert.notEqual(mapped, toCloudId("cat_local_2"));

  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(toCloudId(uuid), uuid);
  assert.equal(toCloudId(UNCATEGORIZED_ID), UNCATEGORIZED_ID);
});

test("mapLocalDataToCloud keeps entry references pointing at mapped categories", () => {
  const mapped = mapLocalDataToCloud(localData);
  const work = mapped.categories.find((category) => category.name === "Work");
  assert.ok(work);
  assert.equal(mapped.entries[0].categoryId, work.id);
  assert.equal(mapped.entries[0].id, toCloudId("entry_local_1"));
});

test("migrating local data twice does not duplicate", async () => {
  const repository = createSupabaseRepository(createFakeSupabaseClient());

  await migrateLocalData(repository, localData);
  const first = await repository.exportAll();

  await migrateLocalData(repository, localData);
  const second = await repository.exportAll();

  assert.deepEqual(second, first);
  assert.equal(second.entries.length, 1);
  assert.equal(
    second.categories.filter((category) => category.id !== UNCATEGORIZED_ID)
      .length,
    1,
  );
});

test("hasMigratableData and isCloudEmpty describe the two sides", () => {
  assert.equal(hasMigratableData(localData), true);
  assert.equal(hasMigratableData(createDefaultData()), false);
  assert.equal(isCloudEmpty([], [], null), true);
  assert.equal(isCloudEmpty([{ id: UNCATEGORIZED_ID }], [], null), true);
  assert.equal(isCloudEmpty([], [{ id: "x" }], null), false);
  assert.equal(isCloudEmpty([], [], { categoryId: "x" }), false);
});

test("reset deletes only the signed-in user's rows", async () => {
  const database = new FakeDatabase();
  const userA = createSupabaseRepository(database.clientFor("user-a"));
  const userB = createSupabaseRepository(database.clientFor("user-b"));

  const categoryA = await userA.createCategory({ name: "A", color: "#111111" });
  await userA.createEntry({
    description: "A entry",
    categoryId: categoryA.id,
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:00:00.000Z",
  });
  const categoryB = await userB.createCategory({ name: "B", color: "#222222" });
  await userB.createEntry({
    description: "B entry",
    categoryId: categoryB.id,
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:00:00.000Z",
  });

  await userA.importAll(createDefaultData());

  assert.deepEqual(await userA.listEntries(), []);
  assert.deepEqual(
    (await userA.listCategories()).map((category) => category.id),
    [UNCATEGORIZED_ID],
  );
  const entriesB = await userB.listEntries();
  assert.equal(entriesB.length, 1);
  assert.equal(entriesB[0].description, "B entry");
  assert.ok(
    (await userB.listCategories()).some(
      (category) => category.id === categoryB.id,
    ),
  );
});
