/**
 * Build guard: fails when a privileged Supabase credential keyword appears in
 * the repository. The app only ever uses the publishable key, so a private
 * server key must never be referenced or committed.
 *
 * The needles are assembled from fragments so this file does not match itself.
 * It is pure text scanning — it never reads `.env*` files or contacts anything.
 *
 * Run with `npm run check:secrets` (also wired into `npm run build`).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";

const NEEDLES = ["service" + "_role", "sb" + "_secret_", "SUPABASE" + "_SERVICE"];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".test-build",
  ".pi",
  ".agent",
  "coverage",
  "dist",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
  ".zip",
  ".tsbuildinfo",
]);

/** Credential files are never read; only their names would be considered. */
function isEnvFile(name: string): boolean {
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env");
}

async function scanFile(file: string, problems: string[]): Promise<void> {
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch {
    return;
  }
  for (const needle of NEEDLES) {
    if (content.includes(needle)) {
      problems.push(`${path.relative(process.cwd(), file)} contains "${needle}"`);
    }
  }
}

async function walk(dir: string, problems: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walk(full, problems);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isEnvFile(entry.name)) continue;
    if (IGNORED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const info = await stat(full);
    if (info.size > 2_000_000) continue;
    await scanFile(full, problems);
  }
}

async function main(): Promise<void> {
  const problems: string[] = [];
  await walk(process.cwd(), problems);

  if (problems.length > 0) {
    console.error("check:secrets failed — privileged Supabase keywords found:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log("check:secrets passed: no privileged Supabase credentials found.");
}

void main();
