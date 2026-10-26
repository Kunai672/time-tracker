"use client";

/**
 * Browser Supabase client.
 *
 * `createBrowserClient` is a singleton keyed by project URL, so calling it
 * repeatedly is cheap. It returns `null` whenever Supabase is not configured,
 * which is how the app falls back to the local backend.
 */
import { createBrowserClient, type CookieMethodsBrowser } from "@supabase/ssr";

import { getSupabaseConfig, type SupabaseConfig } from "../config";

/** Builds a browser client. `cookies` is a test/preview seam. */
export function createBrowserSupabaseClient(
  config: SupabaseConfig,
  cookies?: CookieMethodsBrowser,
) {
  return createBrowserClient(
    config.url,
    config.publishableKey,
    cookies ? { cookies } : undefined,
  );
}

/** The active browser client, or `null` when Supabase is not configured. */
export function getBrowserSupabaseClient(cookies?: CookieMethodsBrowser) {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createBrowserSupabaseClient(config, cookies);
}
