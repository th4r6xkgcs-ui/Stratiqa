create table if not exists public.pick_cards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_type text not null default 'single' check (card_type in ('single', 'parlay')),
  leg_count integer not null default 1 check (leg_count between 1 and 12),
  combined_decimal_odds numeric not null default 1,
  combined_american_odds integer,
  confidence integer not null default 50 check (confidence between 1 and 100),
  stake_units numeric not null default 1 check (stake_units > 0),
  result text not null default 'pending' check (result in ('pending', 'win', 'loss', 'push', 'void')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'void')),
  profit_units numeric,
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists pick_cards_user_time_idx on public.pick_cards (user_id, placed_at desc);
alter table public.pick_cards enable row level security;
drop policy if exists "Users read own pick cards" on public.pick_cards;
create policy "Users read own pick cards" on public.pick_cards for select using (auth.uid() = user_id);

create or replace function public.sync_pick_card_from_legs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_card uuid;
  legs integer;
  pending_legs integer;
  loss_legs integer;
  win_legs integer;
  push_legs integer;
  void_legs integer;
  decimal_price numeric;
  card_result text;
begin
  target_card := new.pick_card_id;
  if target_card is null then return new; end if;

  select count(*)::integer,
    count(*) filter (where result = 'pending')::integer,
    count(*) filter (where result = 'loss')::integer,
    count(*) filter (where result = 'win')::integer,
    count(*) filter (where result = 'push')::integer,
    count(*) filter (where result = 'void')::integer,
    exp(sum(ln(case when result in ('push', 'void') then 1
      when american_odds > 0 then 1 + american_odds / 100.0
      else 1 + 100.0 / abs(american_odds) end)))
  into legs, pending_legs, loss_legs, win_legs, push_legs, void_legs, decimal_price
  from public.graded_betting_activity where pick_card_id = target_card;

  card_result := case
    when loss_legs > 0 then 'loss'
    when pending_legs > 0 then 'pending'
    when win_legs > 0 then 'win'
    when push_legs > 0 then 'push'
    else 'void'
  end;

  insert into public.pick_cards (
    id, user_id, card_type, leg_count, combined_decimal_odds, combined_american_odds,
    confidence, stake_units, result, verification_status, profit_units, placed_at, settled_at
  )
  select target_card, (array_agg(user_id))[1], case when legs > 1 then 'parlay' else 'single' end,
    legs, decimal_price,
    case when decimal_price >= 2 then round((decimal_price - 1) * 100)::integer
         else round(-100 / nullif(decimal_price - 1, 0))::integer end,
    greatest(1, round(exp(sum(ln(greatest(confidence, 1) / 100.0))) * 100))::integer,
    max(stake_units), card_result,
    case when card_result = 'pending' then 'pending' when card_result = 'void' then 'void' else 'verified' end,
    case when card_result = 'win' then max(stake_units) * (decimal_price - 1)
         when card_result = 'loss' then -max(stake_units)
         when card_result in ('push', 'void') then 0 else null end,
    min(placed_at), case when card_result = 'pending' then null else now() end
  from public.graded_betting_activity where pick_card_id = target_card
  on conflict (id) do update set
    card_type = excluded.card_type, leg_count = excluded.leg_count,
    combined_decimal_odds = excluded.combined_decimal_odds,
    combined_american_odds = excluded.combined_american_odds,
    confidence = excluded.confidence, stake_units = excluded.stake_units,
    result = excluded.result, verification_status = excluded.verification_status,
    profit_units = excluded.profit_units, settled_at = excluded.settled_at;
  return new;
end;
$$;

drop trigger if exists sync_card_after_leg_change on public.graded_betting_activity;
create trigger sync_card_after_leg_change
after insert or update of result, verification_status on public.graded_betting_activity
for each row execute function public.sync_pick_card_from_legs();

insert into public.pick_cards (id, user_id)
select pick_card_id, (array_agg(user_id))[1]
from public.graded_betting_activity
where pick_card_id is not null
group by pick_card_id
on conflict (id) do nothing;

do $$
declare card record;
begin
  for card in select distinct pick_card_id from public.graded_betting_activity where pick_card_id is not null loop
    update public.graded_betting_activity set result = graded_betting_activity.result
    where id = (select id from public.graded_betting_activity where pick_card_id = card.pick_card_id limit 1);
  end loop;
end $$;

create or replace function public.refresh_parlay_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.category_ratings where user_id = new.user_id and category = 'parlay';
  insert into public.category_ratings (
    user_id, category, rating, graded_picks, wins, losses, pushes,
    roi_percent, closing_line_value, confidence_calibration, updated_at
  )
  select new.user_id, 'parlay',
    greatest(800, least(2400,
      1500 + avg(
        (case when result = 'win' then 1 when result = 'push' then 1 / combined_decimal_odds else 0 end)
        - (1 / combined_decimal_odds)
      ) * 700
    )),
    count(*)::integer,
    count(*) filter (where result = 'win')::integer,
    count(*) filter (where result = 'loss')::integer,
    count(*) filter (where result = 'push')::integer,
    (sum(profit_units) / nullif(sum(stake_units), 0)) * 100,
    0,
    100 - avg(abs(confidence - case when result = 'win' then 100 when result = 'loss' then 0 else confidence end)),
    now()
  from public.pick_cards
  where user_id = new.user_id and card_type = 'parlay'
    and verification_status = 'verified' and result in ('win', 'loss', 'push')
  having count(*) > 0;
  return new;
end;
$$;

drop trigger if exists refresh_parlay_rating_after_settlement on public.pick_cards;
create trigger refresh_parlay_rating_after_settlement
after insert or update of result, verification_status on public.pick_cards
for each row execute function public.refresh_parlay_rating();

comment on table public.pick_cards is
'Immutable single and parlay card summaries derived from their automatically settled provider legs.';
