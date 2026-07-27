create table if not exists public.model_recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id uuid not null references public.analyst_models(id) on delete cascade,
  model_version integer not null,
  snapshot_key text not null,
  sport text not null,
  category text not null,
  event_name text not null,
  selection text not null,
  provider_event_id text,
  provider_sport_key text,
  market_key text,
  outcome_name text,
  line_point numeric,
  american_odds integer not null,
  model_score integer not null check (model_score between 0 and 100),
  qualification_threshold integer not null check (qualification_threshold between 0 and 100),
  decision text not null check (decision in ('recommend', 'pass')),
  signal_agreement integer not null check (signal_agreement between 0 and 100),
  expected_value numeric not null,
  signals jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  event_commence_at timestamptz,
  observed_on date not null default current_date,
  observed_at timestamptz not null default now(),
  unique (model_id, model_version, snapshot_key, observed_on)
);

create index if not exists model_recommendation_history_idx
on public.model_recommendation_snapshots (user_id, observed_at desc);

create index if not exists model_recommendation_link_idx
on public.model_recommendation_snapshots
  (model_id, provider_event_id, market_key, outcome_name, line_point);

alter table public.model_recommendation_snapshots enable row level security;

drop policy if exists "Users read their recommendation memory" on public.model_recommendation_snapshots;
create policy "Users read their recommendation memory"
on public.model_recommendation_snapshots for select to authenticated
using (auth.uid() = user_id);

create or replace function public.protect_model_recommendation_snapshot()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Model recommendation snapshots are immutable';
end;
$$;

drop trigger if exists protect_model_recommendation_snapshot on public.model_recommendation_snapshots;
create trigger protect_model_recommendation_snapshot
before update or delete on public.model_recommendation_snapshots
for each row execute function public.protect_model_recommendation_snapshot();

comment on table public.model_recommendation_snapshots is
'Immutable daily observations of what a specific model version recommended or passed before an event.';
