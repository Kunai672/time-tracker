/**
 * Cookie plumbing shared by the browser and server Supabase clients.
 *
 * Keeping it in one place means the middleware, route handlers and tests all
 * use the exact same `getAll`/`setAll` implementation, which is the part the
 * `@supabase/ssr` docs warn is easy to get subtly wrong.
 */
import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";

import type { SupabaseConfig } from "../config";

/** The minimal cookie store a server client needs. */
export type CookieStoreLike = {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: CookieOptions): void;
};

/**
 * Adapts a cookie store to the `getAll`/`setAll` methods `@supabase/ssr`
 * expects. `setAll` ignores the extra cache-control headers parameter, which
 * the caller applies to the response instead.
 */
export function createServerCookieMethods(
  store: CookieStoreLike,
): CookieMethodsServer {
  return {
    getAll: () => store.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        store.set(name, value, options);
      }
    },
  };
}

/** A server-side Supabase client bound to an injected cookie store. */
export function createServerSupabaseClient(
  config: SupabaseConfig,
  store: CookieStoreLike,
) {
  return createServerClient(config.url, config.publishableKey, {
    cookies: createServerCookieMethods(store),
  });
}
