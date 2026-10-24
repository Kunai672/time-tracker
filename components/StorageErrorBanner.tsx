"use client";

import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "./ui/button";
import type { StorageStatus } from "../lib/storage";

export type StorageErrorBannerProps = {
  status: StorageStatus;
  onReset: () => void;
};

/**
 * Recovery message shown when saved data could not be read. Renders nothing
 * in the normal (`ok`/`empty`) case.
 */
export function StorageErrorBanner({
  status,
  onReset,
}: StorageErrorBannerProps) {
  if (status !== "corrupt") return null;

  return (
    <div
      role="alert"
      data-testid="storage-error"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
        <div>
          <p className="font-medium">We couldn&apos;t read your saved data</p>
          <p className="text-muted-foreground">
            The stored copy looked corrupt, so the app started fresh. Reset to
            overwrite it now, or keep working — the next change replaces it.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={onReset}
        className="shrink-0"
      >
        <RotateCcwIcon data-icon="inline-start" aria-hidden />
        Reset data
      </Button>
    </div>
  );
}
