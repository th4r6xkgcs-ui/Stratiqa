create or replace function public.get_user_competitive_snapshot(requested_user uuid)
returns table (
  category text,
  rating numeric,
  graded_picks integer,
  global_rank bigint,
  country_rank bigint,
  region_rank bigint,
  local_rank bigint,
  eligible_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select ratings.user_id, ratings.category, ratings.rating, ratings.graded_picks,
      profile.country_code, profile.region_code, profile.locality, profile.leaderboard_opt_in
    from public.category_ratings ratings
    join public.competitive_profiles profile on profile.user_id = ratings.user_id
    where ratings.user_id = requested_user
  ),
  eligible as (
    select ratings.user_id, ratings.category, ratings.rating, ratings.graded_picks,
      profile.country_code, profile.region_code, profile.locality
    from public.category_ratings ratings
    join public.competitive_profiles profile on profile.user_id = ratings.user_id
    where profile.leaderboard_opt_in
      and profile.public_alias is not null
      and ratings.graded_picks >= 25
  )
  select target.category, target.rating, target.graded_picks,
    case when target.leaderboard_opt_in and target.graded_picks >= 25 then
      1 + count(*) filter (where eligible.rating > target.rating or (eligible.rating = target.rating and eligible.graded_picks > target.graded_picks))
    end as global_rank,
    case when target.leaderboard_opt_in and target.graded_picks >= 25 and target.country_code is not null then
      1 + count(*) filter (where eligible.country_code = target.country_code and (eligible.rating > target.rating or (eligible.rating = target.rating and eligible.graded_picks > target.graded_picks)))
    end as country_rank,
    case when target.leaderboard_opt_in and target.graded_picks >= 25 and target.region_code is not null then
      1 + count(*) filter (where eligible.country_code = target.country_code and eligible.region_code = target.region_code and (eligible.rating > target.rating or (eligible.rating = target.rating and eligible.graded_picks > target.graded_picks)))
    end as region_rank,
    case when target.leaderboard_opt_in and target.graded_picks >= 25 and target.locality is not null then
      1 + count(*) filter (where eligible.country_code = target.country_code and eligible.region_code = target.region_code and eligible.locality = target.locality and (eligible.rating > target.rating or (eligible.rating = target.rating and eligible.graded_picks > target.graded_picks)))
    end as local_rank,
    count(eligible.user_id) as eligible_count
  from target
  left join eligible on eligible.category = target.category
  group by target.user_id, target.category, target.rating, target.graded_picks,
    target.country_code, target.region_code, target.locality, target.leaderboard_opt_in
  order by target.rating desc;
$$;

revoke all on function public.get_user_competitive_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_user_competitive_snapshot(uuid) to service_role;

comment on function public.get_user_competitive_snapshot is
'Returns only the requesting analyst category placements across global and saved geographic scopes.';
