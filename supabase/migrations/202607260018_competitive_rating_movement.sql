create table if not exists public.category_rating_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  rating numeric not null,
  graded_picks integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists category_rating_history_lookup
on public.category_rating_history (user_id, category, recorded_at desc);

alter table public.category_rating_history enable row level security;

drop policy if exists "Users can read their rating history" on public.category_rating_history;
create policy "Users can read their rating history"
on public.category_rating_history for select to authenticated
using (auth.uid() = user_id);

create or replace function public.capture_category_rating_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.rating is distinct from old.rating
     or new.graded_picks is distinct from old.graded_picks then
    insert into public.category_rating_history (user_id, category, rating, graded_picks, recorded_at)
    values (new.user_id, new.category, new.rating, new.graded_picks, coalesce(new.updated_at, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists capture_category_rating_movement on public.category_ratings;
create trigger capture_category_rating_movement
after insert or update of rating, graded_picks on public.category_ratings
for each row execute function public.capture_category_rating_movement();

insert into public.category_rating_history (user_id, category, rating, graded_picks, recorded_at)
select ratings.user_id, ratings.category, ratings.rating, ratings.graded_picks, ratings.updated_at
from public.category_ratings ratings
where not exists (
  select 1 from public.category_rating_history history
  where history.user_id = ratings.user_id and history.category = ratings.category
);

drop function if exists public.get_certified_leaderboard(text, text, text, text, integer);
create function public.get_certified_leaderboard(
  requested_category text default null,
  requested_country text default null,
  requested_region text default null,
  requested_locality text default null,
  result_limit integer default 50
)
returns table (
  rank bigint, public_alias text, category text, rating numeric,
  previous_rating numeric, rating_change numeric, graded_picks integer,
  wins integer, losses integer, roi_percent numeric, win_rate numeric,
  country_code text, region_code text, locality text, is_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select ratings.*, profile.public_alias, profile.country_code, profile.region_code, profile.locality
    from public.category_ratings ratings
    join public.competitive_profiles profile on profile.user_id = ratings.user_id
    where profile.leaderboard_opt_in
      and profile.public_alias is not null
      and ratings.graded_picks >= 25
      and (requested_category is null or ratings.category = requested_category)
      and (requested_country is null or profile.country_code = requested_country)
      and (requested_region is null or profile.region_code = requested_region)
      and (requested_locality is null or profile.locality = requested_locality)
  )
  select row_number() over (order by eligible.rating desc, eligible.graded_picks desc),
    eligible.public_alias, eligible.category, eligible.rating,
    coalesce(previous.rating, eligible.rating),
    eligible.rating - coalesce(previous.rating, eligible.rating),
    eligible.graded_picks, eligible.wins, eligible.losses, eligible.roi_percent,
    case when eligible.wins + eligible.losses > 0
      then eligible.wins::numeric / (eligible.wins + eligible.losses) * 100
      else 0 end,
    eligible.country_code, eligible.region_code, eligible.locality,
    eligible.user_id = auth.uid()
  from eligible
  left join lateral (
    select history.rating
    from public.category_rating_history history
    where history.user_id = eligible.user_id
      and history.category = eligible.category
      and history.graded_picks < eligible.graded_picks
    order by history.recorded_at desc
    limit 1
  ) previous on true
  order by eligible.rating desc, eligible.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

grant execute on function public.get_certified_leaderboard(text, text, text, text, integer) to authenticated;

comment on table public.category_rating_history is
'Automatic rating snapshots used to show transparent competitive movement.';
