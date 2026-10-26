import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { EntriesList } from "../components/EntriesList";
import type { Category, RunningTimer } from "../lib/types";

test("entries list shows the start-timer call to action when empty", () => {
  const html = renderToStaticMarkup(
    <EntriesList
      groups={[]}
      categories={[]}
      now={new Date(0)}
      hour12={false}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );

  assert.match(html, /No entries yet/);
  assert.match(html, /Start your first timer/);
});

test("a running timer renders as a live row at the top of Today", () => {
  const now = new Date("2024-05-01T10:30:00.000Z");
  const timer: RunningTimer = {
    categoryId: "work",
    startedAt: "2024-05-01T10:00:00.000Z",
    description: "Deep work",
  };
  const categories: Category[] = [
    { id: "work", name: "Work", color: "#4f46e5" },
  ];

  const html = renderToStaticMarkup(
    <EntriesList
      groups={[]}
      categories={categories}
      now={now}
      hour12={false}
      onEdit={() => {}}
      onDelete={() => {}}
      runningTimer={timer}
    />,
  );

  assert.match(html, /entries-running-row/);
  assert.match(html, /Deep work/);
  assert.match(html, /Work/);
  assert.match(html, /30:00/);
  assert.match(html, /Today/);
  assert.doesNotMatch(html, /No entries yet/);
});
