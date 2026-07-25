create table if not exists public.competitive_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_alias text,
  region_code text,
  leaderboard_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.graded_betting_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  category text not null,
  market text not null,
  american_odds integer not null,
  closing_odds integer,
  stake_units numeric(7,2) not null check (stake_units > 0 and stake_units <= 100),
  result text check (result in ('pending', 'win', 'loss', 'push', 'void')),
  profit_units numeric(9,2),
  source text not null default 'user',
  placed_at timestamptz not null,
  graded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.category_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  rating numeric(7,2) not null default 1500,
  graded_picks integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  pushes integer not null default 0,
  roi_percent numeric(8,3) not null default 0,
  closing_line_value numeric(8,3) not null default 0,
  confidence_calibration numeric(8,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.competitive_profiles enable row level security;
alter table public.graded_betting_activity enable row level security;
alter table public.category_ratings enable row level security;

create policy "Users manage their competitive profile"
on public.competitive_profiles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read their own graded activity"
on public.graded_betting_activity for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read their own category ratings"
on public.category_ratings for select to authenticated
using ((select auth.uid()) = user_id);

comment on table public.category_ratings is
'Server-computed ratings. Regional or global leaderboard eligibility requires opt-in and at least 25 graded picks in the category.';
