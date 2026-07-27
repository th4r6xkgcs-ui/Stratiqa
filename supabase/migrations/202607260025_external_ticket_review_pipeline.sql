alter table public.pick_evidence
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists provider_reference text;

create table if not exists public.ticket_review_audit (
  id bigint generated always as identity primary key,
  evidence_id uuid not null references public.pick_evidence(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('approved', 'rejected')),
  note text not null,
  provider_reference text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_review_audit enable row level security;
create policy "Users read own ticket review audit"
on public.ticket_review_audit for select to authenticated
using (auth.uid() = user_id);

create or replace function public.review_external_ticket(
  requested_evidence_id uuid,
  requested_reviewer_id uuid,
  requested_action text,
  requested_note text,
  requested_provider_reference text,
  requested_sport text default null,
  requested_category text default null,
  requested_event_name text default null,
  requested_selection text default null,
  requested_market text default null,
  requested_american_odds integer default null,
  requested_stake_units numeric default null,
  requested_result text default null,
  requested_placed_at timestamptz default null,
  requested_event_commence_at timestamptz default null,
  requested_provider_event_id text default null,
  requested_provider_sport_key text default null,
  requested_market_key text default null,
  requested_outcome_name text default null,
  requested_line_point numeric default null,
  requested_confidence numeric default 65,
  requested_real_stake numeric default null,
  requested_real_payout numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence public.pick_evidence%rowtype;
  created_pick_id uuid;
  calculated_profit numeric;
begin
  if requested_action not in ('approved', 'rejected')
    or nullif(trim(requested_note), '') is null
    or nullif(trim(requested_provider_reference), '') is null
  then raise exception 'Review action, note, and provider reference are required'; end if;

  select * into evidence from public.pick_evidence
  where id = requested_evidence_id and claim_type = 'external_ticket'
    and pick_id is null and verification_status = 'pending'
  for update;
  if not found then raise exception 'Pending external ticket not found'; end if;

  if requested_action = 'rejected' then
    update public.pick_evidence set
      verification_status = 'rejected', rating_eligible = false,
      rejection_reason = requested_note, reviewed_by = requested_reviewer_id,
      reviewed_at = now(), review_note = requested_note,
      provider_reference = requested_provider_reference
    where id = requested_evidence_id;
  else
    if nullif(trim(requested_sport), '') is null
      or requested_category not in ('player_prop','moneyline','spread','total','parlay')
      or nullif(trim(requested_event_name), '') is null
      or nullif(trim(requested_selection), '') is null
      or nullif(trim(requested_market), '') is null
      or requested_american_odds is null or requested_american_odds = 0
      or requested_stake_units is null or requested_stake_units <= 0 or requested_stake_units > 10
      or requested_result not in ('win','loss','push','void')
      or requested_placed_at is null
      or nullif(trim(requested_provider_event_id), '') is null
      or nullif(trim(requested_provider_sport_key), '') is null
      or nullif(trim(requested_market_key), '') is null
      or nullif(trim(requested_outcome_name), '') is null
    then raise exception 'Approved tickets require complete verified market and result data'; end if;

    calculated_profit := case requested_result
      when 'win' then requested_stake_units * case when requested_american_odds > 0 then requested_american_odds / 100.0 else 100.0 / abs(requested_american_odds) end
      when 'loss' then -requested_stake_units else 0 end;

    insert into public.graded_betting_activity (
      user_id, sport, category, event_name, selection, market, sportsbook,
      american_odds, stake_units, confidence, result, profit_units, source,
      verification_status, provider_event_id, provider_sport_key, market_key,
      outcome_name, line_point, attribution_type, pick_origin, certification_status,
      event_commence_at, locked_at, placed_at, graded_at,
      real_stake_amount, real_payout_amount, real_profit_amount, settlement_provider,
      settlement_reason
    ) values (
      evidence.user_id, trim(requested_sport), requested_category, trim(requested_event_name),
      trim(requested_selection), trim(requested_market), evidence.sportsbook,
      requested_american_odds, requested_stake_units, greatest(1, least(100, requested_confidence)),
      requested_result, calculated_profit, 'provider', 'verified',
      trim(requested_provider_event_id), trim(requested_provider_sport_key),
      trim(requested_market_key), trim(requested_outcome_name), requested_line_point,
      'judgment', 'personal', 'certified', requested_event_commence_at,
      requested_placed_at, requested_placed_at, now(),
      requested_real_stake, requested_real_payout,
      case when requested_real_stake is not null and requested_real_payout is not null then requested_real_payout - requested_real_stake else null end,
      'external-ticket-review', requested_note
    ) returning id into created_pick_id;

    update public.pick_evidence set
      pick_id = created_pick_id, verification_status = 'matched', rating_eligible = true,
      matched_at = now(), reviewed_by = requested_reviewer_id, reviewed_at = now(),
      review_note = requested_note, provider_reference = requested_provider_reference,
      rejection_reason = null
    where id = requested_evidence_id;
  end if;

  insert into public.ticket_review_audit (
    evidence_id, user_id, reviewer_id, action, note, provider_reference
  ) values (
    requested_evidence_id, evidence.user_id, requested_reviewer_id,
    requested_action, requested_note, requested_provider_reference
  );
  return created_pick_id;
end;
$$;

revoke all on function public.review_external_ticket(uuid,uuid,text,text,text,text,text,text,text,text,integer,numeric,text,timestamptz,timestamptz,text,text,text,text,numeric,numeric,numeric,numeric) from public, anon, authenticated;
grant execute on function public.review_external_ticket(uuid,uuid,text,text,text,text,text,text,text,text,integer,numeric,text,timestamptz,timestamptz,text,text,text,text,numeric,numeric,numeric,numeric) to service_role;

comment on function public.review_external_ticket is
'Atomically reviews an outside sportsbook ticket. Only service-role callers may create rating-eligible activity, and every decision is audited.';
