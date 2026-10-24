/**
 * Conversion helpers between stored ISO timestamps and the value format used
 * by `<input type="datetime-local">`. Pure and testable.
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** ISO -> `YYYY-MM-DDTHH:mm` in the local timezone (or "" when invalid). */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** `YYYY-MM-DDTHH:mm` (local) -> ISO timestamp (or "" when invalid). */
export function fromDatetimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

/** Local `YYYY-MM-DD` key for "today", used as a default filter bound. */
export function todayDateKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local `YYYY-MM-DD` for an ISO timestamp. */
export function isoToLocalDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
