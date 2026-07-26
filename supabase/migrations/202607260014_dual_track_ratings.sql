alter table public.graded_betting_activity
  add column if not exists real_stake_amount numeric check (real_stake_amount >= 0),
  add column if not exists real_payout_amount numeric check (real_payout_amount >= 0),
  add column if not exists real_profit_amount numeric;

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
  delete from public.category_ratings where user_id = target_user and category = target_category;
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
  ) settled
  having count(*) > 0;
  return coalesce(new, old);
end;
$$;

delete from public.category_ratings;
insert into public.category_ratings (
  user_id, category, rating, graded_picks, wins, losses, pushes,
  roi_percent, closing_line_value, confidence_calibration, updated_at
)
select user_id, category,
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
  where source = 'provider' and verification_status = 'verified'
    and result in ('win', 'loss', 'push')
) settled
group by user_id, category;

comment on column public.graded_betting_activity.certification_status is
'Sportsbook placement proof only. STRATIQA ratings use every immutable provider-line pick settled automatically.';
comment on column public.graded_betting_activity.real_profit_amount is
'Actual currency profit populated only by a trusted sportsbook evidence matcher.';
