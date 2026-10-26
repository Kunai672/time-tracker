/**
 * Exchanges the OAuth / PKCE `code` from a Supabase auth email link or provider
 * redirect for a session, then sends the user on to `next`.
 *
 * Falls back to a friendly login error. When Supabase is not configured the
 * route simply returns to the local app.
 */
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "../../../lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("error");

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, origin));

  if (errorDescription) {
    return redirectTo(`/login?error=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    return redirectTo(
      `/login?error=${encodeURIComponent("Missing authentication code.")}`,
    );
  }

  const supabase = await createClient();
  if (!supabase) return redirectTo("/");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectTo(`/login?error=${encodeURIComponent(error.message)}`);
  }

  return redirectTo(next);
}
