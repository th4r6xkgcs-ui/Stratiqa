-- V17.9.1: opt-in public model follows and privacy-safe performance pulse.
-- Followers see outcomes and rating movement only. Model factors, weights, notes,
-- recommendation history, and individual analyst pick details remain private.

create table if not exists public.model_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  model_id uuid not null references public.analyst_models(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, model_id)
);

create index if not exists model_follows_model_created_idx
on public.model_follows (model_id, created_at desc);

alter table public.model_follows enable row level security;

drop policy if exists "Users manage their model follows" on public.model_follows;
create policy "Users manage their model follows"
on public.model_follows for all to authenticated
using (auth.uid() = follower_id)
with check (auth.uid() = follower_id);

create or replace function public.prevent_self_model_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.analyst_models model where model.id = new.model_id and model.user_id = new.follower_id) then
    raise exception 'You cannot follow your own model';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_model_follow on public.model_follows;
create trigger prevent_self_model_follow
before insert on public.model_follows
for each row execute function public.prevent_self_model_follow();

drop function if exists public.get_public_model_leaderboard(uuid, text, text, text, text, text, integer);
create function public.get_public_model_leaderboard(
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
  is_current_user boolean, follower_count bigint, is_following boolean,
  rating_change numeric, weekly_results integer
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
    model.user_id = requested_user,
    coalesce(followers.count, 0), exists (
      select 1 from public.model_follows follow
      where follow.model_id = model.id and follow.follower_id = requested_user
    ),
    rating.rating - coalesce(previous.rating, rating.rating),
    coalesce(weekly_results.count, 0)
  from public.model_ratings rating
  join public.analyst_models model on model.id = rating.model_id
  join public.competitive_profiles profile on profile.user_id = model.user_id
  left join lateral (
    select history.rating from public.model_rating_history history
    where history.model_id = model.id and history.graded_picks < rating.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  left join lateral (
    select count(*)::bigint as count from public.model_follows follow where follow.model_id = model.id
  ) followers on true
  left join lateral (
    select count(*)::integer as count from public.graded_betting_activity activity
    where activity.model_id = model.id and activity.source = 'provider'
      and activity.verification_status = 'verified' and activity.result in ('win', 'loss', 'push')
      and activity.graded_at >= now() - interval '7 days'
  ) weekly_results on true
  where model.status = 'live'
    and profile.leaderboard_opt_in and profile.show_model_roster and profile.public_alias is not null
    and rating.graded_picks >= 10
    and (requested_sport is null or model.sport = requested_sport)
    and (requested_category is null or model.category = requested_category)
    and (requested_country is null or profile.country_code = requested_country)
    and (requested_region is null or profile.region_code = requested_region)
    and (requested_locality is null or profile.locality = requested_locality)
  order by rating.rating desc, rating.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

create or replace function public.get_public_model_pulse(requested_user uuid, result_limit integer default 8)
returns table (
  model_id uuid, model_name text, owner_alias text, owner_slug text, sport text,
  category text, rating numeric, rating_change numeric, weekly_results integer,
  weekly_wins integer, weekly_losses integer, follower_count bigint, is_following boolean
)
language sql
security definer
set search_path = public
as $$
  select model.id, model.name, profile.public_alias, profile.public_slug, model.sport,
    model.category, rating.rating, rating.rating - coalesce(previous.rating, rating.rating),
    coalesce(weekly.total, 0), coalesce(weekly.wins, 0), coalesce(weekly.losses, 0),
    coalesce(followers.count, 0), exists (
      select 1 from public.model_follows follow where follow.model_id = model.id and follow.follower_id = requested_user
    )
  from public.model_ratings rating
  join public.analyst_models model on model.id = rating.model_id
  join public.competitive_profiles profile on profile.user_id = model.user_id
  left join lateral (
    select history.rating from public.model_rating_history history
    where history.model_id = model.id and history.graded_picks < rating.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  left join lateral (
    select count(*)::integer as total, count(*) filter (where result = 'win')::integer as wins,
      count(*) filter (where result = 'loss')::integer as losses
    from public.graded_betting_activity activity
    where activity.model_id = model.id and activity.source = 'provider' and activity.verification_status = 'verified'
      and activity.result in ('win', 'loss', 'push') and activity.graded_at >= now() - interval '7 days'
  ) weekly on true
  left join lateral (
    select count(*)::bigint as count from public.model_follows follow where follow.model_id = model.id
  ) followers on true
  where model.status = 'live' and profile.leaderboard_opt_in and profile.show_model_roster
    and profile.public_alias is not null and rating.graded_picks >= 10
  order by weekly.total desc, abs(rating.rating - coalesce(previous.rating, rating.rating)) desc, rating.rating desc
  limit least(greatest(result_limit, 1), 20);
$$;

revoke all on function public.get_public_model_leaderboard(uuid, text, text, text, text, text, integer) from public, anon;
grant execute on function public.get_public_model_leaderboard(uuid, text, text, text, text, text, integer) to authenticated, service_role;
revoke all on function public.get_public_model_pulse(uuid, integer) from public, anon;
grant execute on function public.get_public_model_pulse(uuid, integer) to authenticated, service_role;

comment on table public.model_follows is 'Private subscriptions to eligible public model profiles. A follow never exposes private strategy or recommendations.';
comment on function public.get_public_model_pulse(uuid, integer) is 'Privacy-filtered weekly performance pulse for public live models. Returns aggregate outcomes and rating movement only.';
