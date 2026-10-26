/**
 * Session refresh for the root `proxy.ts`.
 *
 * It refreshes the Supabase session cookies on every request and redirects
 * signed-out visitors to `/login`. When Supabase is not configured it is a
 * no-op, so the local backend is completely unaffected.
 */
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "../config";
import { createServerSupabaseClient, type CookieStoreLike } from "./cookie-methods";
import { shouldRedirectToLogin, userFromClaims } from "./session";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const config = getSupabaseConfig();
  if (!config) return response;

  const store: CookieStoreLike = {
    getAll: () => request.cookies.getAll(),
    set: (name, value, options) => {
      // Keep the request in sync for the rest of this run, and write the
      // refreshed cookie to the outgoing response.
      request.cookies.set(name, value);
      response = NextResponse.next({ request });
      response.cookies.set(name, value, options);
    },
  };

  const supabase = createServerSupabaseClient(config, store);

  // Refresh the session before any response is generated, then verify it.
  const { data } = await supabase.auth.getClaims();
  const user = userFromClaims(data?.claims ?? null);

  if (shouldRedirectToLogin(request.nextUrl.pathname, Boolean(user))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
