/**
 * Automated UI layout audit.
 *
 * Boots the production build and visits every primary route at 375 / 768 /
 * 1280px, in both themes, and in three data states (seeded, empty,
 * running-timer). For each combination it:
 *
 *   1. fails when the document scrolls horizontally,
 *   2. fails when an element overflows its nearest card horizontally,
 *   3. fails when a text input is narrower than 120px,
 *   4. fails when a button or link on a viewport of 768px or less has a hit
 *      area under 40x40px,
 *   5. fails on any axe-core accessibility violation,
 *   6. writes a viewport-height and a full-page screenshot to
 *      `.agent/screenshots/` named `<page>-<width>-<theme>-<state>.png`
 *      (the full-page capture adds a `-full` suffix),
 *   7. rewrites `.agent/screenshots/INDEX.md` listing every capture.
 *
 * Run with `npm run ui:audit`. The process exits non-zero when any check
 * fails, so it can gate CI and the per-phase verification.
 *
 * ## Seed fixture
 *
 * The three states are built by `buildFixture()` below from one documented
 * fixture:
 *
 * - `seeded` carries four categories (Uncategorized, Work, Study, Exercise)
 *   and eight entries spread over the current, previous and two-days-ago
 *   days, so the stat cards and both charts have real data.
 * - `empty` is the app's first-run state: only the built-in Uncategorized
 *   category, no entries and no timer.
 * - `running-timer` reuses the seeded data and adds a timer started 42
 *   minutes ago in the Work category, so the live clock, indicator and hero
 *   card are exercised.
 *
 * The fixture is written to `localStorage["time-tracker"]` before the app
 * boots. Dates are relative to the audit run so "today" always has entries.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { chromium, type Browser } from "@playwright/test";

import type { AppData } from "../lib/types";

const PORT = Number(process.env.UI_AUDIT_PORT ?? 3124);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), ".agent", "screenshots");
const INDEX_FILE = path.join(OUT_DIR, "INDEX.md");
const STORAGE_KEY = "time-tracker";

/** Primary routes. `/data` and `/reports` are redirects and render no UI. */
const PAGES = [
  { name: "dashboard", route: "/" },
  { name: "entries", route: "/entries" },
  { name: "categories", route: "/categories" },
  { name: "settings", route: "/settings" },
] as const;

const VIEWPORTS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
] as const;

const THEMES = ["light", "dark"] as const;
const STATES = ["seeded", "empty", "running-timer"] as const;

type StateName = (typeof STATES)[number];

type PageProblem = {
  check:
    | "horizontal-scroll"
    | "card-overflow"
    | "input-width"
    | "hit-area"
    | "axe";
  detail: string;
};

type ScreenshotEntry = {
  page: string;
  width: string;
  theme: string;
  state: StateName;
  view: "viewport" | "full";
  file: string;
};

/* ------------------------------------------------------------------ *
 * Seed fixture (documented above)
 * ------------------------------------------------------------------ */

/** Local time `daysAgo` days before `now`, at `hour:minute`. */
function at(now: Date, daysAgo: number, hour: number, minute = 0): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function entry(
  id: string,
  description: string,
  categoryId: string,
  start: Date,
  minutes: number,
) {
  return {
    id,
    description,
    categoryId,
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60_000).toISOString(),
    durationMinutes: minutes,
  };
}

function buildFixture(state: StateName, now = new Date()): AppData {
  const categories = [
    { id: "uncategorized", name: "Uncategorized", color: "#9ca3af" },
    { id: "work", name: "Work", color: "#4f46e5" },
    { id: "study", name: "Study", color: "#0d9488" },
    { id: "exercise", name: "Exercise", color: "#d97706" },
  ];

  if (state === "empty") {
    return {
      version: 1,
      categories: [{ id: "uncategorized", name: "Uncategorized", color: "#9ca3af" }],
      entries: [],
      runningTimer: null,
    };
  }

  const entries = [
    entry("e1", "Deep work", "work", at(now, 0, 9), 150),
    entry("e2", "Standup", "work", at(now, 0, 11, 30), 30),
    entry("e3", "Reading", "study", at(now, 0, 14), 90),
    entry("e4", "Design review", "work", at(now, 1, 9, 30), 120),
    entry("e5", "Yoga", "exercise", at(now, 1, 18), 45),
    entry("e6", "Course", "study", at(now, 2, 8), 75),
    entry("e7", "Pairing", "work", at(now, 2, 11), 60),
    entry("e8", "Writing", "work", at(now, 2, 15), 45),
  ];

  return {
    version: 1,
    categories,
    entries,
    runningTimer:
      state === "running-timer"
        ? { categoryId: "work", startedAt: at(now, 0, now.getHours(), now.getMinutes() - 42).toISOString() }
        : null,
  };
}

/* ------------------------------------------------------------------ *
 * Server lifecycle
 * ------------------------------------------------------------------ */

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not become ready in time.`);
}

function startServer(): ChildProcess {
  const nextBin = path.join(process.cwd(), "node_modules", ".bin", "next");
  return spawn(nextBin, ["start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, PORT: String(PORT) },
  });
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

/** Makes sure a production build exists, so the audit works on a clean tree. */
async function ensureBuild(): Promise<void> {
  try {
    await access(path.join(process.cwd(), ".next"));
  } catch {
    await runCommand("npm", ["run", "build"]);
  }
}

/* ------------------------------------------------------------------ *
 * In-page checks
 * ------------------------------------------------------------------ */

/**
 * Runs every DOM-based check in the browser and returns the problems found.
 * axe is executed separately from Node, so it is not part of this function.
 *
 * Everything the function needs must live inside it: `page.evaluate` ships the
 * source to the browser and cannot close over module-scope helpers.
 */
function collectDomProblems(): PageProblem[] {
  const problems: PageProblem[] = [];

  /** Short, source-independent label for an offending element. */
  const describeElement = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const testId = el.getAttribute("data-testid");
    const slot = el.getAttribute("data-slot");
    const aria =
      el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 32) ?? "";
    const hint = testId
      ? `[data-testid=${testId}]`
      : slot
        ? `[data-slot=${slot}]`
        : "";
    return `<${tag}${id}${hint}>${aria ? ` “${aria}”` : ""}`;
  };

  // 1. Horizontal page scroll.
  const doc = document.documentElement;
  const horizontal = doc.scrollWidth - window.innerWidth;
  if (horizontal > 1) {
    problems.push({
      check: "horizontal-scroll",
      detail: `document scrolls horizontally by ${Math.round(horizontal)}px`,
    });
  }

  // 2. Elements overflowing their nearest card horizontally. Transformed or
  //    animated decoration (ping dots) and portaled/SVG internals are ignored.
  const cards = Array.from(document.querySelectorAll('[data-slot="card"]'));
  for (const card of cards) {
    const cardRect = card.getBoundingClientRect();
    if (cardRect.width === 0 && cardRect.height === 0) continue;
    for (const el of Array.from(card.querySelectorAll("*"))) {
      if (el.closest('[data-slot="card"]') !== card) continue;
      if (el instanceof SVGElement) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "fixed") continue;
      if (style.animationName && style.animationName !== "none") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const overflow = Math.max(cardRect.left - rect.left, rect.right - cardRect.right);
      if (overflow > 1) {
        problems.push({
          check: "card-overflow",
          detail: `${describeElement(el)} overflows its card by ${Math.round(overflow)}px`,
        });
      }
    }
  }

  // 3. Text inputs narrower than 120px.
  const textualTypes = new Set([
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
  ]);
  for (const el of Array.from(document.querySelectorAll("input"))) {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (!textualTypes.has(type)) continue;
    // Skip framework plumbing that is visually hidden from users.
    if (el.getAttribute("aria-hidden") === "true" || el.tabIndex < 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.width < 120) {
      problems.push({
        check: "input-width",
        detail: `${describeElement(el)} is ${Math.round(rect.width)}px wide (< 120px)`,
      });
    }
  }

  // 4. Hit areas under 40x40px for buttons and links at <= 768px.
  if (window.innerWidth <= 768) {
    const controls = document.querySelectorAll(
      'a[href], button, [role="button"], [role="link"]',
    );
    for (const el of Array.from(controls)) {
      if (el.closest("[hidden]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.width < 40 || rect.height < 40) {
        problems.push({
          check: "hit-area",
          detail: `${describeElement(el)} is ${Math.round(rect.width)}x${Math.round(
            rect.height,
          )}px (< 40x40px)`,
        });
      }
    }
  }

  return problems;
}

/* ------------------------------------------------------------------ *
 * Index + reporting
 * ------------------------------------------------------------------ */

function reportProblem(scope: string, problem: PageProblem): string {
  return `[${scope}] ${problem.check}: ${problem.detail}`;
}

async function writeIndex(entries: ScreenshotEntry[]): Promise<void> {
  const allPngs = (await readdir(OUT_DIR))
    .filter((file) => file.endsWith(".png"))
    .sort();
  const generated = new Set(entries.map((item) => item.file));
  const others = allPngs.filter((file) => !generated.has(file));

  const rows = entries
    .map(
      (item) =>
        `| ${item.page} | ${item.width}px | ${item.theme} | ${item.state} | ${item.view} | \`${item.file}\` |`,
    )
    .join("\n");

  const otherRows = others.length
    ? `\n\n## Other captures\n\n| File |\n| --- |\n${others
        .map((file) => `| \`${file}\` |`)
        .join("\n")}\n`
    : "";

  const markdown = `# UI audit screenshots

Generated by \`npm run ui:audit\` (${new Date().toISOString()}).

Every primary route is captured at 375 / 768 / 1280px, in light and dark, in
the seeded, empty and running-timer states. Each combination has a
viewport-height capture and a \`-full\` full-page capture.

## Generated by the audit

| Page | Width | Theme | State | View | File |
| --- | --- | --- | --- | --- | --- |
${rows}
${otherRows}`;

  await writeFile(INDEX_FILE, markdown, "utf8");
}

/* ------------------------------------------------------------------ *
 * Audit run
 * ------------------------------------------------------------------ */

async function auditCombination(
  browser: Browser,
  viewport: (typeof VIEWPORTS)[number],
  theme: (typeof THEMES)[number],
  state: StateName,
  entries: ScreenshotEntry[],
): Promise<string[]> {
  const problems: string[] = [];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });

  const fixture = buildFixture(state);
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(fixture) },
  );

  const page = await context.newPage();
  const scopeBase = `${viewport.name}px ${theme} ${state}`;

  try {
    for (const target of PAGES) {
      const scope = `${target.name} @ ${scopeBase}`;
      await page.goto(`${BASE_URL}${target.route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const reported = await page.evaluate(collectDomProblems);
      for (const problem of reported) {
        problems.push(reportProblem(scope, problem));
      }

      // axe-core accessibility scan.
      const axe = await new AxeBuilder({ page }).analyze();
      for (const violation of axe.violations) {
        const targets = violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ");
        problems.push(
          `[${scope}] axe: ${violation.id} (${violation.impact ?? "unknown"}): ${
            violation.help
          } — ${violation.nodes.length} node(s): ${targets}`,
        );
      }

      // Screenshots: viewport-height and full-page.
      const base = `${target.name}-${viewport.name}-${theme}-${state}`;
      const viewportFile = `${base}.png`;
      const fullFile = `${base}-full.png`;
      await page.screenshot({ path: path.join(OUT_DIR, viewportFile) });
      await page.screenshot({
        path: path.join(OUT_DIR, fullFile),
        fullPage: true,
      });
      entries.push(
        {
          page: target.name,
          width: viewport.name,
          theme,
          state,
          view: "viewport",
          file: viewportFile,
        },
        {
          page: target.name,
          width: viewport.name,
          theme,
          state,
          view: "full",
          file: fullFile,
        },
      );
    }
  } finally {
    await context.close();
  }

  return problems;
}

async function run(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await ensureBuild();

  const server = startServer();
  const problems: string[] = [];
  const entries: ScreenshotEntry[] = [];
  let browser: Browser | undefined;

  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch();

    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const state of STATES) {
          const found = await auditCombination(
            browser,
            viewport,
            theme,
            state,
            entries,
          );
          problems.push(...found);
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }

  await writeIndex(entries);

  if (problems.length > 0) {
    console.error(`UI audit found ${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(`\nScreenshots written to ${OUT_DIR}`);
    process.exitCode = 1;
    return;
  }

  console.log(`UI audit passed (${entries.length} screenshots).`);
  console.log(`Screenshots written to ${OUT_DIR}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
