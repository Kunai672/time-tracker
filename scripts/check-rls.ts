/**
 * Static RLS guard for the Supabase migrations.
 *
 * Parses every `supabase/migrations/*.sql` file and fails (non-zero exit)
 * unless, for each `public` table:
 *
 *   - row-level security is enabled, and
 *   - there is a `select`, an `insert`, an `update` and a `delete` policy for
 *     the `authenticated` role, each scoping rows with
 *     `(select auth.uid()) = user_id`, and
 *   - the `insert`/`update` policies include a `with check`.
 *
 * It also requires the atomic `stop_timer` function. This is a text check, not
 * a database connection — it never contacts a Supabase project.
 *
 * Run with `npm run check:rls`.
 */
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const COMMANDS = ["select", "insert", "update", "delete"] as const;

type Command = (typeof COMMANDS)[number];

type Policy = {
  name: string;
  table: string;
  command: Command | "all";
  authenticated: boolean;
  ownsRow: boolean;
  withCheck: boolean;
};

type TableReport = {
  table: string;
  rls: boolean;
  policies: Map<Command, Policy>;
};

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

function normalize(sql: string): string {
  return stripComments(sql).replace(/\s+/g, " ");
}

function parseTables(sql: string): string[] {
  const tables = new Set<string>();
  const re = /create table (?:if not exists )?public\.([a-z_][a-z0-9_]*)/gi;
  for (const match of sql.matchAll(re)) tables.add(match[1]);
  return [...tables].sort();
}

function parsePolicies(sql: string): Policy[] {
  const policies: Policy[] = [];
  const re =
    /create policy\s+"?([a-z0-9_]+)"?\s+on\s+public\.([a-z_][a-z0-9_]*)([\s\S]*?);/gi;

  for (const match of sql.matchAll(re)) {
    const body = match[3];
    const commandMatch = body.match(
      /\bfor\s+(select|insert|update|delete|all)\b/i,
    );
    if (!commandMatch) continue;

    policies.push({
      name: match[1],
      table: match[2],
      command: commandMatch[1].toLowerCase() as Command | "all",
      authenticated: /\bto\s+[a-z_,\s]*\bauthenticated\b/i.test(body),
      ownsRow:
        /\(\s*select\s+auth\.uid\(\)\s*\)\s*=\s*user_id/i.test(body) ||
        /\bauth\.uid\(\)\s*=\s*user_id/i.test(body),
      withCheck: /\bwith check\b/i.test(body),
    });
  }

  return policies;
}

function tableHasRls(sql: string, table: string): boolean {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `alter table\\s+public\\.${escaped}\\s+enable row level security`,
    "i",
  ).test(sql);
}

async function main(): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();
  } catch {
    console.error(`check:rls — no migrations directory at ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("check:rls — no .sql migrations found.");
    process.exit(1);
  }

  const raw = (
    await Promise.all(
      files.map((file) => readFile(path.join(MIGRATIONS_DIR, file), "utf8")),
    )
  ).join("\n");
  const sql = normalize(raw);

  const tables = parseTables(sql);
  const policies = parsePolicies(sql);

  const reports: TableReport[] = tables.map((table) => {
    const byCommand = new Map<Command, Policy>();
    for (const policy of policies.filter((p) => p.table === table)) {
      if (policy.command === "all") {
        for (const command of COMMANDS) {
          if (!byCommand.has(command)) byCommand.set(command, policy);
        }
      } else if (!byCommand.has(policy.command)) {
        byCommand.set(policy.command, policy);
      }
    }
    return { table, rls: tableHasRls(sql, table), policies: byCommand };
  });

  const problems: string[] = [];

  if (tables.length === 0) {
    problems.push("No `public` tables were found in the migrations.");
  }

  for (const report of reports) {
    if (!report.rls) {
      problems.push(`Table "${report.table}" does not enable row level security.`);
    }
    for (const command of COMMANDS) {
      const policy = report.policies.get(command);
      if (!policy) {
        problems.push(
          `Table "${report.table}" is missing a ${command.toUpperCase()} policy.`,
        );
        continue;
      }
      if (!policy.authenticated) {
        problems.push(
          `Policy "${policy.name}" (${report.table} ${command}) is not scoped to the authenticated role.`,
        );
      }
      if (!policy.ownsRow) {
        problems.push(
          `Policy "${policy.name}" (${report.table} ${command}) does not use (select auth.uid()) = user_id.`,
        );
      }
      if ((command === "insert" || command === "update") && !policy.withCheck) {
        problems.push(
          `Policy "${policy.name}" (${report.table} ${command}) is missing a WITH CHECK clause.`,
        );
      }
    }
  }

  const functionOk =
    /create or replace function\s+public\.stop_timer\s*\(\s*p_end\s+timestamptz\s*\)/i.test(
      sql,
    ) && /security invoker/i.test(sql);
  if (!functionOk) {
    problems.push(
      "Function public.stop_timer(p_end timestamptz) with SECURITY INVOKER is missing.",
    );
  }

  if (problems.length > 0) {
    console.error("check:rls failed:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(
    `check:rls passed: ${tables.length} tables, ${policies.length} policies, stop_timer present.`,
  );
}

void main();
