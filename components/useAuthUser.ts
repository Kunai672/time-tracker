"use client";

/**
 * Reads the signed-in user from the browser Supabase session.
 *
 * The query is disabled on the local backend, so the account menu simply
 * renders nothing there. `getClaims()` verifies the JWT before the user is
 * trusted; the UI never reads `getSession()`.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { getBackend } from "../lib/config";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { userFromClaims, type SessionUser } from "../lib/supabase/session";

export const AUTH_USER_QUERY_KEY = "auth-user";

/** Signs the user out and returns them to the login page. */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase?.auth.signOut();
    await queryClient.invalidateQueries({ queryKey: [AUTH_USER_QUERY_KEY] });
    router.replace("/login");
    router.refresh();
  }, [queryClient, router]);
}

export function useAuthUser() {
  const backend = getBackend();

  return useQuery<SessionUser | null>({
    queryKey: [AUTH_USER_QUERY_KEY, backend],
    enabled: backend === "supabase",
    queryFn: async () => {
      const supabase = getBrowserSupabaseClient();
      if (!supabase) return null;
      const { data } = await supabase.auth.getClaims();
      return userFromClaims(data?.claims ?? null);
    },
  });
}
