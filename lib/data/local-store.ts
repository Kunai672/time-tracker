/**
 * A tiny external store over the local `localStorage` snapshot.
 *
 * The migration dialog needs to read whatever is in the browser *before* the
 * user signs in and it must be hydration-safe, so the snapshot is cached (a
 * fresh object on every call would make `useSyncExternalStore` loop).
 */
import { clear, createDefaultData, load } from "../storage";
import type { AppData } from "../types";

const serverSnapshot: AppData = createDefaultData();

let clientSnapshot: AppData | null = null;
const listeners = new Set<() => void>();

export function getLocalDataServerSnapshot(): AppData {
  return serverSnapshot;
}

export function getLocalDataSnapshot(): AppData {
  if (!clientSnapshot) clientSnapshot = load();
  return clientSnapshot;
}

export function subscribeLocalData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Removes the persisted local data and publishes an empty snapshot. */
export function clearLocalData(): void {
  clear();
  clientSnapshot = createDefaultData();
  for (const listener of listeners) listener();
}
