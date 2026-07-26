alter table public.graded_betting_activity
  add column if not exists provider_event_id text,
  add column if not exists provider_sport_key text,
  add column if not exists market_key text,
  add column if not exists outcome_name text,
  add column if not exists line_point numeric(8,3),
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'void')),
  add column if not exists locked_at timestamptz;

create unique index if not exists graded_activity_provider_pick_unique
on public.graded_betting_activity
  (user_id, provider_event_id, market_key, outcome_name, sportsbook, placed_at)
where provider_event_id is not null;

create index if not exists graded_activity_pending_verification_idx
on public.graded_betting_activity (provider_sport_key, provider_event_id)
where verification_status = 'pending' and result = 'pending';

alter table public.graded_betting_activity
  drop constraint if exists provider_picks_require_identity;

alter table public.graded_betting_activity
  add constraint provider_picks_require_identity check (
    source <> 'provider' or (
      provider_event_id is not null
      and provider_sport_key is not null
      and market_key is not null
      and outcome_name is not null
      and locked_at is not null
    )
  );

comment on column public.graded_betting_activity.verification_status is
'Only provider-settled rows with verified status may change ratings or qualify for leaderboards.';

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
  insert into public.category_ratings (
    user_id, category, rating, graded_picks, wins, losses, pushes,
    roi_percent, closing_line_value, confidence_calibration, updated_at
  )
  select
    target_user,
    target_category,
    greatest(800, least(2400,
      1500
      + avg(
          (case when result = 'win' then 1 when result = 'push' then implied_probability else 0 end)
          - implied_probability
        ) * 600
      + greatest(-20, least(20, avg(clv))) * 3
      + greatest(-50, least(50, (sum(profit_units) / nullif(sum(stake_units), 0)) * 100)) * 2
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
      case when american_odds > 0
        then 100.0 / (american_odds + 100.0)
        else abs(american_odds)::numeric / (abs(american_odds) + 100.0)
      end as implied_probability,
      case
        when closing_odds is null then 0
        else (
          case when closing_odds > 0
            then 100.0 / (closing_odds + 100.0)
            else abs(closing_odds)::numeric / (abs(closing_odds) + 100.0)
          end
          - case when american_odds > 0
            then 100.0 / (american_odds + 100.0)
            else abs(american_odds)::numeric / (abs(american_odds) + 100.0)
          end
        ) * 100
      end as clv
    from public.graded_betting_activity
    where user_id = target_user
      and category = target_category
      and source = 'provider'
      and verification_status = 'verified'
      and result in ('win', 'loss', 'push')
  ) verified
  having count(*) > 0
  on conflict (user_id, category) do update set
    rating = excluded.rating,
    graded_picks = excluded.graded_picks,
    wins = excluded.wins,
    losses = excluded.losses,
    pushes = excluded.pushes,
    roi_percent = excluded.roi_percent,
    closing_line_value = excluded.closing_line_value,
    confidence_calibration = excluded.confidence_calibration,
    updated_at = excluded.updated_at;
  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_verified_rating_after_settlement on public.graded_betting_activity;
create trigger refresh_verified_rating_after_settlement
after insert or update of result, verification_status, closing_odds on public.graded_betting_activity
for each row execute function public.refresh_verified_category_rating();
