import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BACKEND_ENV,
  hasSupabaseConfig,
  readRuntimeBackendOverride,
  resolveBackend,
  resolveSupabaseConfig,
} from "../lib/config";

test("resolveBackend is local without Supabase config", () => {
  assert.equal(resolveBackend({}), "local");
  assert.equal(resolveBackend({ url: "https://example.supabase.co" }), "local");
  assert.equal(resolveBackend({ key: "sb_publishable_x" }), "local");
  assert.equal(resolveBackend({ url: "  ", key: "  " }), "local");
});

test("resolveBackend is supabase when both vars are set", () => {
  assert.equal(
    resolveBackend({ url: "https://example.supabase.co", key: "sb_publishable_x" }),
    "supabase",
  );
  assert.equal(
    hasSupabaseConfig({ url: " https://example.supabase.co ", key: " key " }),
    true,
  );
});

test("the runtime backend override only accepts known backends", () => {
  assert.equal(readRuntimeBackendOverride({ [BACKEND_ENV]: "local" }), "local");
  assert.equal(
    readRuntimeBackendOverride({ [BACKEND_ENV]: "supabase" }),
    "supabase",
  );
  assert.equal(readRuntimeBackendOverride({ [BACKEND_ENV]: "nope" }), null);
  assert.equal(readRuntimeBackendOverride({}), null);
});

test("resolveSupabaseConfig trims values and rejects partial config", () => {
  assert.equal(resolveSupabaseConfig({}), null);
  assert.equal(
    resolveSupabaseConfig({ url: "https://example.supabase.co" }),
    null,
  );

  const config = resolveSupabaseConfig({
    url: "  https://example.supabase.co  ",
    key: "  sb_publishable_x  ",
  });
  assert.deepEqual(config, {
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_x",
  });
});
