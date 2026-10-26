"use client";

/**
 * Provides the active `DataRepository` and a TanStack Query client to the
 * tree. Every data hook reads the repository from here, which is what lets
 * the local and Supabase backends be swapped without touching the UI.
 */
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { createAppRepository } from "../lib/data/app-repository";
import type { DataRepository } from "../lib/data/types";

const RepositoryContext = createContext<DataRepository | null>(null);

export type DataProviderProps = {
  children: ReactNode;
  /** Test/Storybook seam; production resolves the backend lazily. */
  repository?: DataRepository;
};

export function DataProvider({ children, repository }: DataProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  const [defaultRepository] = useState(() => createAppRepository());
  const activeRepository = repository ?? defaultRepository;

  return (
    <RepositoryContext.Provider value={activeRepository}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RepositoryContext.Provider>
  );
}

export function useRepository(): DataRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error("useRepository must be used within a DataProvider");
  }
  return repository;
}
