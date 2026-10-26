/**
 * Root proxy (Next.js 16's renamed middleware).
 *
 * Deliberately thin: it only refreshes the Supabase session and redirects
 * unauthenticated visitors to `/login` when the Supabase backend is active.
 * All the logic lives in `lib/supabase/middleware.ts` so it is unit-tested.
 */
import type { NextRequest } from "next/server";

import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next internals, the favicon and static images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
