create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_profile text not null default 'balanced' check (risk_profile in ('conservative', 'balanced', 'aggressive')),
  leagues text[] not null default array['MLB']::text[],
  sportsbooks text[] not null default array['DraftKings', 'FanDuel']::text[],
  max_unit_size numeric(4,2) not null default 1 check (max_unit_size > 0 and max_unit_size <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can read their own preferences"
on public.user_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own preferences"
on public.user_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own preferences"
on public.user_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
