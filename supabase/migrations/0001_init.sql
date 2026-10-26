-- Time Tracker — initial schema and row-level security.
--
-- Every table is scoped to a single Supabase auth user. Rows default their
-- `user_id` to `auth.uid()` and RLS makes sure a user can only ever read or
-- write their own rows. Apply this file with the Supabase CLI (`supabase db
-- push`) or by pasting it into the dashboard SQL editor — see ../README.md.

-- gen_random_uuid() lives in pgcrypto on older Postgres versions.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null,
  -- Deleting a category keeps its entries and leaves them uncategorised.
  category_id uuid references public.categories (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  constraint entries_ended_after_started check (ended_at > started_at)
);

-- One running timer per user: the unique user_id is the natural key.
create table if not exists public.running_timers (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  started_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists entries_user_id_started_at_idx
  on public.entries (user_id, started_at);

create index if not exists categories_user_id_idx
  on public.categories (user_id);

create index if not exists running_timers_user_id_idx
  on public.running_timers (user_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.running_timers enable row level security;

-- categories
create policy "categories_select_own" on public.categories
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "categories_insert_own" on public.categories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "categories_update_own" on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories_delete_own" on public.categories
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- entries
create policy "entries_select_own" on public.entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "entries_insert_own" on public.entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "entries_update_own" on public.entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "entries_delete_own" on public.entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- running_timers
create policy "running_timers_select_own" on public.running_timers
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "running_timers_insert_own" on public.running_timers
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "running_timers_update_own" on public.running_timers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "running_timers_delete_own" on public.running_timers
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Atomic stop: insert the finished entry and clear the timer in one statement
-- ---------------------------------------------------------------------------

create or replace function public.stop_timer(p_end timestamptz)
returns public.entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_timer public.running_timers;
  v_entry public.entries;
begin
  select * into v_timer
  from public.running_timers
  where user_id = auth.uid()
  for update;

  if not found then
    return null;
  end if;

  insert into public.entries (user_id, description, category_id, started_at, ended_at)
  values (
    v_timer.user_id,
    coalesce(nullif(v_timer.description, ''), 'Tracked time'),
    v_timer.category_id,
    v_timer.started_at,
    p_end
  )
  returning * into v_entry;

  delete from public.running_timers where user_id = auth.uid();

  return v_entry;
end;
$$;
