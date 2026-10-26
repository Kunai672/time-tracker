/**
 * Backend selection.
 *
 * The app uses Supabase when both `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set, and otherwise falls back to
 * the local `localStorage` backend, so the app works with no configuration at
 * all. The decision logic is a pure function so it can be unit tested without
 * touching the real environment.
 */

export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

/**
 * A `localStorage` flag that lets tests, previews and the audit force a
 * backend at runtime without rebuilding. Never set by the app itself.
 */
export const BACKEND_OVERRIDE_STORAGE_KEY = "time-tracker-backend";

/**
 * Server/runtime backend override. Unlike the `NEXT_PUBLIC_*` vars this one is
 * not loaded from `.env.local`, so tests, previews and the audit can force a
 * backend with `TIME_TRACKER_BACKEND=local` on the command line.
 */
export const BACKEND_ENV = "TIME_TRACKER_BACKEND";

export type Backend = "supabase" | "local";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export type EnvInput = {
  url?: string;
  key?: string;
};

/** True when both values are present and not blank. */
export function hasSupabaseConfig(env: EnvInput): boolean {
  return Boolean(env.url?.trim() && env.key?.trim());
}

/** The public Supabase configuration, or `null` when it is incomplete. */
export function resolveSupabaseConfig(env: EnvInput): SupabaseConfig | null {
  if (!hasSupabaseConfig(env)) return null;
  return {
    url: env.url!.trim(),
    publishableKey: env.key!.trim(),
  };
}

/** Pure backend decision: Supabase when fully configured, else local. */
export function resolveBackend(env: EnvInput): Backend {
  return hasSupabaseConfig(env) ? "supabase" : "local";
}

/**
 * Reads the public env vars. The `process.env.NEXT_PUBLIC_*` references are
 * literal so Next.js inlines them into the client bundle.
 */
export function readPublicEnv(): EnvInput {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** Reads the optional server/runtime backend override. */
export function readRuntimeBackendOverride(
  env: Record<string, string | undefined> = process.env,
): Backend | null {
  const value = env[BACKEND_ENV];
  return value === "local" || value === "supabase" ? value : null;
}

/** Reads the optional runtime backend override from `localStorage`. */
export function readBackendOverride(): Backend | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(BACKEND_OVERRIDE_STORAGE_KEY);
    return value === "local" || value === "supabase" ? value : null;
  } catch {
    return null;
  }
}

/**
 * The effective backend for the current runtime. A runtime override (used by
 * the audit harness) wins; otherwise it is derived from the public env vars.
 */
export function getBackend(): Backend {
  return (
    readBackendOverride() ??
    readRuntimeBackendOverride() ??
    resolveBackend(readPublicEnv())
  );
}

/** The public configuration derived from the active backend, or `null`. */
export function getSupabaseConfig(): SupabaseConfig | null {
  if (getBackend() === "local") return null;
  return resolveSupabaseConfig(readPublicEnv());
}
