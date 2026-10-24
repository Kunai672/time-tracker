# Progress log

## Phase 1 — Storage layer
`lib/storage.ts` exports typed `load`, `save`, `migrate` (plus `clear`,
`createDefaultData`, `getDefaultStorage`). SSR-safe (no `window`), versioned
schema (`SCHEMA_VERSION`), injectable `StorageLike` backend. Returns defaults
for empty/corrupt/future-version data and reassigns orphaned entries.
`tests/storage.test.ts` covers empty, corrupt, legacy-version, current-version
and running-timer cases. lint + typecheck + test + build pass.

## Phase 2 — Models
`lib/types.ts` defines `TimeEntry`, `Category`, `RunningTimer`, `AppData`.
`lib/duration.ts` provides pure duration math and formatting.
`lib/validation.ts` rejects empty category names, invalid colours, and end
before start (also empty descriptions/categories and bad timestamps).
`tests/models.test.ts` covers all helpers and boundaries. lint + typecheck +
test + build pass.

## Phase 3 — Categories CRUD
`lib/categories.ts` has pure `createCategory`, `renameCategory`,
`recolorCategory`, `deleteCategory` (reassigns entries to Uncategorized;
refuses to delete the built-in one). `tests/categories.test.ts` covers each
path plus the no-orphans invariant. `/categories` page wires it through the
client provider.

## Phase 4 — Entries CRUD
`lib/entries.ts` has pure `createEntry`/`updateEntry`/`deleteEntry` and
`sortEntriesNewestFirst`. `/entries` page shows newest first and supports
add/edit/delete. `tests/entries.test.ts` covers the logic and
`tests/components.test.tsx` renders the EntriesManager through the full
add → edit → delete lifecycle.

## Phase 5 — Live timer
`lib/timer.ts` takes an injected `Date`/clock for `startTimer`,
`elapsedMinutes` and `stopTimer`; stopping produces a `TimeEntry`. The running
timer is part of the persisted `AppData`, so it survives reloads. Timer uses
`useSyncExternalStore` (no effect-setState). `tests/timer.test.ts` is fully
deterministic.

All four commands (lint, typecheck, test, build) pass after each phase; 82
tests at this point.

## Phase 6 — Filters
`lib/filters.ts` exports pure `filterEntries` (inclusive date boundaries,
category filter, all-categories sentinel) and `dateKey`. `tests/filters.test.ts`
covers both boundaries, single-day ranges, category filters and combinations.
`/reports` exposes the filters through `FiltersBar`.

## Phase 7 — Daily chart
`lib/aggregate.ts` exports tested `aggregateByDay` (and `totalMinutes`).
`components/DailyChart.tsx` renders a recharts bar chart of hours per day from
the filtered entries and shows an empty state when there is no data.
`tests/charts.test.tsx` covers both states. recharts is the only new
dependency.

## Phase 8 — Category chart
`lib/aggregate.ts` exports tested `aggregateByCategory` (unknown ids fall back
to Uncategorized; zero-minute categories omitted).
`components/CategoryChart.tsx` renders a recharts donut that reuses the same
filters as the daily chart, with an empty state.

## Phase 9 — Export / import
`lib/importExport.ts` exports `exportData` and a validating `importData`
(result union). Malformed files are rejected before any persistence, so
existing data is untouched. `tests/importExport.test.ts` covers empty, invalid
JSON, wrong shape, missing/newer version, malformed categories/entries/timer.
`/data` wires it to `DataTransfer` (download, file import, paste import, reset).

## Final
All nine phases complete. `npm run verify` (lint && typecheck && test && build)
passes. 88 tests. No git commits were made.
