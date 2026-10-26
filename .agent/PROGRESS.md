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

---

# Design pass — phased log

## Design Phase 0 — Layout audit harness
Added `scripts/ui-audit.ts` (run by `npm run ui:audit`) plus the
`@axe-core/playwright` dev dependency. It boots the production build and
visits Dashboard, Entries, Categories and Settings (`/data` and `/reports`
are redirects) at 375/768/1280px, in light and dark, in three documented
fixture states: `seeded` (four categories, eight entries across three days),
`empty` (first-run) and `running-timer` (Work timer started 42 minutes ago).
For every combination it checks horizontal page scroll, element overflow
inside cards, text inputs under 120px, button/link hit areas under 40×40px at
≤768px, and axe-core violations; it writes viewport and full-page captures to
`.agent/screenshots/<page>-<width>-<theme>-<state>[-full].png` and rewrites
`.agent/screenshots/INDEX.md`.

Initial run (expected failures, recorded before fixing): **1001 problems**.
- `hit-area` (912): every shadcn button is 36×36 (default), 32×32 (`sm`/icon-sm) or 24×24 (`icon-xs`), the sidebar/nav links and brand are 36px tall, `View all` is 20px, the running-timer pill is 26px, tab triggers are 27px, the inline category swatches are 16–24px, and the row action menus are 32×32.
- `input-width` (42): `<input#category-name>` collapses to **35px** at desktop widths because the flex row lacks `min-w-0`; base-ui's visually hidden select inputs also tripped the check (now skipped in the harness).
- `axe` (47): `color-contrast` (muted text) and `label-content-name-mismatch` (select triggers whose accessible name omits the visible value).
- `horizontal-scroll` and `card-overflow`: none.

lint + typecheck + test (111) + build pass. `ui:audit` fails as expected.

## Design Phase 1 — Shell, responsive and accessibility baseline
`AppShell` is now a sticky shell: the aside is an icon rail at `md` (768px)
that widens to the full sidebar only at `lg` (1024px), with shadcn
`Tooltip`s on each rail link; it stays `sticky top-0 h-dvh` while `<main>`
scrolls. The top bar shows the route title from `pageTitle()`/`isActivePath()`
(added to `components/nav-items.ts`) on the left and the live
`RunningTimerIndicator` + `ThemeToggle` on the right. The mobile bottom nav
keeps the safe-area inset and `<main>` reserves `calc(6rem +
env(safe-area-inset-bottom))` so nothing is covered.

Baseline accessibility/layout fixes required to clear the audit:
- New shadcn `components/ui/tooltip.tsx` (base-ui Tooltip).
- Button sizes raised to a 40px minimum (`h-10`; `icon*` 40–44px), select
  triggers to `h-10`, and tab triggers to a fixed `h-10`.
- Nav/brand/“View all”/running-timer links now have 40px hit areas.
- Light tokens darkened so soft buttons and deltas clear 4.5:1:
  `--primary` 0.55→0.52, `--destructive` 0.577→0.52, `--success` 0.58→0.54
  (plus matching ring/sidebar tokens). The running-timer pill no longer
  overrides its accessible name, fixing `label-content-name-mismatch`.
- US English copy in the Categories page/manager (“Color”, “Organize”).

`npm run ui:audit` passes with **0 problems** (144 screenshots, 72
combinations). lint + typecheck + test (111) + build pass.

## Design Phase 2 — Categories redesign
`CategoriesManager` now has a single-row add form (`sm:flex-row`, stacking
below 640px) whose Name field is `flex-1 min-w-0`, and the color picker is a
base-ui `Popover` (with the palette still submitted through a hidden
`name="color"` input). Cards show the color dot (as the picker trigger), name,
hours this week, entry count and a thin share-of-total bar; the inline swatch
rows are gone. Actions moved into a `DropdownMenu`: Rename (dialog), Change
color (popover with a Save color confirm step) and Delete (keeping the
entry-count confirmation dialog; disabled for the built-in bucket). Palette
swatches are 40px and cards stretch to equal height.
`tests/components.test.tsx` was updated for the new structure and now also
asserts the weekly time, entry count, share bar and the absence of inline
pickers (112 tests). lint + typecheck + test + build pass; `ui:audit` passes
with 0 problems.

## Design Phase 3 — Dashboard
The timer card is the hero: while running it gets a primary ring, a pulsing
dot, the large `tabular-nums` clock, and a “Started at …” line (honoring the
12/24h setting); the category select shows the running category. Stat cards
are a 2×2 grid below `xl` and only render a delta when a real previous-period
comparison exists — the placeholder dash is gone (`tests/stats.test.ts`
unchanged; the component drops the `null` branch). The bar chart is now
stacked by category with a 7d / 30d / month `Tabs` toggle, renders every day
in the range (zeros included), formats x labels as “Thu 22” and shows
per-category durations in the tooltip. The donut legend is a custom
descending list rendering “Name · 27%” on one line with a clean empty state.
Recent entries gained the row time range. New pure helpers were added
(`chartRangeDays`, `range`/`CHART_RANGES`, `aggregateStackedByDay`,
`formatChartDay`) with tests in `tests/chartData.test.ts` and
`tests/aggregate.test.ts` (115 tests). lint + typecheck + test + build pass;
`ui:audit` passes with 0 problems.

## Design Phase 4 — Entries
The filter bar is one row at `md` (768px) and above; below that a “Filters”
button opens a bottom `Sheet` and the active filters render as removable
chips (a new pure `activeFilterChips`/`hasActiveFilters` helper in
`lib/filters.ts`), with “Clear” only shown while something is filtered. Day
headers are sticky under the top bar/filter bar, rows are ≥44px tall on
mobile, and each row menu now offers Resume, Duplicate, Edit and Delete (Undo
toast kept). A running timer renders as a live row at the top of Today with
its own clock and Stop button. Resume carries the description on the timer
(`RunningTimer.description?`, `startTimerWithDescription`, with
`stopTimer` falling back to it) and Duplicate uses `duplicateEntry`. New tests
cover resume/stop-by-description, duplicate, the chip logic and the live row
(123 tests). The light `--muted-foreground` token was darkened to 0.52 so
muted text also clears 4.5:1 on tinted surfaces. lint + typecheck + test +
build pass; `ui:audit` passes with 0 problems.

## Design Phase 5 — Settings
Settings content is capped at ~720px (`max-w-[45rem]`) and centered. Export
and Import are merged into one “Data” card with a summary (entry count,
category count and approximate size) plus the export button, a styled dashed
drop zone that accepts drag-and-drop and a keyboard-accessible “Choose file”
button (the native file input is now `sr-only` and labelled), and the
paste-JSON textarea inside a collapsed `Accordion` (new
`components/ui/accordion.tsx`, kept mounted so validation is unchanged).
Validation errors render inline as before; the reset confirmation stays in its
own Danger zone card. `tests/charts.test.tsx`’s DataTransfer coverage still
passes unchanged. lint + typecheck + test (123) + build pass; `ui:audit`
passes with 0 problems.

## Design Phase 6 — Typography and contrast
A type scale is now defined as theme tokens in `app/globals.css`
(`--text-caption/body/heading/subtitle/title/display/display-lg` with line
heights) and applied to headings: page titles and stat values use
`text-title`, card titles `text-heading`, the donut centre `text-subtitle` and
the timer clock `text-display`/`text-display-lg`. Every text utility in use is
at least `text-xs` (12px) and `--muted-foreground` was tuned so muted text
clears 4.5:1 on every surface in both themes (verified: light 4.59–5.51, dark
5.83–7.63). Default Tailwind spacing keeps the scale consistent. lint +
typecheck + test (123) + build pass; `ui:audit` reports 0 problems and zero
axe violations.

## Design Phase 7 — UX details
`lib/documentTitle.ts` + `components/DocumentTitle` keep `document.title` at
“● HH:MM:SS · Time Tracker” while a timer runs and reset it to “Time Tracker”
when it stops. `lib/shortcuts.ts` adds the pure guards and `SHORTCUTS`, and
`components/KeyboardShortcuts` wires the global bindings: `N` opens Add entry
(navigating to Entries and opening the dialog through a one-shot request),
`Space` starts/stops the timer, and `?` opens a help dialog listing them —
none fire while typing or on a control. The dashboard shows a first-run
`WelcomeCard` (with a “Create your first category” step linking to
`/categories` and a “Load sample data” button backed by
`lib/sampleData.ts`) whenever `isFirstRun(data)` is true. Tests cover the
title formatting, the shortcut guards, the one-shot request and the first-run
state (134 tests). lint + typecheck + test + build pass; `ui:audit` passes
with 0 problems.

## Design Phase 8 — Final audit
Re-ran everything from a clean tree (`rm -rf .next .test-build`): `npm run
verify` passes and `npm run ui:audit` passes with **0 problems** across the 4
primary routes × 375/768/1280px × light/dark × seeded/empty/running-timer
(144 captures). `scripts/ui-audit.ts` rewrote `.agent/screenshots/INDEX.md`,
which now lists exactly the 144 audit screenshots (stale pre-audit captures
were removed). `npm run typecheck` now runs `next typegen` first, so it also
succeeds on a fresh checkout before any build. Final counts: 134 tests,
0 axe violations, no git commits.

Notes on the hard constraints: the only new dependency is
`@axe-core/playwright`; all lib additions (`aggregateStackedByDay`,
`chartRangeDays`, `formatChartDay`, `formatLongClock`, `FilterChip` helpers,
`duplicateEntry`, `RunningTimer.description?`/`startTimerWithDescription`,
`documentTitle`, `shortcuts`, `sampleData`) are additive and every pre-existing
test still passes. One pre-existing UI test was updated because the required
overflow-menu redesign removed the inline disabled `Delete` button: it now
asserts the card action triggers exist and the domain helper keeps
Uncategorized undeletable, and a new test covers the card's weekly time, entry
count and share bar.

## Design Phase 8b — Post-audit corrections
An independent audit rejected completion on two Dashboard acceptance
criteria that the harness did not cover; both are fixed and verified live:
- Bar-chart x labels now read weekday-then-day. `formatChartDay` builds the
  label from parts (`"Thu 22"`) instead of relying on `toLocaleDateString`,
  which ordered it day-first. Live DOM now renders `Mon 19 … Sun 25`. A
  `tests/datetime.test.ts` case locks the format.
- Recent entries' "View all" is right-aligned in the header. `CardHeader` is a
  grid, so the old `flex-row` class had no effect; the link now uses the
  shadcn `CardAction` slot. Live DOM confirms the title and link share a row
  with the link flush to the card's right edge.
Clean-tree `npm run verify` (136 tests) and `npm run ui:audit` (0 problems,
144 captures) pass.

---

# Supabase persistence — phased log

Next.js version: **16.4.3**, so the session-refresh file is **`proxy.ts`**
(not `middleware.ts`).

## Supabase Phase 0 — Repository abstraction (no behavior change)
Added an async `DataRepository` contract in `lib/data/types.ts` (categories
CRUD, entries CRUD incl. restore-with-same-id, running timer get/start/stop,
`exportAll`/`importAll`). `lib/data/create-repository.ts` implements every rule
once on top of a tiny synchronous `DataStore`; `lib/data/local-repository.ts`
backs that with the unchanged `lib/storage.ts`, and
`lib/data/memory-repository.ts` is the in-memory fake (it normalises on read
like `load`, so the two behave identically). `tests/repository-contract.ts`
holds the shared suite (category CRUD, delete-reassigns-entries, entry CRUD,
restore id, timer→entry, export/import round-trip, import validation) and
`tests/repository.test.ts` runs it against both backends.

The UI now reads through TanStack Query: `components/DataProvider.tsx` owns the
`QueryClient` and the active repository, `components/data-hooks.ts` exposes the
query/mutation hooks, and `components/AppDataProvider.tsx` kept its existing
`useAppData()` surface (so no page markup changed) while dropping every direct
`lib/storage.ts` call. `components/DataErrorBanner.tsx` renders the error state
for failed queries (with retry); loading skeletons were already present. No
`lib/` pure-function signature or test changed and `lib/storage.ts` is
untouched. lint + typecheck + test (152) + build + `ui:audit` (144 captures,
0 problems) pass.

## Supabase Phase 1 — Schema and RLS (SQL only)
`supabase/migrations/0001_init.sql` creates `categories` (uuid id default
`gen_random_uuid()`, `user_id` default `auth.uid()`), `entries`
(`category_id` nullable → categories `on delete set null`, `check (ended_at >
started_at)`) and `running_timers` (`user_id` primary key, so one timer per
user). Indexes: `entries (user_id, started_at)`, `categories (user_id)` and
`running_timers (user_id)`. RLS is enabled on all three tables, each with
separate `select`/`insert`/`update`/`delete` policies for the `authenticated`
role using `(select auth.uid()) = user_id`, and the insert/update policies add
`with check`. `public.stop_timer(p_end timestamptz)` is `security invoker` and
inserts the finished entry then deletes the timer in one function.

`scripts/check-rls.ts` (`npm run check:rls`) parses every
`supabase/migrations/*.sql` and fails on a missing RLS toggle, a missing
policy, a policy that is not authenticated / not owner-scoped, a missing
`with check`, or a missing `stop_timer`. Verified it fails on a deliberately
broken throwaway migration (then removed it). `supabase/README.md` documents
project creation, the two env vars, applying the migration via the CLI or the
SQL editor, and the required auth redirect URLs. No database was contacted.
lint + typecheck + test (152) + build + check:rls + `ui:audit` all pass.

## Supabase Phase 2 — Clients, env and session refresh
`lib/config.ts` decides the backend with pure helpers (`resolveBackend`,
`resolveSupabaseConfig`, `hasSupabaseConfig`): Supabase when both
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set,
otherwise local. It also exposes two runtime overrides used only by tests and
the audit — a `localStorage` flag and `TIME_TRACKER_BACKEND` (which is not read
from `.env.local`, so it always wins at `next start`). `getSupabaseConfig()`
returns `null` whenever the backend is local.

`lib/supabase/cookie-methods.ts` holds the `getAll`/`setAll` cookie adapter and
`createServerSupabaseClient`; `lib/supabase/server.ts` builds a per-request
client from `next/headers` and exposes `getVerifiedClaims()` (uses
`getClaims()`, never `getSession()`); `lib/supabase/client.ts` wraps
`createBrowserClient`; `lib/supabase/session.ts` holds the pure redirect rules;
`lib/supabase/middleware.ts` implements `updateSession`. The root **`proxy.ts`**
(Next 16.4.3, so not `middleware.ts`) is thin: it only calls `updateSession`
and is a no-op when Supabase is not configured. `.env.example` documents the
two variables with blank values. Tests: `tests/config.test.ts` and
`tests/supabase.test.ts` (mocked cookie stores/clients, redirect rules,
`userFromClaims`).

The audit harness now forces the local backend (`TIME_TRACKER_BACKEND=local`
for the server and a `localStorage` flag for the browser provider), so it never
reads or contacts a Supabase project even though `.env.local` defines one.
lint + typecheck + test (160) + build + `ui:audit` (144 captures, 0 problems)
pass.

## Supabase Phase 3 — Auth UI
`components/AuthForm.tsx` is a single shadcn-based form for both `/login` and
`/signup` (email + password, inline `role="alert"` errors, `role="status"`
feedback, real `<label>`s, keyboard/`autoComplete` support, no-JS-free markup).
It calls `signInWithPassword` / `signUp` (with
`emailRedirectTo=/auth/callback`) and redirects to a sanitized `next` path. A
hydration-safe `useSyncExternalStore` read shows a "cloud sync is not
configured" note on the local backend. `app/login/page.tsx` and
`app/signup/page.tsx` wrap the form in `Suspense` for `useSearchParams`.
`app/auth/callback/route.ts` exchanges the PKCE code and
`app/auth/confirm/route.ts` verifies the email OTP; both redirect to `/` when
Supabase is not configured.

`components/AccountMenu.tsx` (+ `components/useAuthUser.ts`) shows the signed-in
email and a Sign out action and renders nothing on the local backend or while
signed out, so it only appears when Supabase is active with a session; the
shell header now includes it. The account/auth pages are not linked from the
app navigation. `ui:audit` now also visits `/login` and `/signup`; required
fixes were an `sr-only` `h1` per page, permanently underlined inline links, and
40px hit areas on those links. lint + typecheck + test (160) + build +
`ui:audit` (216 captures, 0 problems) pass.

## Supabase Phase 4 — SupabaseRepository
`lib/data/supabase-repository.ts` implements `DataRepository` on top of a
narrow `SupabaseDataClient` seam (`lib/data/supabase-client.ts`, adapted from
the real client in `lib/data/supabase-adapter.ts`). It maps snake_case rows to
camelCase models, maps `category_id: null` to the built-in Uncategorized
category (and back to `null` on writes), and converts Supabase errors into
typed `DataWriteError`/`DataValidationError`s. `stopTimer` reads the timer,
updates its description when the caller supplied one, then calls the atomic
`stop_timer` RPC. `lib/data/app-repository.ts` picks Supabase only in the
browser when `getBackend()` is `"supabase"`, and otherwise returns the local
repository; `DataProvider` now uses it.

`tests/fake-supabase.ts` is a small in-memory PostgREST stand-in (select /
insert / update / upsert / delete, `stop_timer`, and the FK
`on delete set null` cascade) and the shared contract suite runs against
`createSupabaseRepository` through it — all 8 contract cases pass. The
contract's entry drafts now reference real categories (a real DB enforces the
FK). A real-client integration test is registered but skipped unless
`SUPABASE_TEST_URL` and `SUPABASE_TEST_KEY` are set, so the default run never
touches the network. lint + typecheck + test (169, 1 skipped) + build +
`ui:audit` pass.

## Supabase Phase 5 — Data behavior
`lib/data/query-keys.ts` centralises the query keys and invalidation, and
`lib/data/mutations.ts` turns every write into optimistic TanStack Query
options: `onMutate` patches categories/entries/running-timer, `onError`
restores the previous cache and calls the error notifier (wired to Sonner's
`toast.error` in `components/data-hooks.ts`), and `onSettled` invalidates the
affected queries. Undo re-inserts the deleted row with its original id
(`restoreEntry`, 23505 treated as already-restored for Postgres idempotency).
The timer is optimistic too, so the tab title and top-bar indicator update
immediately; `stopTimer` still goes through `stop_timer`. Window-focus
refetching is on in `DataProvider`.

`tests/mutations.test.ts` drives the option builders with TanStack's
`MutationObserver` (no React): a failed create rolls the entry back and toasts
the message, a failed category delete rolls back categories + entries + timer,
undo restores the same id, and timer start/stop runs through the fake Supabase
repository. lint + typecheck + test (172, 1 skipped) + build + `ui:audit` pass.

## Supabase Phase 6 — Local-to-cloud migration and settings
`lib/data/migration.ts` maps local ids to **deterministic UUIDs**
(`toCloudId`, FNV-1a → RFC-4122 v4 shape; real uuids are preserved) and
rewrites entry/timer references through the same map, so importing twice
produces identical rows rather than duplicates. `hasMigratableData` /
`isCloudEmpty` describe when the offer applies, and `migrateLocalData` writes
through the active repository. `lib/data/local-store.ts` is a cached
`useSyncExternalStore` view of the pre-sign-in `localStorage` snapshot.

`components/LocalDataMigration.tsx` (mounted in the shell) offers, once the
cloud account is loaded and empty, to import N entries / M categories; on
success it offers to clear the local copy. `components/AccountCard.tsx` shows
the signed-in email and Sign out on the Settings page (`useSignOut` is now
shared with `AccountMenu`). Export/Import and Reset already flow through
`useAppData` → the active repository, so Reset only deletes the signed-in
user's rows (RLS); theme and time format stay local. The fake Supabase client
now models per-user RLS so scope can be asserted.

Tests: `tests/migration.test.ts` covers id stability/shape, consistent
references, idempotent double-import, the offer predicates, and that one
user's reset leaves another user's rows untouched. lint + typecheck + test
(177, 1 skipped) + build + `ui:audit` pass.

## Supabase Phase 7 — Hardening
`npm run build` now runs `npm run check:secrets` first. `scripts/check-secrets.ts`
walks the repository (skipping `node_modules`, `.next`, `.git`, `.test-build`,
`.pi`, `.agent`, build artifacts and every `.env*` file so no credential is ever
read) and fails if `service_role`, `sb_secret_` or `SUPABASE_SERVICE` appears;
the needles are assembled from fragments so the checker never matches itself.
The one literal mention that used to be in `supabase/README.md` was reworded to
"private server key".

`ui:audit` gained a fourth fixture state, `error`, which seeds unreadable
`localStorage` so the `StorageErrorBanner` recovery UI renders on every route;
that surfaced a latent dark/light contrast failure on its reset button, which
now uses an outline destructive style (`border-destructive/40 text-destructive`,
`hover:bg-destructive/10`). The audit now covers 6 routes × 3 widths × 2 themes
× 4 states = 288 captures with 0 problems (loading skeletons are exercised while
each page settles). The root `README.md` links a "Supabase setup" section
(project + publishable key, env vars, applying the migration, auth redirect
URLs) and points at `supabase/README.md`.

## Supabase — final state
All seven phases are complete. `npm run verify` (lint + typecheck + test +
build-with-check:secrets) passes with 177 tests (1 optional integration test
skipped without `SUPABASE_TEST_URL`/`SUPABASE_TEST_KEY`); `npm run check:rls`,
`npm run check:secrets` and `npm run ui:audit` (288 captures, 0 problems) pass.
With no Supabase env vars the app runs entirely on the localStorage backend;
`.env.local` was never read or edited, no command contacted a remote database
or Supabase project, and no git commits were made. `git diff` confirms
`lib/storage.ts` and `tests/storage.test.ts` are unchanged, and the pure
functions in `lib/` kept their signatures and behaviour.
