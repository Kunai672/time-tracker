/**
 * Duration helpers. Pure functions only, no DOM or storage access.
 */

export const MS_PER_MINUTE = 60_000;

/** Parses a value into a Date, returning null when it is not a valid date. */
export function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Whole minutes between two instants, floored, never negative.
 * Invalid input yields 0.
 */
export function durationMinutesBetween(
  start: string | number | Date,
  end: string | number | Date,
): number {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return 0;
  const diff = to.getTime() - from.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / MS_PER_MINUTE);
}

/** Formats a whole number of minutes as `"1h 30m"` (or `"0m"`). */
export function formatDuration(minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Formats a whole number of seconds as a clock (`"05:30"` under an hour,
 * `"1:05:30"` otherwise). Used by the live timer display.
 */
export function formatClock(totalSeconds: number): string {
  const safe =
    Number.isFinite(totalSeconds) && totalSeconds > 0
      ? Math.floor(totalSeconds)
      : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours === 0) return `${pad(minutes)}:${pad(seconds)}`;
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

/** Decimal hours, rounded to two decimals, for chart axes. */
export function minutesToHours(minutes: number): number {
  const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  return Math.round((safe / 60) * 100) / 100;
}
