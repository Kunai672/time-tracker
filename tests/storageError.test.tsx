import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { StorageErrorBanner } from "../components/StorageErrorBanner";
import { loadWithStatus, type StorageLike } from "../lib/storage";

function storageWith(raw: string): StorageLike {
  return {
    getItem: () => raw,
    setItem: () => {},
    removeItem: () => {},
  };
}

test("a corrupt storage fixture renders the error state instead of crashing", () => {
  const result = loadWithStatus(storageWith("{ this is not valid json"));

  assert.equal(result.status, "corrupt");
  // The app still has usable defaults.
  assert.deepEqual(result.data.entries, []);
  assert.ok(Array.isArray(result.data.categories));

  const html = renderToStaticMarkup(
    <StorageErrorBanner status={result.status} onReset={() => {}} />,
  );
  assert.match(html, /data-testid="storage-error"/);
  assert.match(html, /saved data/);
  assert.match(html, /Reset data/);
});

test("healthy storage renders no error state", () => {
  const result = loadWithStatus(
    storageWith(
      JSON.stringify({
        version: 1,
        categories: [],
        entries: [],
        runningTimer: null,
      }),
    ),
  );

  assert.equal(result.status, "ok");
  const html = renderToStaticMarkup(
    <StorageErrorBanner status={result.status} onReset={() => {}} />,
  );
  assert.equal(html, "");
});
