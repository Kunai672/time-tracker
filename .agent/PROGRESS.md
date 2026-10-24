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

---

# UI restyle — phased log

## Restyle Phase 1 — Shell, theme and tokens
`lib/category-colors.ts` defines a fixed 10-colour palette; `lib/theme.ts`
holds the pure `resolveTheme`/`applyThemeClass` helpers. `components/AppShell`
adds a collapsible desktop sidebar (Dashboard, Entries, Categories, Settings),
a mobile bottom tab bar below `md`, and a sticky top bar with the theme menu
(`next-themes`, system default) and a live running-timer indicator that renders
nothing while idle. shadcn primitives were tuned to the visual language
(rounded-lg, subtle borders, no heavy card shadows) and a single accent token
was added. Tests: `tests/shell.test.tsx` covers theme class switching, the
indicator idle/running states and the palette. lint + typecheck + test + build
pass (94 tests).

## Restyle Phase 2 — Dashboard timer card and stats
`lib/stats.ts` adds a pure `computeDashboardStats` (Today, This week, Top
category, Daily average, each with a delta vs. the previous period and a
defined zero-data case). `components/TimerCard` is the prominent idempotent
timer card (shadcn Card/Input/Select/Button) with a large live `formatClock`
and pulsing dot while running; `components/StatCards` renders the four cards
and a skeleton variant. `components/useNow` centralises the once-per-second
`useSyncExternalStore` clock so no component reads `new Date()` during
prerender. Dashboard now shows a loading skeleton then timer + stats + recent
entries. Tests: `tests/stats.test.ts` and `tests/timerCard.test.tsx`. lint +
typecheck + test + build pass (98 tests).

## Restyle Phase 3 — Dashboard charts restyle
`components/DailyChart` and `components/CategoryChart` now use the shadcn
`ChartContainer`/`ChartTooltip`/`ChartLegend` wrappers; the bar chart shows
hours per day with duration tooltips, and the donut shows the category split
with a centre total and a legend built from `lib/chart-data.ts` (integer
percentages that always sum to 100). Slices use the persisted palette colours
and both charts share a friendly `ChartEmpty` state. Aggregation functions are
untouched. Tests: `tests/chartData.test.ts` plus the existing chart render
tests. lint + typecheck + test + build pass (101 tests).

## Restyle Phase 4 — Entries page
`lib/filters.ts` gains additive `categoryIds`/`search` filters and tested
`presetRange` presets; `lib/entryGroups.ts` adds a tested `groupEntriesByDay`;
`lib/entries.ts` adds `restoreEntry`; `lib/datetime.ts` adds `formatTime` and
`formatDayKey`. The Entries page now has a sticky filter bar (date presets,
category multi-select, search), day-grouped rows with a per-day total, a
category dot/time range/duration and a shadcn dropdown for edit/delete, an
edit dialog, a Sonner undo toast on delete (no confirm) and an empty state with
a "Start your first timer" CTA. Tests: `entryGroups`, `entriesUndo`,
`entriesEmpty`. lint + typecheck + test + build pass (106 tests).

## Restyle Phase 5 — Categories page and Settings
Categories render as a card grid with swatch, name and hours tracked this
week; the raw colour input is gone, replaced by a palette picker built from
`lib/category-colors.ts`, and deleting a category now opens a confirmation
dialog that names how many entries will move to Uncategorized. A new
`app/settings/page.tsx` collects export/import (restyled `DataTransfer` with a
clear-data confirmation dialog), a theme control and a persisted 12/24h time
format (`SettingsProvider` + settings store in `lib/storage.ts`); the Entries
page honours the format. Old `/reports` and `/data` routes redirect to the
dashboard and settings. Tests: `tests/settings.test.ts`. lint + typecheck +
test + build pass (109 tests).

## Restyle Phase 6 — States and accessibility
`lib/storage.ts` gains `loadWithStatus`, so corrupt data surfaces a
`StorageErrorBanner` with a reset path in the shell while `load` stays
unchanged. `eslint.config.mjs` adds the `jsx-a11y/recommended` rules (the
Next config already registers the plugin) and all violations were fixed with
real labels/ids rather than disables. Test: `tests/storageError.test.tsx`
renders the error state from a corrupt fixture. lint + typecheck + test +
build pass (111 tests).

## Restyle Phase 7 — Responsive screenshots
`scripts/screenshots.ts` (run via `npm run screenshots`) boots the production
server, seeds sample data, and captures Dashboard, Entries, Categories and
Settings at 375/768/1280px in light and dark mode (24 PNGs) into
`.agent/screenshots/`. It also reports horizontal overflow; the run found
none, and the captures were reviewed for clipping. A `components/ui/textarea`
shadcn component was added and the remaining legacy add/edit manager was moved
onto shadcn controls so no hand-rolled inputs remain. lint + typecheck + test
+ build pass (111 tests).
