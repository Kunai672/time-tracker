/**
 * Handles Supabase email OTP confirmation links (`token_hash` + `type`),
 * verifying the token and establishing a session.
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "../../../lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, origin));

  if (!tokenHash || !type) {
    return redirectTo(
      `/login?error=${encodeURIComponent(
        "Invalid or expired confirmation link.",
      )}`,
    );
  }

  const supabase = await createClient();
  if (!supabase) return redirectTo("/");

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return redirectTo(`/login?error=${encodeURIComponent(error.message)}`);
  }

  return redirectTo(next);
}
