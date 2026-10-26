/**
 * An in-memory `DataRepository` used by tests and any future preview tooling.
 * It shares the exact behaviour of the localStorage backend because both are
 * built from `createDataRepository`.
 */
import { createDefaultData, migrate } from "../storage";
import type { AppData } from "../types";
import { createDataRepository, type DataStore } from "./create-repository";
import type { DataRepository } from "./types";

export function createMemoryRepository(
  initial: AppData = createDefaultData(),
): DataRepository {
  let state = structuredClone(initial);

  const store: DataStore = {
    // Normalise on read exactly like the localStorage backend's `load`, so the
    // fake self-heals orphaned rows and drops bad data the same way.
    read: () => migrate(structuredClone(state)),
    write: (data) => {
      state = structuredClone(data);
    },
  };

  return {
    ...createDataRepository(store),
    async getStorageStatus() {
      return "ok";
    },
  };
}
