"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useAppData } from "../../components/AppDataProvider";
import { useSettings } from "../../components/SettingsProvider";
import { EntriesFilterBar } from "../../components/EntriesFilterBar";
import { EntriesList } from "../../components/EntriesList";
import { EntryDialog } from "../../components/EntryDialog";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useNowSeconds } from "../../components/useNow";
import {
  filterEntries,
  type DateRangePreset,
  type EntryFilters,
} from "../../lib/filters";
import { groupEntriesByDay } from "../../lib/entryGroups";
import {
  ADD_ENTRY_EVENT,
  consumeAddEntryRequest,
} from "../../lib/shortcuts";
import type { ActionResult, TimeEntry } from "../../lib/types";
import type { TimeEntryInput } from "../../lib/validation";

function EntriesSkeleton() {
  return (
    <div className="space-y-6" data-testid="entries-loading">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function EntriesPage() {
  const {
    data,
    ready,
    createEntryAction,
    updateEntryAction,
    deleteEntryAction,
    restoreEntryAction,
    startTimerAction,
    stopTimerAction,
  } = useAppData();
  const { settings } = useSettings();

  const [filters, setFilters] = useState<EntryFilters>({});
  const [preset, setPreset] = useState<DateRangePreset>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const seconds = useNowSeconds(ready);
  const now = useMemo(
    () => (seconds !== null ? new Date(seconds * 1000) : null),
    [seconds],
  );

  // The global `N` shortcut either flags the request before navigation or
  // fires an event when this page is already mounted.
  useEffect(() => {
    function openFromShortcut() {
      setEditing(null);
      setDialogOpen(true);
    }
    if (consumeAddEntryRequest()) openFromShortcut();
    window.addEventListener(ADD_ENTRY_EVENT, openFromShortcut);
    return () => window.removeEventListener(ADD_ENTRY_EVENT, openFromShortcut);
  }, []);

  const groups = useMemo(() => {
    if (!now) return [];
    return groupEntriesByDay(filterEntries(data.entries, filters));
  }, [data.entries, filters, now]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(entry: TimeEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  function handleSubmit(draft: TimeEntryInput): ActionResult {
    return editing
      ? updateEntryAction(editing.id, draft)
      : createEntryAction(draft);
  }

  function handleDelete(entry: TimeEntry) {
    deleteEntryAction(entry.id);
    toast("Entry deleted", {
      description: entry.description,
      action: {
        label: "Undo",
        onClick: () => restoreEntryAction(entry),
      },
    });
  }

  function handleResume(entry: TimeEntry) {
    // Carries the description onto the running timer so stopping keeps it.
    startTimerAction(entry.categoryId, entry.description);
    toast("Timer resumed", { description: entry.description });
  }

  function handleDuplicate(entry: TimeEntry) {
    createEntryAction({
      description: entry.description,
      categoryId: entry.categoryId,
      start: entry.start,
      end: entry.end,
    });
  }

  function handleStopRunning() {
    // The description travels with the resumed timer; stopTimer falls back to it.
    stopTimerAction("");
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h1 className="font-heading text-title font-semibold tracking-tight">
            Entries
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and edit the time you have tracked.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" aria-hidden />
          Add entry
        </Button>
      </div>

      {!ready || !now ? (
        <EntriesSkeleton />
      ) : (
        <>
          <EntriesFilterBar
            filters={filters}
            preset={preset}
            categories={data.categories}
            now={now}
            onChange={setFilters}
            onPresetChange={setPreset}
          />
          <div className="pt-6">
            <EntriesList
              groups={groups}
              categories={data.categories}
              now={now}
              hour12={settings.timeFormat === "12h"}
              onEdit={openEdit}
              onDelete={handleDelete}
              runningTimer={data.runningTimer}
              onResume={handleResume}
              onDuplicate={handleDuplicate}
              onStop={handleStopRunning}
            />
          </div>
        </>
      )}

      {dialogOpen && (
        <EntryDialog
          open
          onOpenChange={setDialogOpen}
          categories={data.categories}
          entry={editing}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
