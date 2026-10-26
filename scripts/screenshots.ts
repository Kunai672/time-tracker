/**
 * Responsive screenshot pass.
 *
 * Boots the production server, then captures every page at 375 / 768 / 1280px
 * in both light and dark mode into `.agent/screenshots/`. It also reports any
 * horizontal overflow it finds, which is the signal used to fix clipped
 * layouts.
 *
 * Run with: `npm run screenshots`
 */
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import * as path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

const PORT = Number(process.env.SCREENSHOT_PORT ?? 3123);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), ".agent", "screenshots");

const PAGES = [
  { name: "dashboard", route: "/" },
  { name: "entries", route: "/entries" },
  { name: "categories", route: "/categories" },
  { name: "settings", route: "/settings" },
] as const;

const VIEWPORTS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1280", width: 1280, height: 900 },
] as const;

const THEMES = ["light", "dark"] as const;

/** Local time `daysAgo` days before now, at `hour:00`. */
function at(daysAgo: number, hour: number, minute = 0): Date {
  const date = new Date();
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

/**
 * Sample data relative to the run date, so the stat cards and charts are
 * populated in the screenshots.
 */
function buildSeed() {
  return {
    version: 1,
    categories: [
      { id: "uncategorized", name: "Uncategorized", color: "#9ca3af" },
      { id: "work", name: "Work", color: "#4f46e5" },
      { id: "study", name: "Study", color: "#0d9488" },
      { id: "exercise", name: "Exercise", color: "#d97706" },
    ],
    entries: [
      entry("e1", "Deep work", "work", at(0, 9), 150),
      entry("e2", "Standup", "work", at(0, 11, 30), 30),
      entry("e3", "Reading", "study", at(0, 14), 90),
      entry("e4", "Design review", "work", at(1, 9, 30), 120),
      entry("e5", "Yoga", "exercise", at(1, 18), 45),
      entry("e6", "Course", "study", at(2, 8), 75),
      entry("e7", "Pairing", "work", at(2, 11), 60),
      entry("e8", "Writing", "work", at(2, 15), 45),
    ],
    runningTimer: null,
  };
}

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

/** Ensures a production build exists, so the script also works on a fresh checkout. */
async function ensureBuild(): Promise<void> {
  try {
    await access(path.join(process.cwd(), ".next"));
  } catch {
    await runCommand("npm", ["run", "build"]);
  }
}

async function overflowReport(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const overflow = root.scrollWidth - window.innerWidth;
    return overflow > 1 ? overflow : 0;
  });
}

async function run(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await ensureBuild();

  const server = startServer();
  const problems: string[] = [];
  let browser: Browser | undefined;

  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch();

    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        await context.addInitScript((seed) => {
          window.localStorage.setItem("time-tracker", JSON.stringify(seed));
        }, buildSeed());

        const page = await context.newPage();

        for (const target of PAGES) {
          await page.goto(`${BASE_URL}${target.route}`, {
            waitUntil: "networkidle",
          });
          await page.waitForTimeout(400);

          const overflow = await overflowReport(page);
          if (overflow > 0) {
            problems.push(
              `${target.name} @ ${viewport.name}px ${theme}: ${overflow}px horizontal overflow`,
            );
          }

          const file = path.join(
            OUT_DIR,
            `${target.name}-${viewport.name}-${theme}.png`,
          );
          await page.screenshot({ path: file, fullPage: true });
        }

        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }

  if (problems.length > 0) {
    console.warn("\nHorizontal overflow detected:");
    for (const problem of problems) console.warn(`  - ${problem}`);
  } else {
    console.log("No horizontal overflow detected.");
  }
  console.log(`Screenshots written to ${OUT_DIR}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
