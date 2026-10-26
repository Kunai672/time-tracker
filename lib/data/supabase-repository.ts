/**
 * The Supabase/Postgres `DataRepository`.
 *
 * It maps the snake_case database rows to the app's camelCase models, maps a
 * `null` category to the built-in Uncategorized category, and turns Supabase
 * errors into typed errors the UI can toast. Stopping a timer always goes
 * through the atomic `stop_timer` function.
 */
import {
  SCHEMA_VERSION,
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_ID,
} from "../constants";
import { durationMinutesBetween } from "../duration";
import { importData } from "../importExport";
import type { AppData, Category, RunningTimer, TimeEntry } from "../types";
import {
  DataValidationError,
  DataWriteError,
  type CategoryDraft,
  type CategoryPatch,
  type DataRepository,
  type EntryDraft,
  type StartTimerInput,
  type StopTimerInput,
} from "./types";
import type { SupabaseDataClient, SupabaseRow } from "./supabase-client";

/** Matches every row while keeping PostgREST's "no unfiltered write" guard happy. */
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const ENTRY_COLUMNS = "id,description,category_id,started_at,ended_at";
const CATEGORY_COLUMNS = "id,name,color";
const TIMER_COLUMNS = "description,category_id,started_at";

type CategoryRow = {
  id: string;
  name: string;
  color: string;
};

type EntryRow = {
  id: string;
  description: string;
  category_id: string | null;
  started_at: string;
  ended_at: string;
};

type TimerRow = {
  description: string | null;
  category_id: string | null;
  started_at: string;
};

function toCategory(row: SupabaseRow): Category {
  const value = row as CategoryRow;
  return { id: value.id, name: value.name, color: value.color };
}

function toEntry(row: SupabaseRow): TimeEntry {
  const value = row as EntryRow;
  return {
    id: value.id,
    description: value.description,
    categoryId: value.category_id ?? UNCATEGORIZED_ID,
    start: value.started_at,
    end: value.ended_at,
    durationMinutes: durationMinutesBetween(value.started_at, value.ended_at),
  };
}

function toTimer(row: SupabaseRow): RunningTimer {
  const value = row as TimerRow;
  const timer: RunningTimer = {
    categoryId: value.category_id ?? UNCATEGORIZED_ID,
    startedAt: value.started_at,
  };
  const description = value.description?.trim();
  if (description) timer.description = description;
  return timer;
}

/** The Uncategorized bucket is synthetic and has no database row. */
function toCategoryId(categoryId: string): string | null {
  return categoryId === UNCATEGORIZED_ID ? null : categoryId;
}

function writeError(error: { message: string } | null): DataWriteError {
  return new DataWriteError(error?.message ?? "Unknown Supabase error.");
}

export function createSupabaseRepository(
  client: SupabaseDataClient,
): DataRepository {
  async function listCategories(): Promise<Category[]> {
    const { data, error } = await client
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw writeError(error);
    return [
      { ...UNCATEGORIZED_CATEGORY },
      ...(data ?? []).map(toCategory),
    ];
  }

  async function listEntries(): Promise<TimeEntry[]> {
    const { data, error } = await client
      .from("entries")
      .select(ENTRY_COLUMNS)
      .order("started_at", { ascending: false });
    if (error) throw writeError(error);
    return (data ?? []).map(toEntry);
  }

  async function getRunningTimer(): Promise<RunningTimer | null> {
    const { data, error } = await client
      .from("running_timers")
      .select(TIMER_COLUMNS)
      .maybeSingle();
    if (error) throw writeError(error);
    return data ? toTimer(data) : null;
  }

  async function wipeUserData(): Promise<void> {
    const results = await Promise.all([
      client.from("entries").delete().neq("id", ZERO_UUID),
      client.from("running_timers").delete().neq("user_id", ZERO_UUID),
      client.from("categories").delete().neq("id", ZERO_UUID),
    ]);
    for (const result of results) {
      if (result.error) throw writeError(result.error);
    }
  }

  return {
    listCategories,
    listEntries,
    getRunningTimer,

    async createCategory(draft: CategoryDraft) {
      const { data, error } = await client
        .from("categories")
        .insert({ name: draft.name.trim(), color: draft.color.trim() })
        .select(CATEGORY_COLUMNS)
        .single();
      if (error) throw writeError(error);
      return toCategory(data as SupabaseRow);
    },

    async updateCategory(id: string, patch: CategoryPatch) {
      const values: SupabaseRow = {};
      if (patch.name !== undefined) values.name = patch.name.trim();
      if (patch.color !== undefined) values.color = patch.color.trim();

      const { data, error } = await client
        .from("categories")
        .update(values)
        .eq("id", id)
        .select(CATEGORY_COLUMNS)
        .single();
      if (error) throw writeError(error);
      return toCategory(data as SupabaseRow);
    },

    async deleteCategory(id: string) {
      if (id === UNCATEGORIZED_ID) return;
      // The FK `on delete set null` reassigns entries and clears the timer.
      const { error } = await client.from("categories").delete().eq("id", id);
      if (error) throw writeError(error);
    },

    async createEntry(draft: EntryDraft) {
      const { data, error } = await client
        .from("entries")
        .insert({
          description: draft.description.trim(),
          category_id: toCategoryId(draft.categoryId),
          started_at: draft.start,
          ended_at: draft.end,
        })
        .select(ENTRY_COLUMNS)
        .single();
      if (error) throw writeError(error);
      return toEntry(data as SupabaseRow);
    },

    async updateEntry(id: string, draft: EntryDraft) {
      const { data, error } = await client
        .from("entries")
        .update({
          description: draft.description.trim(),
          category_id: toCategoryId(draft.categoryId),
          started_at: draft.start,
          ended_at: draft.end,
        })
        .eq("id", id)
        .select(ENTRY_COLUMNS)
        .single();
      if (error) throw writeError(error);
      return toEntry(data as SupabaseRow);
    },

    async deleteEntry(id: string) {
      const { error } = await client.from("entries").delete().eq("id", id);
      if (error) throw writeError(error);
    },

    async restoreEntry(entry: TimeEntry) {
      const { data, error } = await client
        .from("entries")
        .insert({
          id: entry.id,
          description: entry.description,
          category_id: toCategoryId(entry.categoryId),
          started_at: entry.start,
          ended_at: entry.end,
        })
        .select(ENTRY_COLUMNS)
        .single();
      if (error) {
        // Undo is idempotent: an existing row means the restore already happened.
        if (error.code === "23505") return entry;
        throw writeError(error);
      }
      return toEntry(data as SupabaseRow);
    },

    async startTimer(input: StartTimerInput) {
      const { data, error } = await client
        .from("running_timers")
        .upsert(
          {
            category_id: toCategoryId(input.categoryId),
            description: input.description ?? "",
            started_at: input.startedAt ?? new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select(TIMER_COLUMNS)
        .single();
      if (error) throw writeError(error);
      return toTimer(data as SupabaseRow);
    },

    async stopTimer(input: StopTimerInput = {}) {
      const timer = await getRunningTimer();
      if (!timer) return null;

      const description = input.description?.trim();
      if (description && description !== (timer.description ?? "")) {
        const { error } = await client
          .from("running_timers")
          .update({ description })
          .eq("started_at", timer.startedAt);
        if (error) throw writeError(error);
      }

      const { data, error } = await client.rpc("stop_timer", {
        p_end: input.end ?? new Date().toISOString(),
      });
      if (error) throw writeError(error);
      return data ? toEntry(data) : null;
    },

    async exportAll(): Promise<AppData> {
      const [categories, entries, runningTimer] = await Promise.all([
        listCategories(),
        listEntries(),
        getRunningTimer(),
      ]);
      return { version: SCHEMA_VERSION, categories, entries, runningTimer };
    },

    async importAll(data: AppData) {
      const parsed = importData(JSON.stringify(data));
      if (!parsed.ok) throw new DataValidationError(parsed.error);
      const next = parsed.data;

      await wipeUserData();

      const categories = next.categories
        .filter((category) => category.id !== UNCATEGORIZED_ID)
        .map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
        }));
      if (categories.length > 0) {
        const { error } = await client.from("categories").insert(categories);
        if (error) throw writeError(error);
      }

      const entries = next.entries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        category_id: toCategoryId(entry.categoryId),
        started_at: entry.start,
        ended_at: entry.end,
      }));
      if (entries.length > 0) {
        const { error } = await client.from("entries").insert(entries);
        if (error) throw writeError(error);
      }

      if (next.runningTimer) {
        const { error } = await client
          .from("running_timers")
          .upsert(
            {
              category_id: toCategoryId(next.runningTimer.categoryId),
              description: next.runningTimer.description ?? "",
              started_at: next.runningTimer.startedAt,
            },
            { onConflict: "user_id" },
          );
        if (error) throw writeError(error);
      }
    },

    async getStorageStatus() {
      return "ok";
    },
  };
}
