create or replace function public.get_competitive_leaderboard_v2(
  requested_user uuid,
  requested_category text default null,
  requested_country text default null,
  requested_region text default null,
  requested_locality text default null,
  requested_season_start timestamptz default null,
  result_limit integer default 50
)
returns table (
  rank bigint, public_alias text, category text, rating numeric,
  previous_rating numeric, rating_change numeric, graded_picks integer,
  wins integer, losses integer, roi_percent numeric, win_rate numeric,
  country_code text, region_code text, locality text, is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with seasonal as (
    select activity.user_id, activity.category,
      greatest(800, least(2400,
        1500
        + avg((case when activity.result = 'win' then 1 when activity.result = 'push' then implied_probability else 0 end) - implied_probability) * 600
        + greatest(-1, least(2, avg(normalized_profit))) * 100
      )) as rating,
      count(*)::integer as graded_picks,
      count(*) filter (where activity.result = 'win')::integer as wins,
      count(*) filter (where activity.result = 'loss')::integer as losses,
      count(*) filter (where activity.result = 'push')::integer as pushes,
      (sum(activity.profit_units) / nullif(sum(activity.stake_units), 0)) * 100 as roi_percent
    from (
      select source.*,
        case when american_odds > 0 then 100.0 / (american_odds + 100.0)
          else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
        case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end
          when result = 'loss' then -1 else 0 end as normalized_profit
      from public.graded_betting_activity source
      where requested_season_start is not null
        and source.source = 'provider'
        and source.verification_status = 'verified'
        and source.result in ('win', 'loss', 'push')
        and source.graded_at >= requested_season_start
    ) activity
    group by activity.user_id, activity.category
  ),
  scored as (
    select ratings.user_id, ratings.category, ratings.rating, ratings.graded_picks,
      ratings.wins, ratings.losses, ratings.pushes, ratings.roi_percent
    from public.category_ratings ratings where requested_season_start is null
    union all
    select seasonal.user_id, seasonal.category, seasonal.rating, seasonal.graded_picks,
      seasonal.wins, seasonal.losses, seasonal.pushes, seasonal.roi_percent
    from seasonal where requested_season_start is not null
  ),
  eligible as (
    select scored.*, profile.public_alias, profile.country_code, profile.region_code, profile.locality
    from scored
    join public.competitive_profiles profile on profile.user_id = scored.user_id
    where profile.leaderboard_opt_in and profile.public_alias is not null
      and scored.graded_picks >= case when requested_season_start is null then 25 else 10 end
      and (requested_category is null or scored.category = requested_category)
      and (requested_country is null or profile.country_code = requested_country)
      and (requested_region is null or profile.region_code = requested_region)
      and (requested_locality is null or profile.locality = requested_locality)
  )
  select row_number() over (order by eligible.rating desc, eligible.graded_picks desc),
    eligible.public_alias, eligible.category, eligible.rating,
    coalesce(previous.rating, eligible.rating),
    case when requested_season_start is null then eligible.rating - coalesce(previous.rating, eligible.rating) else 0 end,
    eligible.graded_picks, eligible.wins, eligible.losses, eligible.roi_percent,
    case when eligible.wins + eligible.losses > 0
      then eligible.wins::numeric / (eligible.wins + eligible.losses) * 100 else 0 end,
    eligible.country_code, eligible.region_code, eligible.locality,
    eligible.user_id = requested_user
  from eligible
  left join lateral (
    select history.rating from public.category_rating_history history
    where requested_season_start is null
      and history.user_id = eligible.user_id and history.category = eligible.category
      and history.graded_picks < eligible.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  order by eligible.rating desc, eligible.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.get_competitive_leaderboard_v2(uuid, text, text, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.get_competitive_leaderboard_v2(uuid, text, text, text, text, timestamptz, integer) to service_role;

comment on function public.get_competitive_leaderboard_v2 is
'User-aware lifetime and seasonal rankings. Only opted-in aliases are returned; lifetime ratings are never reset.';
