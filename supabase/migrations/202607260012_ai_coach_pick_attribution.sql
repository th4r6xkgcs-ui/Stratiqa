alter table public.graded_betting_activity
  add column if not exists coach_recommendation_id text;

update public.graded_betting_activity
set pick_origin = 'personal'
where pick_origin = 'stratiqa'
  and coach_recommendation_id is null;

alter table public.graded_betting_activity
  drop constraint if exists stratiqa_picks_require_coach_identity;
alter table public.graded_betting_activity
  add constraint stratiqa_picks_require_coach_identity check (
    pick_origin <> 'stratiqa' or nullif(trim(coach_recommendation_id), '') is not null
  );

create index if not exists graded_activity_coach_recommendation_idx
on public.graded_betting_activity (coach_recommendation_id)
where coach_recommendation_id is not null;

comment on column public.graded_betting_activity.coach_recommendation_id is
'Validated AI Coach recommendation accepted by the user. Required for STRATIQA pick attribution.';
