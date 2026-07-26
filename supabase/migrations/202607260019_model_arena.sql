create table if not exists public.model_ratings (
  model_id uuid primary key references public.analyst_models(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  category text not null,
  rating numeric not null default 1500,
  graded_picks integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  pushes integer not null default 0,
  roi_percent numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.model_rating_history (
  id bigint generated always as identity primary key,
  model_id uuid not null references public.analyst_models(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric not null,
  graded_picks integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists model_rating_board_idx
on public.model_ratings (sport, category, rating desc);
create index if not exists model_rating_history_idx
on public.model_rating_history (model_id, recorded_at desc);

alter table public.model_ratings enable row level security;
alter table public.model_rating_history enable row level security;

drop policy if exists "Users read their model ratings" on public.model_ratings;
create policy "Users read their model ratings"
on public.model_ratings for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users read their model rating history" on public.model_rating_history;
create policy "Users read their model rating history"
on public.model_rating_history for select to authenticated using (auth.uid() = user_id);

create or replace function public.refresh_model_rating(target_model uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  model_sport text;
  model_category text;
begin
  select user_id, sport, category into owner_id, model_sport, model_category
  from public.analyst_models where id = target_model;
  if owner_id is null then return; end if;

  delete from public.model_ratings where model_id = target_model;
  insert into public.model_ratings (
    model_id, user_id, sport, category, rating, graded_picks,
    wins, losses, pushes, roi_percent, updated_at
  )
  select target_model, owner_id, model_sport, model_category,
    greatest(800, least(2400,
      1500 + avg(
        (case when result = 'win' then 1 when result = 'push' then implied_probability else 0 end)
        - implied_probability
      ) * 650 + greatest(-1, least(2, avg(normalized_profit))) * 100
    )),
    count(*)::integer,
    count(*) filter (where result = 'win')::integer,
    count(*) filter (where result = 'loss')::integer,
    count(*) filter (where result = 'push')::integer,
    (sum(profit_units) / nullif(sum(stake_units), 0)) * 100,
    now()
  from (
    select activity.*,
      case when american_odds > 0
        then 100.0 / (american_odds + 100.0)
        else abs(american_odds)::numeric / (abs(american_odds) + 100.0)
      end as implied_probability,
      case when result = 'win'
        then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end
        when result = 'loss' then -1 else 0
      end as normalized_profit
    from public.graded_betting_activity activity
    where activity.model_id = target_model
      and activity.source = 'provider'
      and activity.verification_status = 'verified'
      and activity.result in ('win', 'loss', 'push')
  ) settled
  having count(*) > 0;
end;
$$;

create or replace function public.refresh_model_rating_after_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.model_id is not null then perform public.refresh_model_rating(old.model_id); end if;
  if new.model_id is not null and new.model_id is distinct from old.model_id then
    perform public.refresh_model_rating(new.model_id);
  elsif new.model_id is not null then
    perform public.refresh_model_rating(new.model_id);
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_model_rating_after_pick on public.graded_betting_activity;
create trigger refresh_model_rating_after_pick
after update of result, verification_status, model_id on public.graded_betting_activity
for each row execute function public.refresh_model_rating_after_pick();

create or replace function public.capture_model_rating_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.model_rating_history (model_id, user_id, rating, graded_picks)
  values (new.model_id, new.user_id, new.rating, new.graded_picks);
  return new;
end;
$$;

drop trigger if exists capture_model_rating_movement on public.model_ratings;
create trigger capture_model_rating_movement
after insert or update of rating, graded_picks on public.model_ratings
for each row execute function public.capture_model_rating_movement();

do $$
declare record_model record;
begin
  for record_model in select id from public.analyst_models loop
    perform public.refresh_model_rating(record_model.id);
  end loop;
end $$;

create or replace function public.get_model_arena(
  requested_sport text default null,
  requested_category text default null,
  result_limit integer default 50
)
returns table (
  rank bigint, model_id uuid, model_name text, owner_alias text,
  sport text, category text, rating numeric, rating_change numeric,
  graded_picks integer, wins integer, losses integer, pushes integer,
  roi_percent numeric, version integer, is_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  select row_number() over (order by ratings.rating desc, ratings.graded_picks desc),
    model.id, model.name, coalesce(profile.public_alias, 'Anonymous Analyst'),
    ratings.sport, ratings.category, ratings.rating,
    ratings.rating - coalesce(previous.rating, ratings.rating),
    ratings.graded_picks, ratings.wins, ratings.losses, ratings.pushes,
    ratings.roi_percent, model.version, model.user_id = auth.uid()
  from public.model_ratings ratings
  join public.analyst_models model on model.id = ratings.model_id
  join public.competitive_profiles profile on profile.user_id = model.user_id
  left join lateral (
    select history.rating from public.model_rating_history history
    where history.model_id = ratings.model_id
      and history.graded_picks < ratings.graded_picks
    order by history.recorded_at desc limit 1
  ) previous on true
  where profile.leaderboard_opt_in
    and model.status = 'live'
    and ratings.graded_picks >= 10
    and (requested_sport is null or ratings.sport = requested_sport)
    and (requested_category is null or ratings.category = requested_category)
  order by ratings.rating desc, ratings.graded_picks desc
  limit least(greatest(result_limit, 1), 100);
$$;

grant execute on function public.get_model_arena(text, text, integer) to authenticated;

comment on table public.model_ratings is
'Independent verified performance for each analyst model. Model ratings never replace user ratings.';
