/**
 * The behavioural contract every `DataRepository` implementation must satisfy.
 *
 * It is exported as a plain function (not a `.test.ts` file) so the same
 * suite can run against the localStorage backend, the in-memory fake and the
 * Supabase repository, with only the factory changing.
 *
 * Entry drafts always reference a category that really exists, because a real
 * database enforces the foreign key.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { UNCATEGORIZED_ID } from "../lib/constants";
import type { DataRepository } from "../lib/data/types";
import type { AppData } from "../lib/types";

function entryDraft(categoryId: string) {
  return {
    description: "Deep work",
    categoryId,
    start: "2024-05-01T09:00:00.000Z",
    end: "2024-05-01T10:30:00.000Z",
  };
}

export function runRepositoryContract(
  name: string,
  makeRepository: () => DataRepository,
): void {
  test(`${name}: creates, lists, updates and deletes categories`, async () => {
    const repository = makeRepository();

    const created = await repository.createCategory({
      name: "  Work  ",
      color: "#4f46e5",
    });
    assert.ok(created.id.length > 0);
    assert.equal(created.name, "Work");
    assert.equal(created.color, "#4f46e5");

    const listed = await repository.listCategories();
    assert.ok(listed.some((category) => category.id === created.id));

    const renamed = await repository.updateCategory(created.id, {
      name: "Job",
    });
    assert.equal(renamed.name, "Job");
    assert.equal(renamed.color, "#4f46e5");

    const recolored = await repository.updateCategory(created.id, {
      color: "#000000",
    });
    assert.equal(recolored.name, "Job");
    assert.equal(recolored.color, "#000000");

    await repository.deleteCategory(created.id);
    const afterDelete = await repository.listCategories();
    assert.ok(!afterDelete.some((category) => category.id === created.id));
  });

  test(`${name}: deleting a category reassigns its entries`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    const entry = await repository.createEntry(entryDraft(category.id));

    await repository.deleteCategory(category.id);

    const entries = await repository.listEntries();
    const reassigned = entries.find((candidate) => candidate.id === entry.id);
    assert.ok(reassigned);
    assert.equal(reassigned.categoryId, UNCATEGORIZED_ID);
  });

  test(`${name}: creates, updates and deletes entries`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    const created = await repository.createEntry(entryDraft(category.id));
    assert.ok(created.id.length > 0);
    assert.equal(created.durationMinutes, 90);
    assert.equal(created.description, "Deep work");

    const listed = await repository.listEntries();
    assert.equal(listed.length, 1);

    const updated = await repository.updateEntry(created.id, {
      ...entryDraft(category.id),
      description: "Shallow work",
      end: "2024-05-01T09:30:00.000Z",
    });
    assert.equal(updated.description, "Shallow work");
    assert.equal(updated.durationMinutes, 30);

    await repository.deleteEntry(created.id);
    assert.deepEqual(await repository.listEntries(), []);
  });

  test(`${name}: restoring a deleted entry keeps its id`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    const created = await repository.createEntry(entryDraft(category.id));
    await repository.deleteEntry(created.id);
    assert.deepEqual(await repository.listEntries(), []);

    const restored = await repository.restoreEntry(created);
    assert.equal(restored.id, created.id);

    const listed = await repository.listEntries();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, created.id);
  });

  test(`${name}: stopping a timer turns it into an entry`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    const startedAt = "2024-05-01T09:00:00.000Z";
    const end = "2024-05-01T10:00:00.000Z";

    const timer = await repository.startTimer({
      categoryId: category.id,
      description: "Focus",
      startedAt,
    });
    assert.equal(timer.categoryId, category.id);
    assert.equal(timer.startedAt, startedAt);

    const running = await repository.getRunningTimer();
    assert.deepEqual(running, timer);

    const entry = await repository.stopTimer({ end });
    assert.ok(entry);
    assert.equal(entry.start, startedAt);
    assert.equal(entry.end, end);
    assert.equal(entry.description, "Focus");
    assert.equal(await repository.getRunningTimer(), null);

    const entries = await repository.listEntries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, entry.id);
  });

  test(`${name}: stopping without a running timer is a no-op`, async () => {
    const repository = makeRepository();
    assert.equal(await repository.stopTimer(), null);
    assert.deepEqual(await repository.listEntries(), []);
  });

  test(`${name}: export/import round-trips and replaces data`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    await repository.createEntry(entryDraft(category.id));

    const exported = await repository.exportAll();
    await repository.importAll(exported);
    assert.deepEqual(await repository.exportAll(), exported);

    const replacement: AppData = { ...exported, entries: [] };
    await repository.importAll(replacement);
    assert.deepEqual(await repository.listEntries(), []);
  });

  test(`${name}: import rejects a malformed payload`, async () => {
    const repository = makeRepository();
    const category = await repository.createCategory({
      name: "Work",
      color: "#4f46e5",
    });
    await repository.createEntry(entryDraft(category.id));
    const before = await repository.exportAll();

    const malformed = {
      version: 1,
      categories: [{ id: "", name: "", color: "nope" }],
      entries: "not-an-array",
      runningTimer: null,
    } as unknown as AppData;

    await assert.rejects(() => repository.importAll(malformed));
    // Nothing was written before validation failed.
    assert.deepEqual(await repository.exportAll(), before);
  });
}
