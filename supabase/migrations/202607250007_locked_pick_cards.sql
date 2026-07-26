alter table public.graded_betting_activity
  add column if not exists pick_card_id uuid;

create index if not exists graded_activity_pick_card_idx
on public.graded_betting_activity (user_id, pick_card_id)
where pick_card_id is not null;

comment on column public.graded_betting_activity.pick_card_id is
'Groups selections confirmed in the same immutable STRATIQA slip. Each leg remains independently rated.';
