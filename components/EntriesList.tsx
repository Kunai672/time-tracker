"use client";

import Link from "next/link";
import {
  ClockIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";

import { Button, buttonVariants } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { findCategory } from "../lib/categories";
import { formatDayKey, formatTime } from "../lib/datetime";
import { elapsedMinutes, elapsedSeconds } from "../lib/timer";
import { formatClock, formatDuration } from "../lib/duration";
import type { EntryGroup } from "../lib/entryGroups";
import type { Category, RunningTimer, TimeEntry } from "../lib/types";

export type EntriesListProps = {
  groups: EntryGroup[];
  categories: Category[];
  /** Injected clock so "Today"/"Yesterday" labels are deterministic. */
  now: Date;
  hour12: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  /** A live timer, rendered as the first row of Today. */
  runningTimer?: RunningTimer | null;
  onResume?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  onStop?: () => void;
};

function EmptyEntries() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <ClockIcon className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">No entries yet</p>
        <p className="text-sm text-muted-foreground">
          Track your first block of time to see it here.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Start your first timer
      </Link>
    </div>
  );
}

function RunningRow({
  timer,
  categories,
  now,
  onStop,
}: {
  timer: RunningTimer;
  categories: Category[];
  now: Date;
  onStop?: () => void;
}) {
  const category = findCategory(categories, timer.categoryId);

  return (
    <li
      data-testid="entries-running-row"
      className="flex min-h-11 items-center gap-3 rounded-lg bg-primary/5 px-2 py-2"
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {timer.description || "Tracking time"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {category?.name ?? "Uncategorized"} · Running now
        </p>
      </div>
      <span
        data-testid="entries-running-clock"
        className="shrink-0 text-sm font-medium tabular-nums"
      >
        {formatClock(elapsedSeconds(timer, now))}
      </span>
      {onStop && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onStop}
          className="shrink-0"
        >
          <SquareIcon data-icon="inline-start" aria-hidden />
          Stop
        </Button>
      )}
    </li>
  );
}

function EntryRow({
  entry,
  categories,
  hour12,
  onEdit,
  onDelete,
  onResume,
  onDuplicate,
}: {
  entry: TimeEntry;
  categories: Category[];
  hour12: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  onResume?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
}) {
  const category = findCategory(categories, entry.categoryId);
  const range = `${formatTime(entry.start, hour12)} – ${formatTime(
    entry.end,
    hour12,
  )}`;

  return (
    <li className="flex min-h-11 items-center gap-3 py-2.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category?.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.description}</p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {range}
          <span className="mx-1.5">·</span>
          {category?.name ?? "Uncategorized"}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatDuration(entry.durationMinutes)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${entry.description}`}
            />
          }
        >
          <MoreHorizontalIcon aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onResume?.(entry)}>
            <PlayIcon aria-hidden />
            Resume
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate?.(entry)}>
            <CopyIcon aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(entry)}>
            <PencilIcon aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(entry)}
          >
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Entries grouped by day, with sticky headers and a live running row. */
export function EntriesList({
  groups,
  categories,
  now,
  hour12,
  onEdit,
  onDelete,
  runningTimer = null,
  onResume,
  onDuplicate,
  onStop,
}: EntriesListProps) {
  if (groups.length === 0 && !runningTimer) {
    return <EmptyEntries />;
  }

  const todayKey = now.toISOString().slice(0, 10);
  const sections = [...groups];
  let runningGroup = -1;

  if (runningTimer) {
    runningGroup = sections.findIndex((group) => group.date === todayKey);
    if (runningGroup === -1) {
      sections.unshift({ date: todayKey, totalMinutes: 0, entries: [] });
      runningGroup = 0;
    }
  }

  return (
    <div className="space-y-6">
      {sections.map((group, index) => {
        const showRunning = Boolean(runningTimer) && index === runningGroup;
        const runningMinutes =
          showRunning && runningTimer
            ? elapsedMinutes(runningTimer, now)
            : 0;

        return (
          <section key={group.date} aria-label={`Entries for ${group.date}`}>
            <div className="sticky top-14 z-10 flex items-baseline justify-between gap-2 border-b border-border bg-background pt-2 pb-1.5 md:top-[7.5rem]">
              <h2 className="text-sm font-semibold">
                {formatDayKey(group.date, now)}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDuration(group.totalMinutes + runningMinutes)}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {showRunning && runningTimer && (
                <RunningRow
                  timer={runningTimer}
                  categories={categories}
                  now={now}
                  onStop={onStop}
                />
              )}
              {group.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  categories={categories}
                  hour12={hour12}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResume={onResume}
                  onDuplicate={onDuplicate}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
