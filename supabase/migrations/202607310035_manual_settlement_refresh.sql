-- V18.2: let analysts safely request an immediate provider refresh for their own completed picks.
create table if not exists public.manual_settlement_refreshes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.manual_settlement_refreshes enable row level security;
create policy "Users read their own settlement refresh" on public.manual_settlement_refreshes for select to authenticated using (auth.uid() = user_id);
comment on table public.manual_settlement_refreshes is 'Rate-limit record for user-requested official-result refreshes. Does not settle or alter picks.';
