/**
 * Pure helper for the browser tab title. Kept out of React so the running /
 * idle formatting can be unit tested without a document.
 */
import { formatLongClock } from "./duration";
import { elapsedSeconds } from "./timer";
import type { RunningTimer } from "./types";

export const APP_TITLE = "Time Tracker";

/**
 * `"● 00:42:10 · Time Tracker"` while a timer runs, otherwise the plain app
 * title. `now` is injected so tests stay deterministic.
 */
export function formatDocumentTitle(
  timer: RunningTimer | null,
  now: Date,
): string {
  if (!timer) return APP_TITLE;
  return `● ${formatLongClock(elapsedSeconds(timer, now))} · ${APP_TITLE}`;
}
