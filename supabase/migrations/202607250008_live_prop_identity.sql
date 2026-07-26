alter table public.graded_betting_activity
  add column if not exists participant_name text;

create index if not exists graded_activity_live_prop_idx
on public.graded_betting_activity (provider_event_id, market_key, participant_name, line_point)
where category = 'player_prop';

comment on column public.graded_betting_activity.participant_name is
'Provider-identified player or participant used to verify proposition outcomes.';
