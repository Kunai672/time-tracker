/**
 * Server-side Supabase client.
 *
 * Always create a fresh client per request — never share one across requests.
 * Returns `null` when Supabase is not configured so callers can fall back to
 * the local backend. On the server, identity is established with
 * `getClaims()`, never `getSession()`.
 */
import { cookies } from "next/headers";

import { getSupabaseConfig } from "../config";
import {
  createServerSupabaseClient,
  type CookieStoreLike,
} from "./cookie-methods";

export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  const store: CookieStoreLike = {
    getAll: () => cookieStore.getAll(),
    set: (name, value, options) => {
      try {
        cookieStore.set(name, value, options);
      } catch {
        // Called from a Server Component, where cookies are read-only. The
        // proxy refreshes the session, so this is safe to ignore.
      }
    },
  };

  return createServerSupabaseClient(config, store);
}

/** Verified claims for the current request, or `null` when signed out. */
export async function getVerifiedClaims() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}
