"use client";

import Link from "next/link";

import { findCategory } from "../lib/categories";
import { formatDuration } from "../lib/duration";
import { elapsedMinutes } from "../lib/timer";
import type { RunningTimer } from "../lib/types";
import { useAppData } from "./AppDataProvider";
import { useNowSeconds } from "./useNow";

export type RunningTimerIndicatorViewProps = {
  timer: RunningTimer | null;
  /** Category name shown next to the elapsed time, when available. */
  categoryName?: string;
  /** Injected clock so the view is deterministic in tests. */
  now: Date;
};

/**
 * Presentational indicator. Renders nothing while idle and a pulsing dot plus
 * a live, tabular duration while a timer is running.
 */
export function RunningTimerIndicatorView({
  timer,
  categoryName,
  now,
}: RunningTimerIndicatorViewProps) {
  if (!timer) return null;

  const label = categoryName ? ` · ${categoryName}` : "";

  return (
    <Link
      href="/"
      data-testid="running-timer-indicator"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Timer running${label}. ${formatDuration(
        elapsedMinutes(timer, now),
      )} elapsed. Open dashboard.`}
    >
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="tabular-nums">
        {formatDuration(elapsedMinutes(timer, now))}
      </span>
      <span className="hidden text-muted-foreground sm:inline">{label}</span>
    </Link>
  );
}

/** Live indicator wired to the app store. */
export function RunningTimerIndicator() {
  const { data } = useAppData();
  const running = data.runningTimer;
  const seconds = useNowSeconds(Boolean(running));

  if (!running || seconds === null) return null;

  const category = findCategory(data.categories, running.categoryId);

  return (
    <RunningTimerIndicatorView
      timer={running}
      categoryName={category?.name}
      now={new Date(seconds * 1000)}
    />
  );
}
