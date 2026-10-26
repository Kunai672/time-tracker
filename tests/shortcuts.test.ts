import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SHORTCUTS,
  clearAddEntryRequest,
  consumeAddEntryRequest,
  requestAddEntry,
  shouldIgnoreShortcut,
  shortcutFor,
} from "../lib/shortcuts";

test("typing targets suppress shortcuts", () => {
  assert.equal(shouldIgnoreShortcut({ tagName: "INPUT" }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "TEXTAREA" }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "SELECT" }), true);
  assert.equal(shouldIgnoreShortcut({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(
    shouldIgnoreShortcut({ tagName: "DIV", getAttribute: () => "button" }),
    true,
  );
});

test("plain elements and controls allow shortcuts", () => {
  assert.equal(shouldIgnoreShortcut(null), false);
  assert.equal(shouldIgnoreShortcut({ tagName: "DIV" }), false);
  assert.equal(shouldIgnoreShortcut({ tagName: "BODY" }), false);
});

test("shortcutFor maps N, Space and ? and ignores modifiers", () => {
  assert.equal(shortcutFor({ key: "n" }), "add-entry");
  assert.equal(shortcutFor({ key: "N" }), "add-entry");
  assert.equal(shortcutFor({ key: " " }), "toggle-timer");
  assert.equal(shortcutFor({ key: "?" }), "help");
  assert.equal(shortcutFor({ key: "x" }), null);
  assert.equal(shortcutFor({ key: "n", metaKey: true }), null);
  assert.equal(shortcutFor({ key: " ", ctrlKey: true }), null);
});

test("the help dialog lists every shortcut", () => {
  assert.deepEqual(
    SHORTCUTS.map((shortcut) => shortcut.keys),
    ["N", "Space", "?"],
  );
});

test("the Add entry request is one-shot", () => {
  clearAddEntryRequest();
  assert.equal(consumeAddEntryRequest(), false);
  requestAddEntry();
  assert.equal(consumeAddEntryRequest(), true);
  assert.equal(consumeAddEntryRequest(), false);
});
