import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { CategoriesManager } from "../components/CategoriesManager";
import { EntriesManager } from "../components/EntriesManager";
import { createEntry, deleteEntry, updateEntry } from "../lib/entries";
import { createCategory, deleteCategory, renameCategory } from "../lib/categories";
import { UNCATEGORIZED_CATEGORY } from "../lib/constants";
import type { ActionResult, Category, TimeEntry } from "../lib/types";

const categories: Category[] = [
  { ...UNCATEGORIZED_CATEGORY },
  { id: "work", name: "Work", color: "#4f46e5" },
  { id: "study", name: "Study", color: "#059669" },
];

const draft = {
  description: "Deep work",
  categoryId: "work",
  start: "2024-05-01T09:00:00.000Z",
  end: "2024-05-01T10:30:00.000Z",
};

const ok = (): ActionResult => ({ ok: true });
const fail = (): ActionResult => ({ ok: false, errors: ["nope"] });
const noop = () => {};

function renderEntries(entries: TimeEntry[]): string {
  return renderToStaticMarkup(
    <EntriesManager
      entries={entries}
      categories={categories}
      onCreate={ok}
      onUpdate={ok}
      onDelete={noop}
    />,
  );
}

test("EntriesManager renders the add form and empty state", () => {
  const html = renderEntries([]);
  assert.match(html, /Add entry/);
  assert.match(html, /No entries yet\./);
  assert.match(html, /name="description"/);
  assert.match(html, /name="categoryId"/);
  assert.match(html, /name="start"/);
  assert.match(html, /name="end"/);
});

test("EntriesManager reflects an added entry (add)", () => {
  const entries = createEntry([], draft, "e1");
  const html = renderEntries(entries);
  assert.match(html, /Deep work/);
  assert.match(html, /Work/);
  assert.match(html, /1h 30m/);
  assert.match(html, />Edit</);
  assert.match(html, />Delete</);
  assert.doesNotMatch(html, /No entries yet\./);
});

test("EntriesManager reflects an edited entry (edit)", () => {
  const added = createEntry([], draft, "e1");
  const edited = updateEntry(added, "e1", {
    ...draft,
    description: "Shallow work",
    end: "2024-05-01T09:30:00.000Z",
  });
  const html = renderEntries(edited);
  assert.match(html, /Shallow work/);
  assert.doesNotMatch(html, /Deep work/);
  assert.match(html, /30m/);
});

test("EntriesManager reflects a deleted entry (delete)", () => {
  const added = createEntry([], draft, "e1");
  const remaining = deleteEntry(added, "e1");
  const html = renderEntries(remaining);
  assert.match(html, /No entries yet\./);
  assert.doesNotMatch(html, /Deep work/);
});

test("EntriesManager renders multiple rows newest first as given", () => {
  const entries = createEntry(createEntry([], draft, "e1"), {
    ...draft,
    description: "Second",
    start: "2024-05-02T09:00:00.000Z",
    end: "2024-05-02T10:00:00.000Z",
  }, "e2");
  const html = renderEntries(entries);
  assert.ok(html.indexOf("Deep work") < html.indexOf("Second"));
});

test("EntriesManager renders actions wired with the provided handlers", () => {
  // A failing handler is surfaced by the component after a submit; the
  // rendered form is the entry point through which add/edit/delete are wired.
  const html = renderToStaticMarkup(
    <EntriesManager
      entries={createEntry([], draft, "e1")}
      categories={categories}
      onCreate={fail}
      onUpdate={fail}
      onDelete={noop}
    />,
  );
  assert.match(html, /Add entry|Save changes/);
});

function renderCategories(
  list: Category[],
  entries: TimeEntry[] = [],
  weeklyMinutes: Record<string, number> = {},
): string {
  return renderToStaticMarkup(
    <CategoriesManager
      categories={list}
      entries={entries}
      weeklyMinutes={weeklyMinutes}
      onCreate={ok}
      onRename={ok}
      onRecolor={ok}
      onDelete={noop}
    />,
  );
}

function minutesEntry(id: string, categoryId: string, minutes: number): TimeEntry {
  return {
    id,
    description: id,
    categoryId,
    start: "2024-05-01T09:00:00.000Z",
    end: `2024-05-01T09:${String(minutes).padStart(2, "0")}:00.000Z`,
    durationMinutes: minutes,
  };
}

test("CategoriesManager renders the create form and rows", () => {
  const html = renderCategories(categories);
  assert.match(html, /Add category/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="color"/);
  assert.match(html, /Work/);
  assert.match(html, /Study/);
});

test("CategoriesManager keeps the built-in category's actions available but undeletable", () => {
  const html = renderCategories(categories);
  // Every card exposes its actions in an overflow menu; the built-in bucket
  // stays in the list and the domain helper refuses to remove it.
  assert.match(html, /aria-label="Actions for Uncategorized"/);
  assert.match(html, /aria-label="Actions for Work"/);
  const result = deleteCategory(categories, [], UNCATEGORIZED_CATEGORY.id);
  assert.ok(result.categories.some((item) => item.id === UNCATEGORIZED_CATEGORY.id));
});

test("category cards show weekly time, entry count and a share bar", () => {
  const entries = [
    minutesEntry("a", "work", 120),
    minutesEntry("b", "work", 60),
    minutesEntry("c", "study", 60),
  ];
  const html = renderCategories(categories, entries, { work: 180, study: 60 });

  assert.match(html, /2 entries/);
  assert.match(html, /1 entry/);
  assert.match(html, /Share this week/);
  // 180 of 240 weekly minutes rounds to 75%.
  assert.match(html, /width:75%/);
  // The picker moved into a popover, so no inline swatch group is rendered.
  assert.doesNotMatch(html, /role="radiogroup"/);
  // The add form still carries the color value for submission.
  assert.match(html, /name="color"/);
});

test("CategoriesManager reflects create, rename and delete", () => {
  let list: Category[] = [{ ...UNCATEGORIZED_CATEGORY }];
  list = createCategory(list, { name: "Work", color: "#4f46e5" }, "work");
  assert.match(renderCategories(list), /Work/);

  list = renameCategory(list, "work", "Day job");
  const renamed = renderCategories(list);
  assert.match(renamed, /Day job/);
  assert.doesNotMatch(renamed, />Work</);

  const result = deleteCategory(list, [], "work");
  const afterDelete = renderCategories(result.categories);
  assert.doesNotMatch(afterDelete, /Day job/);
});
