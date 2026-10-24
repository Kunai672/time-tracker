"use client";

import { useSyncExternalStore } from "react";

/**
 * A once-per-second clock exposed through `useSyncExternalStore`.
 *
 * Reading `Date.now()` during render is forbidden while Next.js prerenders,
 * and setting state synchronously inside an effect is discouraged, so the
 * clock is an external store: the server snapshot is `null` and the browser
 * snapshot is the current epoch second. Pass `enabled: false` to stop ticking.
 */
function subscribeToSeconds(onChange: () => void): () => void {
  const handle = window.setInterval(onChange, 1000);
  return () => window.clearInterval(handle);
}

function subscribeNever(): () => void {
  return () => {};
}

function getSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getServerSeconds(): null {
  return null;
}

export function useNowSeconds(enabled: boolean): number | null {
  return useSyncExternalStore(
    enabled ? subscribeToSeconds : subscribeNever,
    getSeconds,
    getServerSeconds,
  );
}
