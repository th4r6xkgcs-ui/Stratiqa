create table if not exists public.settlement_runs (
  id uuid primary key,
  status text not null check (status in ('running', 'complete', 'partial', 'deferred', 'failed')),
  trigger_source text not null default 'cron' check (trigger_source in ('cron', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checked_games integer not null default 0,
  checked_props integer not null default 0,
  settled_games integer not null default 0,
  settled_props integer not null default 0,
  deferred_games integer not null default 0,
  deferred_props integer not null default 0,
  failures jsonb not null default '[]'::jsonb
);

create index if not exists settlement_runs_started_idx
on public.settlement_runs (started_at desc);

create table if not exists public.settlement_issues (
  id bigint generated always as identity primary key,
  run_id uuid references public.settlement_runs(id) on delete set null,
  fingerprint text not null,
  scope text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  attempts integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  next_retry_at timestamptz,
  resolved_at timestamptz
);

create unique index if not exists settlement_issues_open_fingerprint_idx
on public.settlement_issues (fingerprint) where status = 'open';

create table if not exists public.settlement_job_lock (
  singleton boolean primary key default true check (singleton),
  run_id uuid,
  locked_until timestamptz
);
insert into public.settlement_job_lock (singleton) values (true) on conflict do nothing;

alter table public.settlement_runs enable row level security;
alter table public.settlement_issues enable row level security;
alter table public.settlement_job_lock enable row level security;

create or replace function public.acquire_settlement_job(requested_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare acquired boolean;
begin
  update public.settlement_job_lock
  set run_id = requested_run_id, locked_until = now() + interval '10 minutes'
  where singleton = true and (locked_until is null or locked_until < now())
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_settlement_job(requested_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare released boolean;
begin
  update public.settlement_job_lock
  set run_id = null, locked_until = null
  where singleton = true and run_id = requested_run_id
  returning true into released;
  return coalesce(released, false);
end;
$$;

create or replace function public.get_settlement_operations_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'lastRun', (
      select jsonb_build_object(
        'id', id, 'status', status, 'triggerSource', trigger_source,
        'startedAt', started_at, 'finishedAt', finished_at,
        'checked', checked_games + checked_props,
        'settled', settled_games + settled_props,
        'deferred', deferred_games + deferred_props
      ) from public.settlement_runs order by started_at desc limit 1
    ),
    'lastSuccessfulAt', (
      select finished_at from public.settlement_runs
      where status in ('complete', 'partial') and finished_at is not null
      order by finished_at desc limit 1
    ),
    'openIssues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'scope', scope, 'reason', reason, 'attempts', attempts,
        'lastSeenAt', last_seen_at, 'nextRetryAt', next_retry_at
      ) order by last_seen_at desc)
      from public.settlement_issues where status = 'open'
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.acquire_settlement_job(uuid) from public, anon, authenticated;
revoke all on function public.release_settlement_job(uuid) from public, anon, authenticated;
grant execute on function public.acquire_settlement_job(uuid) to service_role;
grant execute on function public.release_settlement_job(uuid) to service_role;
grant execute on function public.get_settlement_operations_status() to service_role;
grant execute on function public.get_settlement_operations_status() to authenticated;

comment on table public.settlement_runs is 'Durable operational history for automatic and manual settlement jobs.';
comment on table public.settlement_issues is 'Deduplicated provider failures with bounded exponential retry timing.';
