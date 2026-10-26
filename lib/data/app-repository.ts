/**
 * Picks the repository for the current runtime.
 *
 * Supabase is used only in the browser and only when it is fully configured;
 * everywhere else (server rendering, no config, explicit local override) the
 * app falls back to the localStorage backend.
 */
import { getBackend } from "../config";
import { getBrowserSupabaseClient } from "../supabase/client";
import { createLocalRepository } from "./local-repository";
import { toSupabaseDataClient } from "./supabase-adapter";
import { createSupabaseRepository } from "./supabase-repository";
import type { DataRepository } from "./types";

export function createAppRepository(): DataRepository {
  if (typeof window !== "undefined" && getBackend() === "supabase") {
    const client = getBrowserSupabaseClient();
    if (client) return createSupabaseRepository(toSupabaseDataClient(client));
  }
  return createLocalRepository();
}
