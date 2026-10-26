"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  subscribeSettings,
  writeSettings,
} from "../lib/storage";
import type { Settings, TimeFormat } from "../lib/types";

export type SettingsContextValue = {
  settings: Settings;
  setTimeFormat: (format: TimeFormat) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Reads preferences from the settings store. The server snapshot is the
 * default, so hydration is stable and the stored value arrives right after.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setTimeFormat(timeFormat) {
        writeSettings({ ...getSettingsSnapshot(), timeFormat });
      },
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
