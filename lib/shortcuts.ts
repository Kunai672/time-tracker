/**
 * Pure keyboard-shortcut decisions plus a tiny request channel used to open
 * the Add entry dialog from anywhere in the app.
 *
 * The guard functions take a structural target (`{ tagName, isContentEditable,
 * getAttribute }`) instead of a DOM `HTMLElement` so they stay testable in
 * Node without jsdom.
 */

export type ShortcutAction = "add-entry" | "toggle-timer" | "help";

/** Rows shown in the "?" help dialog. */
export const SHORTCUTS: readonly { keys: string; description: string }[] = [
  { keys: "N", description: "Add entry" },
  { keys: "Space", description: "Start or stop the timer" },
  { keys: "?", description: "Show this help" },
] as const;

export type ShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
};

/** True when a shortcut should be ignored because the user is typing or on a control. */
export function shouldIgnoreShortcut(
  target: ShortcutTarget | null | undefined,
): boolean {
  if (!target) return false;
  const tag = (target.tagName ?? "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (tag === "button" || tag === "a") return true;
  if (target.isContentEditable) return true;
  if (target.getAttribute?.("role") === "button") return true;
  return false;
}

export type ShortcutEvent = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
};

/**
 * Maps a key event to an action. Modifier combinations are ignored so the
 * shortcuts never shadow browser or OS bindings.
 */
export function shortcutFor(event: ShortcutEvent): ShortcutAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === "n" || event.key === "N") return "add-entry";
  if (event.key === " " || event.key === "Spacebar") return "toggle-timer";
  if (event.key === "?") return "help";
  return null;
}

export const ADD_ENTRY_EVENT = "time-tracker:add-entry";

let addEntryRequested = false;

/**
 * Asks the entries page to open the Add entry dialog. Sets a one-shot flag
 * (for the next mount after navigation) and fires an event (for an already
 * mounted page). Safe to call on the server.
 */
export function requestAddEntry(): void {
  addEntryRequested = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADD_ENTRY_EVENT));
  }
}

/** Reads and clears the pending Add entry request. */
export function consumeAddEntryRequest(): boolean {
  const pending = addEntryRequested;
  addEntryRequested = false;
  return pending;
}

/** Test-only reset so module state does not leak between cases. */
export function clearAddEntryRequest(): void {
  addEntryRequested = false;
}
