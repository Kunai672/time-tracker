import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { NAV_ITEMS } from "../components/nav-items";
import { RunningTimerIndicatorView } from "../components/RunningTimerIndicator";
import { CATEGORY_PALETTE } from "../lib/category-colors";
import {
  applyThemeClass,
  resolveTheme,
  type ClassListLike,
} from "../lib/theme";

/** Tiny stand-in for a DOM `classList`, so the theme logic is testable. */
function makeClassList(): ClassListLike & { has(token: string): boolean } {
  const tokens = new Set<string>();
  return {
    add: (token) => tokens.add(token),
    remove: (token) => tokens.delete(token),
    has: (token) => tokens.has(token),
  };
}

test("theme toggle switches the dark class for every choice", () => {
  const classList = makeClassList();

  applyThemeClass(classList, resolveTheme("dark", false));
  assert.equal(classList.has("dark"), true);

  applyThemeClass(classList, resolveTheme("light", true));
  assert.equal(classList.has("dark"), false);

  // "system" follows the OS preference in both directions.
  applyThemeClass(classList, resolveTheme("system", true));
  assert.equal(classList.has("dark"), true);

  applyThemeClass(classList, resolveTheme("system", false));
  assert.equal(classList.has("dark"), false);
});

test("shell exposes the four primary destinations", () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.label),
    ["Dashboard", "Entries", "Categories", "Settings"],
  );
});

test("timer indicator is hidden while idle", () => {
  const html = renderToStaticMarkup(
    <RunningTimerIndicatorView timer={null} now={new Date()} />,
  );
  assert.equal(html, "");
  assert.doesNotMatch(html, /running-timer-indicator/);
});

test("timer indicator is visible and tabular while running", () => {
  const startedAt = new Date("2024-05-01T09:00:00.000Z");
  const now = new Date("2024-05-01T10:30:00.000Z");
  const html = renderToStaticMarkup(
    <RunningTimerIndicatorView
      timer={{ categoryId: "work", startedAt: startedAt.toISOString() }}
      categoryName="Work"
      now={now}
    />,
  );
  assert.match(html, /running-timer-indicator/);
  assert.match(html, /tabular-nums/);
  assert.match(html, /1h 30m/);
  assert.match(html, /animate-ping/);
});

test("category palette has 8 to 10 distinguishable colours", () => {
  assert.ok(CATEGORY_PALETTE.length >= 8);
  assert.ok(CATEGORY_PALETTE.length <= 10);
  const values = CATEGORY_PALETTE.map((color) => color.value.toLowerCase());
  assert.equal(new Set(values).size, values.length);
  for (const value of values) {
    assert.match(value, /^#[0-9a-f]{6}$/);
  }
});
