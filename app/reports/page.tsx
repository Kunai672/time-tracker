"use client";

import { useMemo, useState } from "react";

import { useAppData } from "../../components/AppDataProvider";
import { CategoryChart } from "../../components/CategoryChart";
import { DailyChart } from "../../components/DailyChart";
import { FiltersBar } from "../../components/FiltersBar";
import { aggregateByCategory, aggregateByDay, totalMinutes } from "../../lib/aggregate";
import { formatDuration } from "../../lib/duration";
import { ALL_CATEGORIES, filterEntries, type EntryFilters } from "../../lib/filters";

export default function ReportsPage() {
  const { data, ready } = useAppData();
  const [filters, setFilters] = useState<EntryFilters>({
    categoryId: ALL_CATEGORIES,
  });

  const filtered = useMemo(
    () => filterEntries(data.entries, filters),
    [data.entries, filters],
  );
  const daily = useMemo(() => aggregateByDay(filtered), [filtered]);
  const byCategory = useMemo(
    () => aggregateByCategory(filtered, data.categories),
    [filtered, data.categories],
  );
  const total = totalMinutes(filtered);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {!ready ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <FiltersBar
            filters={filters}
            categories={data.categories}
            onChange={setFilters}
          />

          <p className="text-sm text-gray-600">
            {filtered.length} entries · {formatDuration(total)} tracked
          </p>

          <section aria-labelledby="daily-heading" className="space-y-2">
            <h2 id="daily-heading" className="text-xl font-semibold">
              Hours per day
            </h2>
            <DailyChart data={daily} />
          </section>

          <section aria-labelledby="category-chart-heading" className="space-y-2">
            <h2 id="category-chart-heading" className="text-xl font-semibold">
              Time per category
            </h2>
            <CategoryChart data={byCategory} />
          </section>
        </>
      )}
    </div>
  );
}
