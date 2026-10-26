import { test } from "node:test";
import assert from "node:assert/strict";

import { APP_TITLE, formatDocumentTitle } from "../lib/documentTitle";

const start = new Date("2024-05-01T09:00:00.000Z");
const later = new Date("2024-05-01T09:42:10.000Z");

test("the document title is the plain app title while idle", () => {
  assert.equal(formatDocumentTitle(null, later), APP_TITLE);
});

test("the document title shows the running clock", () => {
  assert.equal(
    formatDocumentTitle(
      { categoryId: "work", startedAt: start.toISOString() },
      later,
    ),
    "● 00:42:10 · Time Tracker",
  );
});

test("the document title resets when the timer stops", () => {
  const running = formatDocumentTitle(
    { categoryId: "work", startedAt: start.toISOString() },
    later,
  );
  assert.notEqual(running, APP_TITLE);
  assert.equal(formatDocumentTitle(null, later), APP_TITLE);
});
