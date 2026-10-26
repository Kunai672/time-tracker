/**
 * First sign-in local-to-cloud migration.
 *
 * Local ids look like `entry_<uuid>` — not valid Postgres uuids — so they are
 * mapped to deterministic UUIDs. Determinism is what makes the import
 * idempotent: running it twice produces exactly the same cloud rows instead of
 * duplicating them. References between entries and categories are rewritten
 * through the same map, so they stay consistent.
 */
import { UNCATEGORIZED_ID } from "../constants";
import type { AppData } from "../types";
import type { DataRepository } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function hash128(input: string): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let seed = 0; seed < 4; seed += 1) {
    let hash = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b9)) >>> 0;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    bytes[seed * 4] = (hash >>> 24) & 0xff;
    bytes[seed * 4 + 1] = (hash >>> 16) & 0xff;
    bytes[seed * 4 + 2] = (hash >>> 8) & 0xff;
    bytes[seed * 4 + 3] = hash & 0xff;
  }
  // Stamp RFC-4122 version 4 / variant bits so Postgres accepts the value.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Maps any id to a stable UUID, preserving ids that already are uuids. */
export function toCloudId(value: string): string {
  if (value === UNCATEGORIZED_ID) return UNCATEGORIZED_ID;
  if (isUuid(value)) return value.toLowerCase();
  const hex = toHex(hash128(value));
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** True when the local snapshot carries anything worth migrating. */
export function hasMigratableData(data: AppData): boolean {
  return (
    data.entries.length > 0 ||
    data.runningTimer !== null ||
    data.categories.some((category) => category.id !== UNCATEGORIZED_ID)
  );
}

/** True when the cloud account has no tracked data yet. */
export function isCloudEmpty(
  categories: { id: string }[],
  entries: unknown[],
  runningTimer: unknown,
): boolean {
  return (
    entries.length === 0 &&
    !runningTimer &&
    categories.every((category) => category.id === UNCATEGORIZED_ID)
  );
}

/** Rewrites every id (and reference) in an `AppData` payload to stable UUIDs. */
export function mapLocalDataToCloud(data: AppData): AppData {
  const categories = data.categories.map((category) => ({
    ...category,
    id: toCloudId(category.id),
  }));
  const entries = data.entries.map((entry) => ({
    ...entry,
    id: toCloudId(entry.id),
    categoryId: toCloudId(entry.categoryId),
  }));
  const runningTimer = data.runningTimer
    ? { ...data.runningTimer, categoryId: toCloudId(data.runningTimer.categoryId) }
    : null;

  return { ...data, categories, entries, runningTimer };
}

/**
 * Imports the local snapshot into the active repository. Idempotent: the ids
 * are deterministic, so repeating the call overwrites with identical rows.
 */
export async function migrateLocalData(
  repository: DataRepository,
  local: AppData,
): Promise<void> {
  await repository.importAll(mapLocalDataToCloud(local));
}
