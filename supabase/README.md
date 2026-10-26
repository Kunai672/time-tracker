# Supabase setup

The app runs fully on `localStorage` when Supabase is not configured. To turn
on cloud persistence and auth, a human applies the schema below and sets two
environment variables. Nothing in the repository ever contacts a Supabase
project on its own.

## 1. Create a project

1. Create a project at <https://supabase.com/dashboard>.
2. In **Project Settings → API**, copy the **Project URL** and the
   **publishable key** (the `sb_publishable_…` key). Never use or share the
   project's private server key — this app does not need it and never
   references it.

## 2. Set the environment variables

Add both variables to `.env.local` (which is git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

When **both** are present the app uses Supabase; otherwise it falls back to the
local `localStorage` backend. `.env.example` documents the same two names with
placeholder values.

## 3. Apply the migration

`supabase/migrations/0001_init.sql` creates the `categories`, `entries` and
`running_timers` tables, their indexes, row-level security policies and the
atomic `stop_timer` function.

Pick either route:

- **Supabase CLI** (recommended):

  ```bash
  supabase link --project-ref <project-ref>
  supabase db push
  ```

- **Dashboard SQL editor**: open the project, go to the SQL editor, paste the
  contents of `supabase/migrations/0001_init.sql` and run it.

Verify the result statically without any network access:

```bash
npm run check:rls
```

The script fails if any table is missing row-level security or any of the four
`select`/`insert`/`update`/`delete` policies.

## 4. Configure auth URLs

In **Authentication → URL Configuration**:

- Set **Site URL** to the deployed origin (for local development that is
  `http://localhost:3000`).
- Add allowed **Redirect URLs** for:
  - `http://localhost:3000/auth/callback`
  - `https://<your-domain>/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://<your-domain>/auth/confirm`

Email + password sign-in works out of the box. If email confirmation is
enabled, the confirmation link must point at `/auth/confirm`.

## 5. Row-level security model

Every table stores a `user_id` that defaults to `auth.uid()`. RLS is enabled on
all three tables and each has separate `select`, `insert`, `update` and
`delete` policies for the `authenticated` role that require
`(select auth.uid()) = user_id`. The `insert`/`update` policies repeat the
check with `with check`, so a signed-in user can never write a row for someone
else. `public.stop_timer` is `security invoker`, so it runs with the caller's
permissions and the same policies apply.
