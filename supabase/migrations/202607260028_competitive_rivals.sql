create table if not exists public.competitive_rivals (
  user_id uuid not null references auth.users(id) on delete cascade,
  rival_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, rival_user_id),
  check (user_id <> rival_user_id)
);

alter table public.competitive_rivals enable row level security;

drop policy if exists "Users manage their own rivals" on public.competitive_rivals;
create policy "Users manage their own rivals"
on public.competitive_rivals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.get_competitive_rivals(requested_user uuid)
returns table (
  public_alias text,
  public_slug text,
  country_code text,
  region_code text,
  locality text,
  category text,
  rival_rating numeric,
  rival_graded_picks integer,
  user_rating numeric,
  rating_gap numeric,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select profile.public_alias, profile.public_slug, profile.country_code, profile.region_code, profile.locality,
    rival_rating.category, rival_rating.rating, rival_rating.graded_picks,
    coalesce(user_rating.rating, 1500),
    rival_rating.rating - coalesce(user_rating.rating, 1500),
    relationship.created_at
  from public.competitive_rivals relationship
  join public.competitive_profiles profile on profile.user_id = relationship.rival_user_id
  join public.category_ratings rival_rating on rival_rating.user_id = relationship.rival_user_id
  left join public.category_ratings user_rating
    on user_rating.user_id = relationship.user_id and user_rating.category = rival_rating.category
  where relationship.user_id = requested_user
    and profile.leaderboard_opt_in
    and profile.public_alias is not null
    and profile.public_slug is not null
  order by relationship.created_at desc, rival_rating.rating desc;
$$;

revoke all on function public.get_competitive_rivals(uuid) from public, anon, authenticated;
grant execute on function public.get_competitive_rivals(uuid) to service_role;

comment on table public.competitive_rivals is
'Private analyst-selected competitive watchlist. A rival relationship does not expose either user beyond existing public profile settings.';
