import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { CategoryChart } from "../components/CategoryChart";
import { DailyChart } from "../components/DailyChart";
import { DataTransfer } from "../components/DataTransfer";
import { createDefaultData } from "../lib/storage";

test("DailyChart shows an empty state with no data", () => {
  const html = renderToStaticMarkup(<DailyChart data={[]} />);
  assert.match(html, /No data for the selected filters\./);
});

test("DailyChart renders a chart container with data", () => {
  const html = renderToStaticMarkup(
    <DailyChart data={[{ date: "2024-05-01", minutes: 60, hours: 1 }]} />,
  );
  assert.match(html, /data-testid="daily-chart"/);
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
