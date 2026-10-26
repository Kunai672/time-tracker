/**
 * The ONLY module that talks to localStorage.
 *
 * - SSR safe: when `window` is undefined every function degrades gracefully.
 * - Versioned: data is stored with a schema version and migrated forward.
 * - Defensive: empty, corrupt or unknown data yields defaults instead of throwing.
 *
 * The storage backend is injectable so tests can exercise every branch without
 * a browser.
 */
import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  STORAGE_KEY,
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_ID,
} from "./constants";
import type {
  AppData,
  Category,
  RunningTimer,
  Settings,
  TimeEntry,
} from "./types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Returns localStorage when it is available, otherwise null. */
export function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createDefaultData(): AppData {
  return {
    version: SCHEMA_VERSION,
    categories: [{ ...UNCATEGORIZED_CATEGORY }],
    entries: [],
    runningTimer: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.color === "string"
  );
}

export function isTimeEntry(value: unknown): value is TimeEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.description === "string" &&
    typeof value.categoryId === "string" &&
    typeof value.start === "string" &&
    !Number.isNaN(new Date(value.start).getTime()) &&
    typeof value.end === "string" &&
    !Number.isNaN(new Date(value.end).getTime()) &&
    typeof value.durationMinutes === "number" &&
    Number.isFinite(value.durationMinutes)
  );
}

export function isRunningTimer(value: unknown): value is RunningTimer {
  if (!isRecord(value)) return false;
  return (
    typeof value.categoryId === "string" &&
    value.categoryId.length > 0 &&
    typeof value.startedAt === "string" &&
    !Number.isNaN(new Date(value.startedAt).getTime()) &&
    (value.description === undefined || typeof value.description === "string")
  );
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered migrations keyed by the version they upgrade FROM. `migrations[0]`
 * turns a legacy (unversioned) payload into version 1.
 */
const migrations: Record<number, Migration> = {
  0: (data) => ({
    ...data,
    version: 1,
    runningTimer: isRunningTimer(data.runningTimer) ? data.runningTimer : null,
  }),
};

/** Normalises an arbitrary object into a valid AppData, dropping bad rows. */
function normalize(data: Record<string, unknown>): AppData {
  const categories = Array.isArray(data.categories)
    ? data.categories.filter(isCategory).map((category) => ({ ...category }))
    : [];

  if (!categories.some((category) => category.id === UNCATEGORIZED_ID)) {
    categories.unshift({ ...UNCATEGORIZED_CATEGORY });
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const entries = Array.isArray(data.entries)
    ? data.entries
        .filter(isTimeEntry)
        .map((entry) =>
          categoryIds.has(entry.categoryId)
            ? { ...entry }
            : { ...entry, categoryId: UNCATEGORIZED_ID },
        )
    : [];

  const runningTimer =
    isRunningTimer(data.runningTimer) &&
    categoryIds.has(data.runningTimer.categoryId)
      ? { ...data.runningTimer }
      : null;

  return {
    version: SCHEMA_VERSION,
    categories,
    entries,
    runningTimer,
  };
}

/**
 * Migrates an unknown parsed value to the current schema version. Never
 * throws: anything unrecognisable becomes the default dataset.
 */
export function migrate(raw: unknown): AppData {
  if (!isRecord(raw)) return createDefaultData();

  const version =
    typeof raw.version === "number" && Number.isInteger(raw.version)
      ? raw.version
      : 0;

  // Data written by a newer app version cannot be safely downgraded.
  if (version > SCHEMA_VERSION) return createDefaultData();

  let data: Record<string, unknown> = { ...raw };
  for (let from = version; from < SCHEMA_VERSION; from += 1) {
    const step = migrations[from];
    if (!step) break;
    data = step(data);
  }

  return normalize(data);
}

/** How the persisted data was read, so the UI can offer a recovery path. */
export type StorageStatus = "ok" | "empty" | "corrupt";

export type StorageLoadResult = {
  data: AppData;
  status: StorageStatus;
};

/**
 * Like `load`, but also reports whether the stored payload was missing/empty
 * or unreadable/corrupt. Never throws: unusable data still yields defaults.
 */
export function loadWithStatus(
  storage: StorageLike | null = getDefaultStorage(),
): StorageLoadResult {
  if (!storage) return { data: createDefaultData(), status: "empty" };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: createDefaultData(), status: "corrupt" };
  }

  if (raw === null || raw === "") {
    return { data: createDefaultData(), status: "empty" };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const data = migrate(parsed);
    return { data, status: isRecord(parsed) ? "ok" : "corrupt" };
  } catch {
    return { data: createDefaultData(), status: "corrupt" };
  }
}

/**
 * Loads persisted data. Returns defaults when storage is unavailable, empty,
 * corrupt, or written by an incompatible version.
 */
export function load(storage: StorageLike | null = getDefaultStorage()): AppData {
  return loadWithStatus(storage).data;
}

/** Persists data. A missing/throwing storage backend is a silent no-op. */
export function save(
  data: AppData,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota errors or private-mode restrictions must not crash the app.
  }
}

/* ------------------------------------------------------------------ *
 * External store
 *
 * A tiny store so React can read persisted data through
 * `useSyncExternalStore`. The server snapshot is a stable default and the
 * client snapshot is loaded lazily, so hydration never mismatches.
 * ------------------------------------------------------------------ */

export type AppDataSnapshot = {
  data: AppData;
  ready: boolean;
  status: StorageStatus;
};

let clientSnapshot: AppDataSnapshot | null = null;
const listeners = new Set<() => void>();
const serverSnapshot: AppDataSnapshot = {
  data: createDefaultData(),
  ready: false,
  status: "ok",
};

/** Stable snapshot used while rendering on the server / hydrating. */
export function getServerSnapshot(): AppDataSnapshot {
  return serverSnapshot;
}

/** Current client snapshot (loads from storage on first call). */
export function getSnapshot(): AppDataSnapshot {
  if (!clientSnapshot) {
    const result = loadWithStatus();
    clientSnapshot = { data: result.data, ready: true, status: result.status };
  }
  return clientSnapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Persists and publishes a new snapshot to every subscriber. */
export function writeData(next: AppData): void {
  clientSnapshot = { data: next, ready: true, status: "ok" };
  save(next);
  for (const listener of listeners) listener();
}

/** Removes persisted data (used by tests and a future "reset" action). */
export function clear(storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/* ------------------------------------------------------------------ *
 * User settings (time format)
 *
 * Stored under a separate key so preferences survive a data reset. The same
 * injectable backend and defensive parsing as the main data apply.
 * ------------------------------------------------------------------ */

export function loadSettings(
  storage: StorageLike | null = getDefaultStorage(),
): Settings {
  if (!storage) return { ...DEFAULT_SETTINGS };

  let raw: string | null;
  try {
    raw = storage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (raw === null || raw === "") return { ...DEFAULT_SETTINGS };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS };
    return {
      timeFormat: parsed.timeFormat === "12h" ? "12h" : "24h",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(
  settings: Settings,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

let clientSettingsSnapshot: Settings | null = null;
const settingsListeners = new Set<() => void>();
const serverSettingsSnapshot: Settings = { ...DEFAULT_SETTINGS };

export function getSettingsServerSnapshot(): Settings {
  return serverSettingsSnapshot;
}

export function getSettingsSnapshot(): Settings {
  if (!clientSettingsSnapshot) {
    clientSettingsSnapshot = loadSettings();
  }
  return clientSettingsSnapshot;
}

export function subscribeSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export function writeSettings(next: Settings): void {
  clientSettingsSnapshot = next;
  saveSettings(next);
  for (const listener of settingsListeners) listener();
}
