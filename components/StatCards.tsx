import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { formatDuration } from "../lib/duration";
import type { DashboardStats } from "../lib/stats";
import { cn } from "../lib/utils";

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  // No baseline means no comparison, so nothing is rendered at all.
  if (deltaPct === null) return null;

  const up = deltaPct > 0;
  const flat = deltaPct === 0;
  const Icon = flat ? MinusIcon : up ? TrendingUpIcon : TrendingDownIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        flat ? "text-muted-foreground" : up ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {deltaPct}%
      <span className="sr-only"> vs previous period</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  deltaPct,
}: {
  label: string;
  value: string;
  hint?: string;
  deltaPct: number | null;
}) {
  return (
    <Card data-slot="stat-card">
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="truncate text-title font-semibold tabular-nums" title={value}>
          {value}
        </p>
        <div className="flex items-center justify-between gap-2">
          {hint ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {hint}
            </span>
          ) : (
            <span />
          )}
          <DeltaBadge deltaPct={deltaPct} />
        </div>
      </CardContent>
    </Card>
  );
}

/** The four dashboard cards. */
export function StatCards({ stats }: { stats: DashboardStats }) {
  const top = stats.topCategory;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatTile
        label="Today"
        value={formatDuration(stats.today.current)}
        hint={`Yesterday ${formatDuration(stats.today.previous)}`}
        deltaPct={stats.today.deltaPct}
      />
      <StatTile
        label="This week"
        value={formatDuration(stats.week.current)}
        hint={`Last week ${formatDuration(stats.week.previous)}`}
        deltaPct={stats.week.deltaPct}
      />
      <StatTile
        label="Top category"
        value={top ? top.name : "—"}
        hint={top ? formatDuration(top.current) : "No time yet"}
        deltaPct={top?.deltaPct ?? null}
      />
      <StatTile
        label="Daily average"
        value={formatDuration(stats.dailyAverage.current)}
        hint="Last 7 days"
        deltaPct={stats.dailyAverage.deltaPct}
      />
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
