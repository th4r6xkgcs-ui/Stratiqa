insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pick-evidence', 'pick-evidence', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880;

create table if not exists public.pick_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sportsbook text not null,
  ticket_id text,
  object_path text,
  content_hash text not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','matched','rejected','duplicate')),
  rating_eligible boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (sportsbook, ticket_id),
  unique (content_hash)
);

create table if not exists public.analyst_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sport text not null,
  category text not null,
  description text not null default '',
  factors jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','testing','live','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.pick_evidence enable row level security;
alter table public.analyst_models enable row level security;

create policy "Users read their pick evidence" on public.pick_evidence
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users manage their models" on public.analyst_models
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.pick_evidence is
'Screenshots and ticket IDs are evidence only. They remain rating-ineligible until independently matched.';
