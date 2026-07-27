create table if not exists public.strategy_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  builds jsonb not null default '[]'::jsonb,
  active_build_id text not null,
  tracked_picks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategy_portfolios enable row level security;

drop policy if exists "Users can read their own strategy portfolio" on public.strategy_portfolios;
create policy "Users can read their own strategy portfolio"
on public.strategy_portfolios for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own strategy portfolio" on public.strategy_portfolios;
create policy "Users can insert their own strategy portfolio"
on public.strategy_portfolios for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own strategy portfolio" on public.strategy_portfolios;
create policy "Users can update their own strategy portfolio"
on public.strategy_portfolios for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
