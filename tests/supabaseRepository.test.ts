/**
 * Runs the shared repository contract against the Supabase implementation
 * using a small fake client. A real integration run is registered only when
 * `SUPABASE_TEST_URL` and `SUPABASE_TEST_KEY` are provided; otherwise it is
 * skipped, so the default test run never touches the network.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createClient } from "@supabase/supabase-js";

import { toSupabaseDataClient } from "../lib/data/supabase-adapter";
import { createSupabaseRepository } from "../lib/data/supabase-repository";
import { createFakeSupabaseClient } from "./fake-supabase";
import { runRepositoryContract } from "./repository-contract";

runRepositoryContract("supabase repository", () =>
  createSupabaseRepository(createFakeSupabaseClient()),
);

const integrationUrl = process.env.SUPABASE_TEST_URL;
const integrationKey = process.env.SUPABASE_TEST_KEY;

test(
  "supabase integration: export reads through a real client",
  {
    skip:
      integrationUrl && integrationKey
        ? false
        : "Set SUPABASE_TEST_URL and SUPABASE_TEST_KEY to run.",
  },
  async () => {
    const client = createClient(integrationUrl!, integrationKey!, {
      auth: { persistSession: false },
    });
    const repository = createSupabaseRepository(toSupabaseDataClient(client));

    const data = await repository.exportAll();
    assert.ok(Array.isArray(data.categories));
    assert.ok(Array.isArray(data.entries));
  },
);
