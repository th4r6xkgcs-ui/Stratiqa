alter table public.graded_betting_activity
  add column if not exists settlement_reason text,
  add column if not exists provider_stat_value numeric,
  add column if not exists settlement_provider text,
  add column if not exists settlement_revision text;

create table if not exists public.pick_settlement_audit (
  id bigint generated always as identity primary key,
  pick_id uuid not null references public.graded_betting_activity(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_result text,
  result text not null,
  provider text not null,
  provider_stat_value numeric,
  reason text,
  revision text,
  created_at timestamptz not null default now()
);

create index if not exists settlement_audit_pick_idx
on public.pick_settlement_audit (pick_id, created_at desc);

alter table public.pick_settlement_audit enable row level security;
drop policy if exists "Users read own settlement audit" on public.pick_settlement_audit;
create policy "Users read own settlement audit"
on public.pick_settlement_audit for select using (auth.uid() = user_id);

create or replace function public.audit_provider_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'provider'
    and new.verification_status in ('verified', 'void')
    and (old.verification_status is distinct from new.verification_status
      or old.result is distinct from new.result
      or old.settlement_revision is distinct from new.settlement_revision)
  then
    insert into public.pick_settlement_audit (
      pick_id, user_id, previous_result, result, provider,
      provider_stat_value, reason, revision
    ) values (
      new.id, new.user_id, old.result, new.result,
      coalesce(new.settlement_provider, 'game-results'),
      new.provider_stat_value, new.settlement_reason, new.settlement_revision
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_provider_settlement_change on public.graded_betting_activity;
create trigger audit_provider_settlement_change
after update of result, verification_status, settlement_revision
on public.graded_betting_activity
for each row execute function public.audit_provider_settlement();

comment on table public.pick_settlement_audit is
'Append-only explanation of automatic provider settlements and official stat revisions.';
