alter table public.graded_betting_activity
  add column if not exists attribution_type text not null default 'judgment'
    check (attribution_type in ('judgment', 'model')),
  add column if not exists model_name text;

alter table public.graded_betting_activity
  drop constraint if exists model_attribution_requires_name;

alter table public.graded_betting_activity
  add constraint model_attribution_requires_name check (
    attribution_type <> 'model' or nullif(trim(model_name), '') is not null
  );

comment on column public.graded_betting_activity.model_name is
'Immutable model attribution captured when a provider-linked prediction is locked.';
