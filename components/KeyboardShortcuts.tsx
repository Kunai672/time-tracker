"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  SHORTCUTS,
  requestAddEntry,
  shouldIgnoreShortcut,
  shortcutFor,
  type ShortcutTarget,
} from "../lib/shortcuts";
import { useAppData } from "./AppDataProvider";

/**
 * Global keyboard shortcuts:
 * - `N` opens the Add entry dialog (navigating to Entries when needed),
 * - `Space` starts or stops the timer,
 * - `?` opens the shortcut help dialog.
 *
 * Shortcuts never fire while the user is typing or focused on a control.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const { data, startTimerAction, stopTimerAction } = useAppData();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (helpOpen) return;
      if (shouldIgnoreShortcut(event.target as ShortcutTarget)) return;
      const action = shortcutFor(event);
      if (!action) return;

      event.preventDefault();

      if (action === "add-entry") {
        requestAddEntry();
        router.push("/entries");
        return;
      }

      if (action === "toggle-timer") {
        if (data.runningTimer) {
          stopTimerAction("");
        } else {
          const categoryId = data.categories[0]?.id;
          if (categoryId) startTimerAction(categoryId);
        }
        return;
      }

      setHelpOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    data.categories,
    data.runningTimer,
    helpOpen,
    router,
    startTimerAction,
    stopTimerAction,
  ]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Skip the mouse for the common actions.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-sm">{shortcut.description}</dt>
              <dd>
                <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-sans text-xs font-medium">
                  {shortcut.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
