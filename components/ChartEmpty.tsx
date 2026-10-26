import { BarChart3Icon, PieChartIcon } from "lucide-react";

/** Friendly empty state shared by the dashboard charts. */
export function ChartEmpty({ variant = "bar" }: { variant?: "bar" | "pie" }) {
  const Icon = variant === "pie" ? PieChartIcon : BarChart3Icon;
  return (
    <div
      data-testid="chart-empty"
      className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center"
    >
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">
        No data for the selected filters.
      </p>
      <p className="text-xs text-muted-foreground">
        Start a timer to see your activity here.
      </p>
    </div>
  );
}
