"use client";

import { EntriesManager } from "../../components/EntriesManager";
import { useAppData } from "../../components/AppDataProvider";
import { sortEntriesNewestFirst } from "../../lib/entries";

export default function EntriesPage() {
  const {
    data,
    ready,
    createEntryAction,
    updateEntryAction,
    deleteEntryAction,
  } = useAppData();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Entries</h1>
      {!ready ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <EntriesManager
          entries={sortEntriesNewestFirst(data.entries)}
          categories={data.categories}
          onCreate={createEntryAction}
          onUpdate={updateEntryAction}
          onDelete={deleteEntryAction}
        />
      )}
    </div>
  );
}
