/**
 * A tiny in-memory stand-in for the slice of the Supabase/PostgREST client the
 * repository uses. It is deliberately small: it supports the exact chain
 * shapes `supabase-repository.ts` builds, the `stop_timer` RPC, the
 * `on delete set null` cascade, and a lightweight row-level-security model
 * where every client only sees rows belonging to its user.
 */
import type {
  PostgrestQuery,
  PostgrestTable,
  SupabaseDataClient,
  SupabaseResult,
  SupabaseRow,
} from "../lib/data/supabase-client";

const DEFAULT_USER = "user-1";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

type Filter = { column: string; value: unknown; negate: boolean };
type Op = "select" | "insert" | "update" | "upsert" | "delete";

export class FakeDatabase {
  private tables: Record<string, SupabaseRow[]> = {};

  /** Every stored row, regardless of owner (for scope assertions). */
  allRows(table: string): SupabaseRow[] {
    return this.table(table);
  }

  table(name: string): SupabaseRow[] {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  setTable(name: string, rows: SupabaseRow[]): void {
    this.tables[name] = rows;
  }

  clientFor(userId: string): SupabaseDataClient {
    return {
      from: (table) => new FakeTable(this, table, userId),
      rpc: (fn, args) => this.rpc(userId, fn, args),
    };
  }

  private cascadeDelete(removed: SupabaseRow[]): void {
    const deletedIds = new Set(removed.map((row) => row.id));
    for (const name of ["entries", "running_timers"]) {
      for (const row of this.table(name)) {
        if (deletedIds.has(row.category_id as string)) row.category_id = null;
      }
    }
  }

  private async rpc(
    userId: string,
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<SupabaseResult<SupabaseRow | null>> {
    if (fn !== "stop_timer") {
      return { data: null, error: { message: `Unknown RPC: ${fn}` } };
    }

    const timers = this.table("running_timers");
    const timer = timers.find((row) => row.user_id === userId);
    if (!timer) return { data: null, error: null };

    const description =
      typeof timer.description === "string" && timer.description.trim() !== ""
        ? timer.description
        : "Tracked time";

    const entry: SupabaseRow = {
      id: randomId(),
      user_id: userId,
      description,
      category_id: timer.category_id ?? null,
      started_at: timer.started_at,
      ended_at: args?.p_end ?? new Date().toISOString(),
    };
    this.table("entries").push(entry);
    this.setTable(
      "running_timers",
      timers.filter((candidate) => candidate !== timer),
    );

    return { data: entry, error: null };
  }

  /** Used by the table/query classes (kept here so the cascade stays private). */
  deleteAndCascade(name: string, removed: SupabaseRow[]): void {
    if (name === "categories") this.cascadeDelete(removed);
  }
}

class FakeQuery implements PostgrestQuery {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;

  constructor(
    private readonly db: FakeDatabase,
    private readonly tableName: string,
    private readonly userId: string,
    private readonly op: Op,
    private readonly payload?: SupabaseRow | SupabaseRow[],
    private readonly options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {}

  select(): PostgrestQuery {
    return this;
  }

  eq(column: string, value: unknown): PostgrestQuery {
    this.filters.push({ column, value, negate: false });
    return this;
  }

  neq(column: string, value: unknown): PostgrestQuery {
    this.filters.push({ column, value, negate: true });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): PostgrestQuery {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }

  async single(): Promise<SupabaseResult<SupabaseRow>> {
    const { data, error } = await this.run();
    if (error) return { data: null as unknown as SupabaseRow, error };
    if (data.length === 0) {
      return {
        data: null as unknown as SupabaseRow,
        error: { message: "No rows found", code: "PGRST116" },
      };
    }
    return { data: data[0], error: null };
  }

  async maybeSingle(): Promise<SupabaseResult<SupabaseRow | null>> {
    const { data, error } = await this.run();
    if (error) return { data: null, error };
    return { data: data[0] ?? null, error: null };
  }

  then<TResult1 = SupabaseResult<SupabaseRow[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseResult<SupabaseRow[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private visible(row: SupabaseRow): boolean {
    return row.user_id === this.userId;
  }

  private matches(row: SupabaseRow): boolean {
    if (!this.visible(row)) return false;
    return this.filters.every(({ column, value, negate }) => {
      const equal = row[column] === value;
      return negate ? !equal : equal;
    });
  }

  private sort(rows: SupabaseRow[]): SupabaseRow[] {
    if (!this.orderBy) return rows;
    const { column, ascending } = this.orderBy;
    return [...rows].sort((a, b) => {
      const left = a[column];
      const right = b[column];
      if (left === right) return 0;
      if (left === null || left === undefined) return 1;
      if (right === null || right === undefined) return -1;
      const result = String(left) < String(right) ? -1 : 1;
      return ascending ? result : -result;
    });
  }

  private insertRows(upsert: boolean): SupabaseResult<SupabaseRow[]> {
    const values = Array.isArray(this.payload)
      ? this.payload
      : [this.payload ?? {}];
    const conflictColumn = this.options?.onConflict ?? "id";
    const table = this.db.table(this.tableName);
    const inserted: SupabaseRow[] = [];

    for (const value of values) {
      const row: SupabaseRow = {
        id: value.id ?? randomId(),
        user_id: value.user_id ?? this.userId,
        created_at: value.created_at ?? new Date().toISOString(),
        ...value,
      };

      const existing = table.find(
        (candidate) =>
          candidate[conflictColumn] === row[conflictColumn] &&
          candidate.user_id === this.userId,
      );

      if (existing) {
        if (upsert) {
          if (!this.options?.ignoreDuplicates) Object.assign(existing, row);
          inserted.push(existing);
          continue;
        }
        return {
          data: [],
          error: {
            message: 'duplicate key value violates unique constraint "pkey"',
            code: "23505",
          },
        };
      }

      table.push(row);
      inserted.push(row);
    }

    return { data: inserted, error: null };
  }

  private run(): Promise<SupabaseResult<SupabaseRow[]>> {
    const table = this.db.table(this.tableName);

    switch (this.op) {
      case "select":
        return Promise.resolve({
          data: this.sort(table.filter((row) => this.matches(row))),
          error: null,
        });

      case "update": {
        const updated: SupabaseRow[] = [];
        for (const row of table) {
          if (this.matches(row)) {
            Object.assign(row, this.payload as SupabaseRow);
            updated.push(row);
          }
        }
        return Promise.resolve({ data: this.sort(updated), error: null });
      }

      case "delete": {
        const removed = table.filter((row) => this.matches(row));
        this.db.setTable(
          this.tableName,
          table.filter((row) => !this.matches(row)),
        );
        this.db.deleteAndCascade(this.tableName, removed);
        return Promise.resolve({ data: removed, error: null });
      }

      case "insert":
        return Promise.resolve(this.insertRows(false));

      case "upsert":
        return Promise.resolve(this.insertRows(true));
    }
  }
}

class FakeTable implements PostgrestTable {
  constructor(
    private readonly db: FakeDatabase,
    private readonly name: string,
    private readonly userId: string,
  ) {}

  select(): PostgrestQuery {
    return new FakeQuery(this.db, this.name, this.userId, "select");
  }

  insert(values: SupabaseRow | SupabaseRow[]): PostgrestQuery {
    return new FakeQuery(this.db, this.name, this.userId, "insert", values);
  }

  update(values: SupabaseRow): PostgrestQuery {
    return new FakeQuery(this.db, this.name, this.userId, "update", values);
  }

  upsert(
    values: SupabaseRow | SupabaseRow[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): PostgrestQuery {
    return new FakeQuery(
      this.db,
      this.name,
      this.userId,
      "upsert",
      values,
      options,
    );
  }

  delete(): PostgrestQuery {
    return new FakeQuery(this.db, this.name, this.userId, "delete");
  }
}

export function createFakeSupabaseClient(): SupabaseDataClient {
  return new FakeDatabase().clientFor(DEFAULT_USER);
}
