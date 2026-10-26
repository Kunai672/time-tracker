import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { TimerCardView } from "../components/TimerCard";
import { UNCATEGORIZED_CATEGORY } from "../lib/constants";
import type { Category } from "../lib/types";

const categories: Category[] = [
  { ...UNCATEGORIZED_CATEGORY },
  { id: "work", name: "Work", color: "#4f46e5" },
];

const noop = () => {};

test("timer card shows the idle controls", () => {
  const html = renderToStaticMarkup(
    <TimerCardView
      categories={categories}
      runningTimer={null}
      now={new Date(0)}
      categoryId="work"
      description=""
      onCategoryChange={noop}
      onDescriptionChange={noop}
      onStart={noop}
      onStop={noop}
    />,
  );

  assert.match(html, /Start a timer/);
  assert.match(html, /name="timer-description"/);
  assert.match(html, /Start timer/);
  assert.match(html, /Work/);
  assert.doesNotMatch(html, /Stop timer/);
  assert.doesNotMatch(html, /animate-ping/);
});

test("timer card shows a live clock and pulsing dot while running", () => {
  const startedAt = new Date("2024-05-01T09:00:00.000Z");
  const now = new Date("2024-05-01T10:30:00.000Z");

  const html = renderToStaticMarkup(
    <TimerCardView
      categories={categories}
      runningTimer={{ categoryId: "work", startedAt: startedAt.toISOString() }}
      now={now}
      categoryId="work"
      description="Deep work"
      onCategoryChange={noop}
      onDescriptionChange={noop}
      onStart={noop}
      onStop={noop}
    />,
  );

  assert.match(html, /Timer running/);
  assert.match(html, /data-testid="timer-clock"/);
  assert.match(html, /1:30:00/);
  assert.match(html, /tabular-nums/);
  assert.match(html, /animate-ping/);
  assert.match(html, /Stop timer/);
  assert.doesNotMatch(html, /Start timer/);
});
