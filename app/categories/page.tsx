"use client";

import { useMemo } from "react";

import { useAppData } from "../../components/AppDataProvider";
import { CategoriesManager } from "../../components/CategoriesManager";
import { Skeleton } from "../../components/ui/skeleton";
import { useNowSeconds } from "../../components/useNow";
import { weeklyMinutesByCategory } from "../../lib/stats";

export default function CategoriesPage() {
  const {
    data,
    ready,
    createCategoryAction,
    renameCategoryAction,
    recolorCategoryAction,
    deleteCategoryAction,
  } = useAppData();

  const seconds = useNowSeconds(ready);
  const now = useMemo(
    () => (seconds !== null ? new Date(seconds * 1000) : null),
    [seconds],
  );

  const weeklyMinutes = useMemo(() => {
    if (!now) return {} as Record<string, number>;
    return Object.fromEntries(weeklyMinutesByCategory(data.entries, now));
  }, [data.entries, now]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Categories
        </h1>
        <p className="text-sm text-muted-foreground">
          Organise your time with colours and names.
        </p>
      </div>

      {!ready || !now ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <CategoriesManager
          categories={data.categories}
          entries={data.entries}
          weeklyMinutes={weeklyMinutes}
          onCreate={createCategoryAction}
          onRename={renameCategoryAction}
          onRecolor={recolorCategoryAction}
          onDelete={deleteCategoryAction}
        />
      )}
    </div>
  );
}
