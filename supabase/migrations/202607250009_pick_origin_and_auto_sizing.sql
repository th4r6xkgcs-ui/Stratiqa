alter table public.graded_betting_activity
  add column if not exists pick_origin text not null default 'personal'
    check (pick_origin in ('stratiqa', 'model', 'personal'));

update public.graded_betting_activity
set pick_origin = case
  when attribution_type = 'model' then 'model'
  when source = 'provider' then 'stratiqa'
  else 'personal'
end;

comment on column public.graded_betting_activity.pick_origin is
'Who produced the pick idea. Independent from provider verification and settlement status.';

comment on column public.graded_betting_activity.stake_units is
'Optional bankroll tracking. Stake size never affects competitive rating points.';

create or replace function public.refresh_verified_category_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := coalesce(new.user_id, old.user_id);
  target_category text := coalesce(new.category, old.category);
begin
  insert into public.category_ratings (
    user_id, category, rating, graded_picks, wins, losses, pushes,
    roi_percent, closing_line_value, confidence_calibration, updated_at
  )
  select target_user, target_category,
    greatest(800, least(2400,
      1500
      + avg((case when result = 'win' then 1 when result = 'push' then implied_probability else 0 end) - implied_probability) * 600
      + greatest(-20, least(20, avg(clv))) * 3
      + greatest(-1, least(2, avg(normalized_profit))) * 100
    )),
    count(*)::integer,
    count(*) filter (where result = 'win')::integer,
    count(*) filter (where result = 'loss')::integer,
    count(*) filter (where result = 'push')::integer,
    (sum(profit_units) / nullif(sum(stake_units), 0)) * 100,
    avg(clv),
    100 - avg(abs(confidence - case when result = 'win' then 100 when result = 'loss' then 0 else confidence end)),
    now()
  from (
    select *,
      case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end as implied_probability,
      case when result = 'win' then case when american_odds > 0 then american_odds / 100.0 else 100.0 / abs(american_odds) end when result = 'loss' then -1 else 0 end as normalized_profit,
      case when closing_odds is null then 0 else (
        case when closing_odds > 0 then 100.0 / (closing_odds + 100.0) else abs(closing_odds)::numeric / (abs(closing_odds) + 100.0) end
        - case when american_odds > 0 then 100.0 / (american_odds + 100.0) else abs(american_odds)::numeric / (abs(american_odds) + 100.0) end
      ) * 100 end as clv
    from public.graded_betting_activity
    where user_id = target_user and category = target_category
      and source = 'provider' and verification_status = 'verified'
      and result in ('win', 'loss', 'push')
  ) verified
  having count(*) > 0
  on conflict (user_id, category) do update set
    rating = excluded.rating, graded_picks = excluded.graded_picks,
    wins = excluded.wins, losses = excluded.losses, pushes = excluded.pushes,
    roi_percent = excluded.roi_percent, closing_line_value = excluded.closing_line_value,
    confidence_calibration = excluded.confidence_calibration, updated_at = excluded.updated_at;
  return coalesce(new, old);
end;
$$;
