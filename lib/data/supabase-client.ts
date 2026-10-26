/**
 * The narrow slice of the Supabase/PostgREST client the repository needs.
 *
 * Keeping it structural means the repository can be exercised against a small
 * in-memory fake in tests while the real `SupabaseClient` is adapted once in
 * `supabase-adapter.ts`.
 */

export type SupabaseRow = Record<string, unknown>;

export type SupabaseErrorLike = {
  message: string;
  code?: string;
} | null;

export type SupabaseResult<T> = {
  data: T;
  error: SupabaseErrorLike;
};

/** A chainable, awaitable PostgREST query. */
export interface PostgrestQuery extends PromiseLike<SupabaseResult<SupabaseRow[]>> {
  select(columns?: string): PostgrestQuery;
  eq(column: string, value: unknown): PostgrestQuery;
  neq(column: string, value: unknown): PostgrestQuery;
  order(column: string, options?: { ascending?: boolean }): PostgrestQuery;
  single(): Promise<SupabaseResult<SupabaseRow>>;
  maybeSingle(): Promise<SupabaseResult<SupabaseRow | null>>;
}

export interface PostgrestTable {
  select(columns?: string): PostgrestQuery;
  insert(values: SupabaseRow | SupabaseRow[]): PostgrestQuery;
  update(values: SupabaseRow): PostgrestQuery;
  upsert(
    values: SupabaseRow | SupabaseRow[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): PostgrestQuery;
  delete(): PostgrestQuery;
}

export interface SupabaseDataClient {
  from(table: string): PostgrestTable;
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<SupabaseResult<SupabaseRow | null>>;
}
