"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "./ui/button";

export type DataErrorBannerProps = {
  error: Error | null;
  onRetry: () => void;
};

/**
 * Recovery message shown when a data query fails. Renders nothing when every
 * query is healthy.
 */
export function DataErrorBanner({ error, onRetry }: DataErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      data-testid="data-error"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
        <div>
          <p className="font-medium">We couldn&apos;t load your data</p>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onRetry} className="shrink-0">
        <RefreshCwIcon data-icon="inline-start" aria-hidden />
        Try again
      </Button>
    </div>
  );
}
