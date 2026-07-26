alter table public.graded_betting_activity
  add column if not exists event_commence_at timestamptz,
  add column if not exists coach_recommendation_id text,
  add column if not exists certification_status text not null default 'tracked'
    check (certification_status in ('tracked', 'evidence_pending', 'certified', 'rejected')),
  add column if not exists certification_at timestamptz;

alter table public.pick_evidence
  add column if not exists pick_id uuid references public.graded_betting_activity(id) on delete cascade,
  add column if not exists matched_at timestamptz,
  add column if not exists rejection_reason text;

create unique index if not exists one_matched_evidence_per_pick
on public.pick_evidence (pick_id)
where verification_status = 'matched';
create index if not exists evidence_pending_pick_idx
on public.pick_evidence (pick_id, verification_status);

alter table public.competitive_profiles
  add column if not exists country_code text,
  add column if not exists locality text;

alter table public.graded_betting_activity
  drop constraint if exists stratiqa_picks_require_coach_identity,
  drop constraint if exists model_attribution_requires_identity;
update public.graded_betting_activity set pick_origin = 'personal';
alter table public.graded_betting_activity
  add constraint model_attribution_requires_identity check (
    attribution_type <> 'model'
    or (model_id is not null and nullif(trim(model_name), '') is not null)
  );

update public.graded_betting_activity
set certification_status = 'tracked', certification_at = null;
delete from public.category_ratings;

create or replace function public.sync_pick_certification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pick_id is null then return new; end if;
  if new.verification_status = 'matched' and new.rating_eligible then
    update public.graded_betting_activity
    set certification_status = 'certified', certification_at = coalesce(new.matched_at, now())
    where id = new.pick_id and user_id = new.user_id;
  elsif new.verification_status in ('rejected', 'duplicate') then
    update public.graded_betting_activity
    set certification_status = 'rejected', certification_at = null
    where id = new.pick_id and user_id = new.user_id;
  else
    update public.graded_betting_activity
    set certification_status = 'evidence_pending', certification_at = null
    where id = new.pick_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_certification_from_evidence on public.pick_evidence;
create trigger sync_certification_from_evidence
after insert or update of verification_status, rating_eligible on public.pick_evidence
for each row execute function public.sync_pick_certification();

create or replace function public.refresh_verified_category_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := coalesce(new.user_id, old.user_id);
  target_category text := coalesce(new.category, old.category);
begin
  delete from public.category_ratings where user_id = target_user and category = target_category;
  insert into public.category_ratings (
    user_id, category, rating, graded_picks, wins, losses, pushes,
    roi_percent, closing_line_value, confidence_calibration, updated_at
  )
  select target_user, target_category,
    greatest(800, least(2400,
      1500
      + avg((case when result = 'win' then 1 when result = 'push' then implied_probability else 0 end) - implied_probability) * 600
      + greatest(-20, least(20, avg(clv))) * 3
      + greatest(-1, least(2, avg(normalized_profit))) * 100
    )),
    count(*)::integer,
    count(*) filter (where result = 'win')::integer,
    count(*) filter (where result = 'loss')::integer,
    count(*) filter (where result = 'push')::integer,
    (sum(profit_units) / nullif(sum(stake_units), 0)) * 100,
    avg(clv),
    100 - avg(abs(confidence - case when result = 'win' then 100 when result = 'loss' then 0 else confidence end)),
    now()
  from (
    select *,
      case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
      case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit,
      case when closing_odds is null then 0 else (
        case when closing_odds > 0 then 100.0 / (closing_odds + 100.0) else abs(closing_odds)::numeric / (abs(closing_odds) + 100.0) end
        - case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end
      ) * 100 end as clv
    from public.graded_betting_activity
    where user_id = target_user and category = target_category
      and source = 'provider' and verification_status = 'verified'
      and certification_status = 'certified'
      and result in ('win', 'loss', 'push')
  ) certified
  having count(*) > 0;
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_verified_rating_after_settlement on public.graded_betting_activity;
create trigger refresh_verified_rating_after_settlement
after insert or update of result, verification_status, certification_status, closing_odds
on public.graded_betting_activity
for each row execute function public.refresh_verified_category_rating();

create or replace function public.get_certified_leaderboard(
  requested_category text default null,
  requested_country text default null,
  requested_region text default null,
  requested_locality text default null,
  result_limit integer default 50
)
returns table (
  rank bigint, public_alias text, category text, rating numeric,
  graded_picks integer, wins integer, losses integer,
  country_code text, region_code text, locality text
)
language sql
security definer
set search_path = public
as $$
  select row_number() over (order by ratings.rating desc, ratings.graded_picks desc),
    profile.public_alias, ratings.category, ratings.rating, ratings.graded_picks,
    ratings.wins, ratings.losses, profile.country_code, profile.region_code, profile.locality
  from public.category_ratings ratings
  join public.competitive_profiles profile on profile.user_id = ratings.user_id
  where profile.leaderboard_opt_in
    and profile.public_alias is not null
    and ratings.graded_picks >= 25
    and (requested_category is null or ratings.category = requested_category)
    and (requested_country is null or profile.country_code = requested_country)
    and (requested_region is null or profile.region_code = requested_region)
    and (requested_locality is null or profile.locality = requested_locality)
  order by ratings.rating desc, ratings.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

grant execute on function public.get_certified_leaderboard(text, text, text, text, integer) to authenticated;

comment on column public.graded_betting_activity.certification_status is
'Competitive eligibility. Only independently matched sportsbook placement evidence becomes certified.';
comment on function public.get_certified_leaderboard is
'Privacy-safe opted-in rankings. Precise addresses are never stored or returned.';
