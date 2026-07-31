-- V18.0: seasonal championships without resetting permanent competitive ratings.

create table if not exists public.season_championships (
  id bigint generated always as identity primary key,
  season_key text not null,
  scope text not null check (scope in ('global', 'regional')),
  scope_label text not null,
  category text not null,
  champion_user_id uuid not null references auth.users(id) on delete cascade,
  champion_alias text not null,
  rating numeric not null,
  graded_picks integer not null,
  wins integer not null,
  losses integer not null,
  roi_percent numeric,
  finalized_at timestamptz not null default now(),
  unique (season_key, scope, scope_label, category)
);

create index if not exists season_championships_board_idx
on public.season_championships (season_key desc, scope, category);

alter table public.season_championships enable row level security;
drop policy if exists "Authenticated users read public season championships" on public.season_championships;
create policy "Authenticated users read public season championships"
on public.season_championships for select to authenticated using (true);

create or replace function public.get_season_championship_race(
  requested_user uuid,
  requested_season_start timestamptz,
  result_limit integer default 6
)
returns table (
  scope text, scope_label text, category text, rank bigint, public_alias text,
  public_slug text, rating numeric, graded_picks integer, wins integer, losses integer,
  roi_percent numeric, is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select region_code from public.competitive_profiles where user_id = requested_user
  ), seasonal as (
    select activity.user_id, activity.category,
      greatest(800, least(2400,
        1500 + avg((case when activity.result = 'win' then 1 when activity.result = 'push' then implied_probability else 0 end) - implied_probability) * 600
        + greatest(-1, least(2, avg(normalized_profit))) * 100
      )) as rating,
      count(*)::integer as graded_picks,
      count(*) filter (where activity.result = 'win')::integer as wins,
      count(*) filter (where activity.result = 'loss')::integer as losses,
      (sum(activity.profit_units) / nullif(sum(activity.stake_units), 0)) * 100 as roi_percent
    from (
      select source.*,
        case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
        case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit
      from public.graded_betting_activity source
      where source.source = 'provider' and source.verification_status = 'verified'
        and source.result in ('win', 'loss', 'push') and source.graded_at >= requested_season_start
    ) activity
    group by activity.user_id, activity.category
  ), eligible as (
    select seasonal.*, profile.public_alias, profile.public_slug, profile.region_code
    from seasonal join public.competitive_profiles profile on profile.user_id = seasonal.user_id
    where profile.leaderboard_opt_in and profile.public_alias is not null and seasonal.graded_picks >= 10
  ), global_race as (
    select 'global'::text as scope, 'Global'::text as scope_label, eligible.*,
      row_number() over (partition by category order by rating desc, graded_picks desc) as position
    from eligible
  ), regional_race as (
    select 'regional'::text as scope, concat('Region: ', viewer.region_code)::text as scope_label, eligible.*,
      row_number() over (partition by eligible.category order by eligible.rating desc, eligible.graded_picks desc) as position
    from eligible cross join viewer
    where viewer.region_code is not null and eligible.region_code = viewer.region_code
  )
  select scope, scope_label, category, position, public_alias, public_slug, rating, graded_picks,
    wins, losses, roi_percent, user_id = requested_user
  from (select * from global_race union all select * from regional_race) races
  where position <= least(greatest(result_limit, 1), 20)
  order by scope, category, position;
$$;

create or replace function public.capture_season_championships(
  target_season_key text,
  target_season_start timestamptz,
  target_season_end timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare inserted_count integer;
begin
  if target_season_end > now() then raise exception 'Championships can only be finalized after a season ends'; end if;
  insert into public.season_championships (season_key, scope, scope_label, category, champion_user_id, champion_alias, rating, graded_picks, wins, losses, roi_percent)
  select target_season_key, 'global', 'Global', race.category, race.user_id, race.public_alias, race.rating, race.graded_picks, race.wins, race.losses, race.roi_percent
  from (
    select activity.user_id, activity.category, profile.public_alias,
      greatest(800, least(2400, 1500 + avg((case when activity.result = 'win' then 1 when activity.result = 'push' then implied_probability else 0 end) - implied_probability) * 600 + greatest(-1, least(2, avg(normalized_profit))) * 100)) as rating,
      count(*)::integer as graded_picks, count(*) filter (where activity.result = 'win')::integer as wins,
      count(*) filter (where activity.result = 'loss')::integer as losses, (sum(activity.profit_units) / nullif(sum(activity.stake_units), 0)) * 100 as roi_percent,
      row_number() over (partition by activity.category order by greatest(800, least(2400, 1500 + avg((case when activity.result = 'win' then 1 when activity.result = 'push' then implied_probability else 0 end) - implied_probability) * 600 + greatest(-1, least(2, avg(normalized_profit))) * 100)) desc, count(*) desc) as position
    from (select source.*, case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability, case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit from public.graded_betting_activity source where source.source = 'provider' and source.verification_status = 'verified' and source.result in ('win', 'loss', 'push') and source.graded_at >= target_season_start and source.graded_at < target_season_end) activity
    join public.competitive_profiles profile on profile.user_id = activity.user_id
    where profile.leaderboard_opt_in and profile.public_alias is not null
    group by activity.user_id, activity.category, profile.public_alias
    having count(*) >= 10
  ) race where race.position = 1
  on conflict (season_key, scope, scope_label, category) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.get_season_championship_race(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.get_season_championship_race(uuid, timestamptz, integer) to service_role;
revoke all on function public.capture_season_championships(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.capture_season_championships(text, timestamptz, timestamptz) to service_role;

comment on table public.season_championships is 'Permanent public records for finalized seasonal titles. Lifetime and season ratings remain separate.';
