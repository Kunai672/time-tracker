import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { CategoryChart } from "../components/CategoryChart";
import { DailyChart } from "../components/DailyChart";
import { DataTransfer } from "../components/DataTransfer";
import { createDefaultData } from "../lib/storage";
import type { Category, TimeEntry } from "../lib/types";

const now = new Date(2024, 4, 1, 12, 0, 0);
const work: Category = { id: "work", name: "Work", color: "#4f46e5" };
const deepWork: TimeEntry = {
  id: "e1",
  description: "Deep work",
  categoryId: "work",
  start: new Date(2024, 4, 1, 9, 0, 0).toISOString(),
  end: new Date(2024, 4, 1, 10, 0, 0).toISOString(),
  durationMinutes: 60,
};

test("DailyChart shows an empty state with no data", () => {
  const html = renderToStaticMarkup(
    <DailyChart entries={[]} categories={[]} now={now} />,
  );
  assert.match(html, /No data for the selected filters\./);
});

test("DailyChart renders a chart container with a category series", () => {
  const html = renderToStaticMarkup(
    <DailyChart entries={[deepWork]} categories={[work]} now={now} />,
  );
  assert.match(html, /data-testid="daily-chart"/);
  // The category is wired as a stacked series (its color token is emitted).
  assert.match(html, /--color-work: #4f46e5/);
  assert.match(html, /7d/);
  assert.match(html, /30d/);
  assert.doesNotMatch(html, /No data for the selected filters\./);
});

test("CategoryChart shows an empty state with no data", () => {
  const html = renderToStaticMarkup(<CategoryChart data={[]} />);
  assert.match(html, /No data for the selected filters\./);
});

test("CategoryChart renders a chart container with data", () => {
  const html = renderToStaticMarkup(
    <CategoryChart
      data={[
        {
          categoryId: "work",
          name: "Work",
          color: "#4f46e5",
          minutes: 60,
          hours: 1,
        },
      ]}
    />,
  );
  assert.match(html, /data-testid="category-chart"/);
});

test("DataTransfer renders export and import controls", () => {
  const html = renderToStaticMarkup(
    <DataTransfer data={createDefaultData()} onImport={() => {}} onReset={() => {}} />,
  );
  assert.match(html, /Export JSON/);
  assert.match(html, /name="import-file"/);
  assert.match(html, /name="import-text"/);
  assert.match(html, /Import pasted JSON/);
  assert.match(html, /Reset all data/);
});
