/**
 * The localStorage-backed `DataRepository`.
 *
 * This is the default backend and the fallback whenever Supabase is not
 * configured. It is a thin adapter around the unchanged `lib/storage.ts`
 * primitives, so all of its defensive parsing/migration behaviour is reused.
 */
import {
  getDefaultStorage,
  load,
  loadWithStatus,
  save,
  type StorageLike,
} from "../storage";
import { createDataRepository, type DataStore } from "./create-repository";
import type { DataRepository } from "./types";

export function createLocalRepository(
  storage: StorageLike | null = getDefaultStorage(),
): DataRepository {
  const store: DataStore = {
    read: () => load(storage),
    write: (data) => save(data, storage),
  };

  return {
    ...createDataRepository(store),
    async getStorageStatus() {
      return loadWithStatus(storage).status;
    },
  };
}
