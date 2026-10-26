"use client";

import Link from "next/link";

import { useAppData } from "../components/AppDataProvider";
import { useSettings } from "../components/SettingsProvider";
import { CategoryChart } from "../components/CategoryChart";
import { DailyChart } from "../components/DailyChart";
import { StatCards, StatCardsSkeleton } from "../components/StatCards";
import { TimerCard } from "../components/TimerCard";
import { WelcomeCard } from "../components/WelcomeCard";
import { aggregateByCategory } from "../lib/aggregate";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { findCategory } from "../lib/categories";
import { formatTime } from "../lib/datetime";
import { formatDuration } from "../lib/duration";
import { sortEntriesNewestFirst } from "../lib/entries";
import { buildSampleData, isFirstRun } from "../lib/sampleData";
import { computeDashboardStats } from "../lib/stats";
import { useNowSeconds } from "../components/useNow";

function RecentEntries() {
  const { data } = useAppData();
  const { settings } = useSettings();
  const hour12 = settings.timeFormat === "12h";
  const recent = sortEntriesNewestFirst(data.entries).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent entries</CardTitle>
        <CardAction>
          <Link
            href="/entries"
            className="inline-flex min-h-10 items-center rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entries yet. Start a timer to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((entry) => {
              const category = findCategory(data.categories, entry.categoryId);
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category?.color }}
                      aria-hidden
                    />
                    <span className="truncate">{entry.description}</span>
                    <span className="hidden shrink-0 text-muted-foreground sm:inline">
                      {category?.name ?? "Uncategorized"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 tabular-nums">
                    <span className="hidden text-muted-foreground md:inline">
                      {formatTime(entry.start, hour12)} –{" "}
                      {formatTime(entry.end, hour12)}
                    </span>
                    <span>{formatDuration(entry.durationMinutes)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, ready, replaceDataAction } = useAppData();
  const seconds = useNowSeconds(ready);
  const now = seconds !== null ? new Date(seconds * 1000) : null;
  const firstRun = ready && isFirstRun(data);

  const stats = now
    ? computeDashboardStats(data.entries, data.categories, now)
    : null;
  const byCategory = now
    ? aggregateByCategory(data.entries, data.categories)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-title font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your time and review how the week is going.
        </p>
      </div>

      {!ready || !now || !stats ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-36" />
            </CardContent>
          </Card>
          <StatCardsSkeleton />
        </div>
      ) : firstRun ? (
        <WelcomeCard
          onLoadSample={() => replaceDataAction(buildSampleData(new Date()))}
        />
      ) : (
        <>
          <TimerCard />
          <StatCards stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Time per day</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyChart
                  entries={data.entries}
                  categories={data.categories}
                  now={now}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Time per category</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryChart data={byCategory} />
              </CardContent>
            </Card>
          </div>

          <RecentEntries />
        </>
      )}
    </div>
  );
}
