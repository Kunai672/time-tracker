"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { UNCATEGORIZED_ID } from "../lib/constants";
import {
  clearLocalData,
  getLocalDataServerSnapshot,
  getLocalDataSnapshot,
  subscribeLocalData,
} from "../lib/data/local-store";
import {
  hasMigratableData,
  isCloudEmpty,
  mapLocalDataToCloud,
} from "../lib/data/migration";
import {
  useCategoriesQuery,
  useEntriesQuery,
  useImportAllMutation,
  useRunningTimerQuery,
} from "./data-hooks";
import { useAuthUser } from "./useAuthUser";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * After the first sign-in, offers to move any data that only lives in this
 * browser into the (empty) cloud account, then offers to clear the local copy.
 * It renders nothing on the local backend or when the cloud already has data.
 */
export function LocalDataMigration() {
  const { data: user } = useAuthUser();
  const local = useSyncExternalStore(
    subscribeLocalData,
    getLocalDataSnapshot,
    getLocalDataServerSnapshot,
  );

  const categoriesQuery = useCategoriesQuery();
  const entriesQuery = useEntriesQuery();
  const timerQuery = useRunningTimerQuery();
  const importAll = useImportAllMutation();

  const [dismissed, setDismissed] = useState(false);
  const [imported, setImported] = useState(false);

  if (!user) return null;

  if (imported) {
    return (
      <Dialog open onOpenChange={() => setImported(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Local data imported</DialogTitle>
            <DialogDescription>
              Your tracked time is now synced to your account. You can clear the
              copy stored in this browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImported(false)}>
              Keep local copy
            </Button>
            <Button
              onClick={() => {
                clearLocalData();
                setImported(false);
                toast.success("Local data cleared");
              }}
            >
              Clear local data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const cloudLoaded =
    categoriesQuery.isSuccess &&
    entriesQuery.isSuccess &&
    timerQuery.isSuccess;
  const cloudEmpty = isCloudEmpty(
    categoriesQuery.data ?? [],
    entriesQuery.data ?? [],
    timerQuery.data ?? null,
  );

  if (
    dismissed ||
    !cloudLoaded ||
    !cloudEmpty ||
    !hasMigratableData(local)
  ) {
    return null;
  }

  const categoryCount = local.categories.filter(
    (category) => category.id !== UNCATEGORIZED_ID,
  ).length;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setDismissed(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import your local data?</DialogTitle>
          <DialogDescription>
            This account is empty, but this browser has{" "}
            {plural(local.entries.length, "entry")} and{" "}
            {plural(categoryCount, "category")}. Import them so nothing is lost?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(true)}>
            Not now
          </Button>
          <Button
            onClick={() =>
              importAll.mutate(mapLocalDataToCloud(local), {
                onSuccess: () => setImported(true),
              })
            }
            disabled={importAll.isPending}
          >
            {importAll.isPending ? "Importing…" : "Import data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
