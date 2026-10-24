"use client";

import Link from "next/link";
import {
  ClockIcon,
  MoreHorizontalIcon,
  PencilIcon,
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
import { formatDuration } from "../lib/duration";
import { formatDayKey, formatTime } from "../lib/datetime";
import type { EntryGroup } from "../lib/entryGroups";
import type { Category, TimeEntry } from "../lib/types";

export type EntriesListProps = {
  groups: EntryGroup[];
  categories: Category[];
  /** Injected clock so "Today"/"Yesterday" labels are deterministic. */
  now: Date;
  hour12: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
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

function EntryRow({
  entry,
  categories,
  hour12,
  onEdit,
  onDelete,
}: {
  entry: TimeEntry;
  categories: Category[];
  hour12: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  const category = findCategory(categories, entry.categoryId);
  const range = `${formatTime(entry.start, hour12)} – ${formatTime(
    entry.end,
    hour12,
  )}`;

  return (
    <li className="flex items-center gap-3 py-3">
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

/** Entries grouped by day, each group headed by its daily total. */
export function EntriesList({
  groups,
  categories,
  now,
  hour12,
  onEdit,
  onDelete,
}: EntriesListProps) {
  if (groups.length === 0) {
    return <EmptyEntries />;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date} aria-label={`Entries for ${group.date}`}>
          <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
            <h2 className="text-sm font-semibold">
              {formatDayKey(group.date, now)}
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(group.totalMinutes)}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {group.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                categories={categories}
                hour12={hour12}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
