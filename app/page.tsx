"use client";

import Link from "next/link";

import { useAppData } from "../components/AppDataProvider";
import { TimerPanel } from "../components/TimerPanel";
import { findCategory } from "../lib/categories";
import { totalMinutes } from "../lib/aggregate";
import { sortEntriesNewestFirst } from "../lib/entries";
import { formatDuration } from "../lib/duration";

export default function DashboardPage() {
  const { data, ready } = useAppData();

  const total = totalMinutes(data.entries);
  const recent = sortEntriesNewestFirst(data.entries).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Time Tracker</h1>

      <TimerPanel />

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="text-sm text-gray-500">Total tracked</h2>
          <p className="text-2xl font-semibold">{formatDuration(total)}</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="text-sm text-gray-500">Entries</h2>
          <p className="text-2xl font-semibold">{data.entries.length}</p>
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-xl font-semibold">
            Recent entries
          </h2>
          <Link href="/entries" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {!ready ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((entry) => (
              <li key={entry.id} className="flex justify-between py-2 text-sm">
                <span>
                  {entry.description}
                  <span className="ml-2 text-gray-500">
                    {findCategory(data.categories, entry.categoryId)?.name ??
                      "Uncategorized"}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatDuration(entry.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
