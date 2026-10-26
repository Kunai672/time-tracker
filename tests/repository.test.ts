/**
 * Runs the shared repository contract against both the localStorage backend
 * (using an injected in-memory `StorageLike`) and the in-memory fake.
 */
import { createLocalRepository } from "../lib/data/local-repository";
import { createMemoryRepository } from "../lib/data/memory-repository";
import type { StorageLike } from "../lib/storage";
import { runRepositoryContract } from "./repository-contract";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

runRepositoryContract("local repository", () =>
  createLocalRepository(memoryStorage()),
);

runRepositoryContract("memory repository", () => createMemoryRepository());
