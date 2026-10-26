/**
 * Adapts a real `SupabaseClient` to the narrow `SupabaseDataClient` seam used
 * by `supabase-repository.ts`. The casts are contained here; everything above
 * this file is typed against the small interface.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PostgrestTable,
  SupabaseDataClient,
  SupabaseResult,
  SupabaseRow,
} from "./supabase-client";

export function toSupabaseDataClient(client: SupabaseClient): SupabaseDataClient {
  return {
    from: (table) => client.from(table) as unknown as PostgrestTable,
    rpc: (fn, args) =>
      client.rpc(fn, args) as unknown as Promise<
        SupabaseResult<SupabaseRow | null>
      >,
  };
}
