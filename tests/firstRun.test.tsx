import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { WelcomeCard } from "../components/WelcomeCard";
import { createCategory } from "../lib/categories";
import { createEntry } from "../lib/entries";
import { buildSampleData, isFirstRun } from "../lib/sampleData";
import { createDefaultData } from "../lib/storage";

test("isFirstRun is true only without entries and custom categories", () => {
  const empty = createDefaultData();
  assert.equal(isFirstRun(empty), true);

  const withCategory = {
    ...empty,
    categories: createCategory(
      empty.categories,
      { name: "Work", color: "#4f46e5" },
      "work",
    ),
  };
  assert.equal(isFirstRun(withCategory), false);

  const withEntry = {
    ...empty,
    entries: createEntry(
      [],
      {
        description: "Standup",
        categoryId: "uncategorized",
        start: "2024-05-01T09:00:00.000Z",
        end: "2024-05-01T09:30:00.000Z",
      },
      "e1",
    ),
  };
  assert.equal(isFirstRun(withEntry), false);
});

test("buildSampleData produces a populated, non-first-run dataset", () => {
  const sample = buildSampleData(new Date("2024-05-03T12:00:00.000Z"));
  assert.ok(sample.entries.length > 0);
  assert.ok(sample.categories.length > 1);
  assert.equal(sample.runningTimer, null);
  assert.equal(isFirstRun(sample), false);
});

test("the welcome card offers a first category and sample data", () => {
  const html = renderToStaticMarkup(<WelcomeCard onLoadSample={() => {}} />);

  assert.match(html, /first-run-welcome/);
  assert.match(html, /Create your first category/);
  assert.match(html, /href="\/categories"/);
  assert.match(html, /Load sample data/);
});
