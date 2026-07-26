alter table public.competitive_profiles
  add column if not exists public_slug text,
  add column if not exists show_recent_picks boolean not null default true,
  add column if not exists show_model_roster boolean not null default true,
  add column if not exists show_real_money_stats boolean not null default false;

update public.competitive_profiles
set public_slug = lower(regexp_replace(coalesce(public_alias, 'analyst'), '[^a-zA-Z0-9]+', '-', 'g'))
  || '-' || left(user_id::text, 6)
where public_slug is null;

create unique index if not exists competitive_profiles_public_slug_key
on public.competitive_profiles (public_slug)
where public_slug is not null;

create or replace function public.ensure_competitive_public_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_slug is null then
    new.public_slug := lower(regexp_replace(coalesce(new.public_alias, 'analyst'), '[^a-zA-Z0-9]+', '-', 'g'))
      || '-' || left(new.user_id::text, 6);
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_competitive_public_slug on public.competitive_profiles;
create trigger ensure_competitive_public_slug
before insert or update on public.competitive_profiles
for each row execute function public.ensure_competitive_public_slug();

drop function if exists public.get_certified_leaderboard(text, text, text, text, integer);
create function public.get_certified_leaderboard(
  requested_category text default null,
  requested_country text default null,
  requested_region text default null,
  requested_locality text default null,
  result_limit integer default 50
)
returns table (
  rank bigint, public_alias text, public_slug text, category text, rating numeric,
  previous_rating numeric, rating_change numeric, graded_picks integer,
  wins integer, losses integer, roi_percent numeric, win_rate numeric,
  country_code text, region_code text, locality text, is_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select ratings.*, profile.public_alias, profile.public_slug,
      profile.country_code, profile.region_code, profile.locality
    from public.category_ratings ratings
    join public.competitive_profiles profile on profile.user_id = ratings.user_id
    where profile.leaderboard_opt_in and profile.public_alias is not null
      and ratings.graded_picks >= 25
      and (requested_category is null or ratings.category = requested_category)
      and (requested_country is null or profile.country_code = requested_country)
      and (requested_region is null or profile.region_code = requested_region)
      and (requested_locality is null or profile.locality = requested_locality)
  )
  select row_number() over (order by eligible.rating desc, eligible.graded_picks desc),
    eligible.public_alias, eligible.public_slug, eligible.category, eligible.rating,
    coalesce(previous.rating, eligible.rating),
    eligible.rating - coalesce(previous.rating, eligible.rating),
    eligible.graded_picks, eligible.wins, eligible.losses, eligible.roi_percent,
    case when eligible.wins + eligible.losses > 0
      then eligible.wins::numeric / (eligible.wins + eligible.losses) * 100 else 0 end,
    eligible.country_code, eligible.region_code, eligible.locality,
    eligible.user_id = auth.uid()
  from eligible
  left join lateral (
    select history.rating from public.category_rating_history history
    where history.user_id = eligible.user_id
      and history.category = eligible.category
      and history.graded_picks < eligible.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  order by eligible.rating desc, eligible.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

grant execute on function public.get_certified_leaderboard(text, text, text, text, integer) to authenticated;

create or replace function public.get_public_analyst_profile(requested_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.competitive_profiles%rowtype;
  payload jsonb;
begin
  select * into target_profile from public.competitive_profiles
  where public_slug = requested_slug and leaderboard_opt_in
  limit 1;
  if target_profile.user_id is null then return null; end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'alias', target_profile.public_alias,
      'slug', target_profile.public_slug,
      'country', target_profile.country_code,
      'region', target_profile.region_code,
      'locality', target_profile.locality
    ),
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', rating.category, 'rating', rating.rating,
        'gradedPicks', rating.graded_picks, 'wins', rating.wins,
        'losses', rating.losses, 'pushes', rating.pushes,
        'roi', rating.roi_percent, 'clv', rating.closing_line_value
      ) order by rating.rating desc)
      from public.category_ratings rating where rating.user_id = target_profile.user_id
    ), '[]'::jsonb),
    'models', case when target_profile.show_model_roster then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', model.id, 'name', model.name, 'sport', model.sport,
        'category', model.category, 'version', model.version,
        'rating', coalesce(rating.rating, 1500),
        'gradedPicks', coalesce(rating.graded_picks, 0)
      ) order by coalesce(rating.rating, 1500) desc)
      from public.analyst_models model
      left join public.model_ratings rating on rating.model_id = model.id
      where model.user_id = target_profile.user_id and model.status = 'live'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'recentPicks', case when target_profile.show_recent_picks then coalesce((
      select jsonb_agg(row_data order by graded_at desc)
      from (
        select jsonb_build_object(
          'selection', activity.selection, 'eventName', activity.event_name,
          'sport', activity.sport, 'category', activity.category,
          'result', activity.result, 'profitUnits', activity.profit_units,
          'gradedAt', activity.graded_at
        ) as row_data, activity.graded_at
        from public.graded_betting_activity activity
        where activity.user_id = target_profile.user_id
          and activity.source = 'provider'
          and activity.verification_status = 'verified'
          and activity.result in ('win', 'loss', 'push')
        order by activity.graded_at desc limit 8
      ) recent
    ), '[]'::jsonb) else '[]'::jsonb end,
    'realMoney', case when target_profile.show_real_money_stats then (
      select jsonb_build_object(
        'confirmedBets', count(*),
        'profit', coalesce(sum(activity.real_profit_amount), 0),
        'stake', coalesce(sum(activity.real_stake_amount), 0)
      )
      from public.graded_betting_activity activity
      where activity.user_id = target_profile.user_id
        and activity.certification_status = 'certified'
        and activity.real_stake_amount is not null
    ) else null end
  ) into payload;
  return payload;
end;
$$;

grant execute on function public.get_public_analyst_profile(text) to authenticated;

comment on function public.get_public_analyst_profile is
'Privacy-filtered public analyst identity. Never returns private picks, exact addresses, or hidden money statistics.';
