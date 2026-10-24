"use client";

import Link from "next/link";

import { useAppData } from "../components/AppDataProvider";
import { CategoryChart } from "../components/CategoryChart";
import { DailyChart } from "../components/DailyChart";
import { StatCards, StatCardsSkeleton } from "../components/StatCards";
import { TimerCard } from "../components/TimerCard";
import { aggregateByCategory, aggregateByDay } from "../lib/aggregate";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { findCategory } from "../lib/categories";
import { formatDuration } from "../lib/duration";
import { sortEntriesNewestFirst } from "../lib/entries";
import { computeDashboardStats } from "../lib/stats";
import { useNowSeconds } from "../components/useNow";

function RecentEntries() {
  const { data } = useAppData();
  const recent = sortEntriesNewestFirst(data.entries).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Recent entries</CardTitle>
        <Link
          href="/entries"
          className="rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
        </Link>
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
                  <span className="shrink-0 tabular-nums">
                    {formatDuration(entry.durationMinutes)}
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
  const { data, ready } = useAppData();
  const seconds = useNowSeconds(ready);
  const now = seconds !== null ? new Date(seconds * 1000) : null;

  const stats = now
    ? computeDashboardStats(data.entries, data.categories, now)
    : null;
  const daily = now ? aggregateByDay(data.entries) : [];
  const byCategory = now
    ? aggregateByCategory(data.entries, data.categories)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
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
      ) : (
        <>
          <TimerCard />
          <StatCards stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hours per day</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyChart data={daily} />
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
