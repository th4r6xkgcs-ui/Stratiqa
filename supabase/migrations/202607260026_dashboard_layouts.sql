create table if not exists public.dashboard_layouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null default '{"version":1,"order":["rating","focus","best","stats","activity","updates","loop"],"hidden":[],"sizes":{"rating":"compact","focus":"compact","best":"compact","stats":"wide","activity":"standard","updates":"compact","loop":"wide"}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_layouts enable row level security;

drop policy if exists "Users can read their own dashboard layout" on public.dashboard_layouts;
create policy "Users can read their own dashboard layout"
on public.dashboard_layouts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own dashboard layout" on public.dashboard_layouts;
create policy "Users can insert their own dashboard layout"
on public.dashboard_layouts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own dashboard layout" on public.dashboard_layouts;
create policy "Users can update their own dashboard layout"
on public.dashboard_layouts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
