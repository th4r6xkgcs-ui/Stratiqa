create table if not exists public.analyst_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.analyst_models(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  name text not null,
  description text not null,
  factors jsonb not null,
  strategy text not null,
  risk_profile text not null,
  weights jsonb not null,
  archived_at timestamptz not null default now(),
  unique (model_id, version)
);

alter table public.analyst_model_versions enable row level security;
create policy "Users read their model history" on public.analyst_model_versions
for select to authenticated using ((select auth.uid()) = user_id);

alter table public.graded_betting_activity
  add column if not exists model_version integer;

update public.graded_betting_activity
set model_version = 1
where model_id is not null and model_version is null;

alter table public.graded_betting_activity
  drop constraint if exists model_attribution_requires_version;
alter table public.graded_betting_activity
  add constraint model_attribution_requires_version check (
    attribution_type <> 'model' or model_version is not null
  );

create or replace function public.version_analyst_model()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if row(old.name, old.description, old.factors, old.strategy, old.risk_profile, old.weights)
     is distinct from
     row(new.name, new.description, new.factors, new.strategy, new.risk_profile, new.weights) then
    insert into public.analyst_model_versions (
      model_id, user_id, version, name, description, factors,
      strategy, risk_profile, weights
    ) values (
      old.id, old.user_id, old.version, old.name, old.description, old.factors,
      old.strategy, old.risk_profile, old.weights
    ) on conflict (model_id, version) do nothing;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists version_model_before_update on public.analyst_models;
create trigger version_model_before_update
before update on public.analyst_models
for each row execute function public.version_analyst_model();

create index if not exists model_versions_history_idx
on public.analyst_model_versions (model_id, version desc);

comment on table public.analyst_model_versions is
'Immutable configuration snapshots. Editing a model creates a new version without rewriting its prior picks.';
comment on column public.graded_betting_activity.model_version is
'The exact model configuration version active when the pick was locked.';
