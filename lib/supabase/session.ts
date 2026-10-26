/**
 * Pure session helpers shared by the proxy (session refresh + redirect) and
 * the UI. Keeping the rules here makes the routing behaviour unit-testable
 * without a running server.
 */

export type SessionUser = {
  id: string;
  email: string | null;
};

export type ClaimsLike = {
  sub?: string;
  email?: string;
} | null;

/** Paths that must stay reachable while signed out. */
const AUTH_PATHS = ["/login", "/signup", "/auth"];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Signed-out visitors are sent to the login page from every other route. */
export function shouldRedirectToLogin(
  pathname: string,
  authenticated: boolean,
): boolean {
  return !authenticated && !isAuthPath(pathname);
}

/** Maps verified JWT claims to the minimal user the UI needs. */
export function userFromClaims(claims: ClaimsLike): SessionUser | null {
  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email ?? null };
}
