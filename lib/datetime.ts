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

/**
 * Formats an ISO timestamp as a wall-clock time. The 12/24-hour preference is
 * passed in so the setting can be unit tested without a browser.
 */
export function formatTime(iso: string, hour12: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  });
}

/**
 * Human label for a `YYYY-MM-DD` key: "Today", "Yesterday", or a short date
 * such as "Mon, May 13". `now` is injected for deterministic tests.
 */
export function formatDayKey(key: string, now: Date): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  const date = new Date(Date.UTC(year, month - 1, day));
  const todayKey = now.toISOString().slice(0, 10);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
