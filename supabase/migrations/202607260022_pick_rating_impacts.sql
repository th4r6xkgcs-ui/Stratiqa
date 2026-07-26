create table if not exists public.pick_rating_impacts (
  pick_id uuid primary key references public.graded_betting_activity(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  previous_rating numeric not null,
  rating numeric not null,
  rating_change numeric not null,
  result text not null check (result in ('win', 'loss', 'push', 'void')),
  recorded_at timestamptz not null default now()
);

create index if not exists pick_rating_impacts_user_idx
on public.pick_rating_impacts (user_id, recorded_at desc);

alter table public.pick_rating_impacts enable row level security;
drop policy if exists "Users read their pick rating impacts" on public.pick_rating_impacts;
create policy "Users read their pick rating impacts"
on public.pick_rating_impacts for select to authenticated
using (auth.uid() = user_id);

create or replace function public.capture_pick_rating_impact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_rating numeric;
  prior_rating numeric;
begin
  if new.source <> 'provider'
    or new.verification_status not in ('verified', 'void')
    or new.result not in ('win', 'loss', 'push', 'void')
  then
    return new;
  end if;

  select history.rating into current_rating
  from public.category_rating_history history
  where history.user_id = new.user_id and history.category = new.category
  order by history.recorded_at desc, history.id desc
  limit 1;

  select history.rating into prior_rating
  from public.category_rating_history history
  where history.user_id = new.user_id and history.category = new.category
  order by history.recorded_at desc, history.id desc
  offset 1 limit 1;

  current_rating := coalesce(current_rating, 1500);
  prior_rating := coalesce(prior_rating, 1500);

  insert into public.pick_rating_impacts (
    pick_id, user_id, category, previous_rating, rating, rating_change, result, recorded_at
  ) values (
    new.id, new.user_id, new.category, prior_rating, current_rating,
    current_rating - prior_rating, new.result, coalesce(new.graded_at, now())
  )
  on conflict (pick_id) do update set
    category = excluded.category,
    previous_rating = excluded.previous_rating,
    rating = excluded.rating,
    rating_change = excluded.rating_change,
    result = excluded.result,
    recorded_at = excluded.recorded_at;
  return new;
end;
$$;

drop trigger if exists zz_capture_pick_rating_impact on public.graded_betting_activity;
create trigger zz_capture_pick_rating_impact
after update of result, verification_status, settlement_revision
on public.graded_betting_activity
for each row execute function public.capture_pick_rating_impact();

comment on table public.pick_rating_impacts is
'Exact per-pick rating movement shown to users after automatic settlement.';
