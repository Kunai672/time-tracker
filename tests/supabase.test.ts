import assert from "node:assert/strict";
import { test } from "node:test";

import type { SupabaseConfig } from "../lib/config";
import { createBrowserSupabaseClient } from "../lib/supabase/client";
import {
  createServerCookieMethods,
  createServerSupabaseClient,
  type CookieStoreLike,
} from "../lib/supabase/cookie-methods";
import {
  isAuthPath,
  shouldRedirectToLogin,
  userFromClaims,
} from "../lib/supabase/session";

const config: SupabaseConfig = {
  url: "https://example.supabase.co",
  publishableKey: "sb_publishable_test",
};

function mockStore() {
  const writes: { name: string; value: string; options?: unknown }[] = [];
  const store: CookieStoreLike = {
    getAll: () => [{ name: "sb-access-token", value: "abc" }],
    set: (name, value, options) => {
      writes.push({ name, value, options });
    },
  };
  return { store, writes };
}

test("server cookie methods read and write through the store", () => {
  const { store, writes } = mockStore();
  const methods = createServerCookieMethods(store);

  assert.deepEqual(methods.getAll(), [
    { name: "sb-access-token", value: "abc" },
  ]);

  methods.setAll!(
    [{ name: "sb-refresh-token", value: "xyz", options: { path: "/" } }],
    {},
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].name, "sb-refresh-token");
  assert.equal(writes[0].value, "xyz");
  assert.deepEqual(writes[0].options, { path: "/" });
});

test("server and browser clients can be built from mocked cookies", () => {
  const { store } = mockStore();

  const server = createServerSupabaseClient(config, store);
  assert.equal(typeof server.auth.getClaims, "function");

  const browser = createBrowserSupabaseClient(config, {
    getAll: () => [],
    setAll: () => {},
  });
  assert.equal(typeof browser.auth.getClaims, "function");
});

test("session helpers decide who gets redirected", () => {
  assert.equal(isAuthPath("/login"), true);
  assert.equal(isAuthPath("/signup"), true);
  assert.equal(isAuthPath("/auth/callback"), true);
  assert.equal(isAuthPath("/entries"), false);

  assert.equal(shouldRedirectToLogin("/entries", false), true);
  assert.equal(shouldRedirectToLogin("/entries", true), false);
  assert.equal(shouldRedirectToLogin("/login", false), false);
  assert.equal(shouldRedirectToLogin("/auth/callback", false), false);
});

test("userFromClaims reads the verified subject and email", () => {
  assert.equal(userFromClaims(null), null);
  assert.equal(userFromClaims({}), null);
  assert.deepEqual(
    userFromClaims({ sub: "user-1", email: "a@example.com" }),
    { id: "user-1", email: "a@example.com" },
  );
  assert.deepEqual(userFromClaims({ sub: "user-1" }), {
    id: "user-1",
    email: null,
  });
});
