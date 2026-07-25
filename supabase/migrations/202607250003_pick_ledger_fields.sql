alter table public.graded_betting_activity
  add column if not exists event_name text,
  add column if not exists selection text,
  add column if not exists sportsbook text,
  add column if not exists confidence numeric(5,2) check (confidence >= 1 and confidence <= 100),
  add column if not exists notes text;

create index if not exists graded_betting_activity_user_placed_idx
on public.graded_betting_activity (user_id, placed_at desc);

comment on column public.graded_betting_activity.source is
'user means self-reported and is ineligible for verified rankings; provider means independently graded.';
