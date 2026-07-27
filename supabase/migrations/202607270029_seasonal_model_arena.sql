create or replace function public.get_model_arena_v2(
  requested_user uuid,
  requested_sport text default null,
  requested_category text default null,
  requested_season_start timestamptz default null,
  result_limit integer default 50
)
returns table (
  rank bigint, model_id uuid, model_name text, owner_alias text,
  sport text, category text, rating numeric, rating_change numeric,
  graded_picks integer, wins integer, losses integer, pushes integer,
  roi_percent numeric, version integer, is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with seasonal as (
    select activity.model_id,
      greatest(800, least(2400,
        1500
        + avg((case when activity.result = 'win' then 1 when activity.result = 'push' then implied_probability else 0 end) - implied_probability) * 650
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
        and source.model_id is not null
        and source.source = 'provider'
        and source.verification_status = 'verified'
        and source.result in ('win', 'loss', 'push')
        and source.graded_at >= requested_season_start
    ) activity
    group by activity.model_id
  ),
  scored as (
    select ratings.model_id, ratings.rating, ratings.graded_picks,
      ratings.wins, ratings.losses, ratings.pushes, ratings.roi_percent
    from public.model_ratings ratings where requested_season_start is null
    union all
    select seasonal.model_id, seasonal.rating, seasonal.graded_picks,
      seasonal.wins, seasonal.losses, seasonal.pushes, seasonal.roi_percent
    from seasonal where requested_season_start is not null
  ),
  eligible as (
    select scored.*, model.name, model.sport, model.category, model.version, model.user_id,
      coalesce(profile.public_alias, 'Anonymous Analyst') as owner_alias
    from scored
    join public.analyst_models model on model.id = scored.model_id
    join public.competitive_profiles profile on profile.user_id = model.user_id
    where profile.leaderboard_opt_in
      and model.status = 'live'
      and scored.graded_picks >= 10
      and (requested_sport is null or model.sport = requested_sport)
      and (requested_category is null or model.category = requested_category)
  )
  select row_number() over (order by eligible.rating desc, eligible.graded_picks desc),
    eligible.model_id, eligible.name, eligible.owner_alias, eligible.sport, eligible.category,
    eligible.rating,
    case when requested_season_start is null then eligible.rating - coalesce(previous.rating, eligible.rating) else 0 end,
    eligible.graded_picks, eligible.wins, eligible.losses, eligible.pushes,
    eligible.roi_percent, eligible.version, eligible.user_id = requested_user
  from eligible
  left join lateral (
    select history.rating from public.model_rating_history history
    where requested_season_start is null
      and history.model_id = eligible.model_id
      and history.graded_picks < eligible.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  order by eligible.rating desc, eligible.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

revoke all on function public.get_model_arena_v2(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.get_model_arena_v2(uuid, text, text, timestamptz, integer) to service_role;

comment on function public.get_model_arena_v2 is
'User-aware lifetime and quarterly model competition. Seasonal scoring never resets lifetime model ratings.';
