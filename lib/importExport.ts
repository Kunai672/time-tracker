/**
 * JSON export / import. Import validates the whole payload before returning,
 * so a malformed file can never partially overwrite existing data.
 */
import { SCHEMA_VERSION } from "./constants";
import {
  isCategory,
  isRunningTimer,
  isTimeEntry,
  migrate,
} from "./storage";
import type { AppData } from "./types";

export type ImportResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Serialises data with a stable, human-readable shape. */
export function exportData(data: AppData): string {
  return JSON.stringify({ ...data, version: SCHEMA_VERSION }, null, 2);
}

/**
 * Parses and validates an imported JSON string. Returns a result union rather
 * than throwing; callers only persist on `ok: true`.
 */
export function importData(json: string): ImportResult {
  if (typeof json !== "string" || json.trim().length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Expected a JSON object at the top level." };
  }

  if (typeof parsed.version !== "number" || !Number.isInteger(parsed.version)) {
    return { ok: false, error: "Missing or invalid schema version." };
  }

  if (parsed.version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schema version ${parsed.version}.`,
    };
  }

  if (!Array.isArray(parsed.categories) || !parsed.categories.every(isCategory)) {
    return { ok: false, error: "Missing or malformed categories." };
  }

  if (!Array.isArray(parsed.entries) || !parsed.entries.every(isTimeEntry)) {
    return { ok: false, error: "Missing or malformed entries." };
  }

  if (parsed.runningTimer != null && !isRunningTimer(parsed.runningTimer)) {
    return { ok: false, error: "Malformed running timer." };
  }

  return { ok: true, data: migrate(parsed) };
}
