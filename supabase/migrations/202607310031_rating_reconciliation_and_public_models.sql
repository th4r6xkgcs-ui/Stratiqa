-- V17.9: restore the intended rating rule and reconcile any rows skipped by older rules.
-- Every immutable provider pick settled automatically counts. Sportsbook evidence controls
-- real-money reporting only; it never gates STRATIQA competitive ratings.

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
    select activity.*,
      case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
      case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit,
      case when closing_odds is null then 0 else (
        case when closing_odds > 0 then 100.0 / (closing_odds + 100.0) else abs(closing_odds)::numeric / (abs(closing_odds) + 100.0) end
        - case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end
      ) * 100 end as clv
    from public.graded_betting_activity activity
    where activity.user_id = target_user
      and activity.category = target_category
      and activity.source = 'provider'
      and activity.verification_status = 'verified'
      and activity.result in ('win', 'loss', 'push')
  ) settled
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
after insert or update of result, verification_status, certification_status, closing_odds
on public.graded_betting_activity
for each row execute function public.refresh_verified_category_rating();

create or replace function public.reconcile_verified_category_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare row_data record;
begin
  for row_data in
    select distinct user_id, category
    from public.graded_betting_activity
    where source = 'provider' and verification_status = 'verified'
      and result in ('win', 'loss', 'push')
  loop
    insert into public.category_ratings (
      user_id, category, rating, graded_picks, wins, losses, pushes,
      roi_percent, closing_line_value, confidence_calibration, updated_at
    )
    select row_data.user_id, row_data.category,
      greatest(800, least(2400,
        1500
        + avg((case when result = 'win' then 1 when result = 'push' then implied_probability else 0 end) - implied_probability) * 600
        + greatest(-20, least(20, avg(clv))) * 3
        + greatest(-1, least(2, avg(normalized_profit))) * 100
      )),
      count(*)::integer, count(*) filter (where result = 'win')::integer,
      count(*) filter (where result = 'loss')::integer, count(*) filter (where result = 'push')::integer,
      (sum(profit_units) / nullif(sum(stake_units), 0)) * 100, avg(clv),
      100 - avg(abs(confidence - case when result = 'win' then 100 when result = 'loss' then 0 else confidence end)), now()
    from (
      select activity.*,
        case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
        case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit,
        case when closing_odds is null then 0 else (case when closing_odds > 0 then 100.0 / (closing_odds + 100.0) else abs(closing_odds)::numeric / (abs(closing_odds) + 100.0) end - case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end) * 100 end as clv
      from public.graded_betting_activity activity
      where activity.user_id = row_data.user_id and activity.category = row_data.category
        and activity.source = 'provider' and activity.verification_status = 'verified'
        and activity.result in ('win', 'loss', 'push')
    ) settled
    on conflict (user_id, category) do update set
      rating = excluded.rating, graded_picks = excluded.graded_picks, wins = excluded.wins,
      losses = excluded.losses, pushes = excluded.pushes, roi_percent = excluded.roi_percent,
      closing_line_value = excluded.closing_line_value, confidence_calibration = excluded.confidence_calibration,
      updated_at = excluded.updated_at;
  end loop;
end;
$$;

select public.reconcile_verified_category_ratings();

comment on function public.reconcile_verified_category_ratings is
'Repairs category ratings from every immutable automatically verified provider pick; real-money certification is intentionally excluded.';

create or replace function public.get_public_model_leaderboard(
  requested_user uuid,
  requested_sport text default null,
  requested_category text default null,
  requested_country text default null,
  requested_region text default null,
  requested_locality text default null,
  result_limit integer default 50
)
returns table (
  rank bigint, model_id uuid, model_name text, owner_alias text, owner_slug text,
  sport text, category text, rating numeric, graded_picks integer, wins integer,
  losses integer, roi_percent numeric, version integer, sample_status text,
  is_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  select row_number() over (order by rating.rating desc, rating.graded_picks desc),
    model.id, model.name, profile.public_alias, profile.public_slug,
    model.sport, model.category, rating.rating, rating.graded_picks, rating.wins,
    rating.losses, rating.roi_percent, model.version,
    case when rating.graded_picks >= 50 then 'Established' else 'Ranked' end,
    model.user_id = requested_user
  from public.model_ratings rating
  join public.analyst_models model on model.id = rating.model_id
  join public.competitive_profiles profile on profile.user_id = model.user_id
  where model.status = 'live'
    and profile.leaderboard_opt_in
    and profile.show_model_roster
    and profile.public_alias is not null
    and rating.graded_picks >= 10
    and (requested_sport is null or model.sport = requested_sport)
    and (requested_category is null or model.category = requested_category)
    and (requested_country is null or profile.country_code = requested_country)
    and (requested_region is null or profile.region_code = requested_region)
    and (requested_locality is null or profile.locality = requested_locality)
  order by rating.rating desc, rating.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.get_public_model_leaderboard(uuid, text, text, text, text, text, integer) from public, anon;
grant execute on function public.get_public_model_leaderboard(uuid, text, text, text, text, text, integer) to authenticated, service_role;

comment on function public.get_public_model_leaderboard is
'Privacy-filtered public model reputation board. Returns ratings and samples, never factors, weights, notes, or private recommendation history.';
