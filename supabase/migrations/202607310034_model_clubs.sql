-- V18.1: private Model Clubs with aggregate, verified-only scorecards.

create table if not exists public.model_clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 3 and 48),
  description text not null default '' check (char_length(description) <= 180),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.model_club_members (
  club_id uuid not null references public.model_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.model_club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.model_clubs(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (club_id, invited_user_id)
);

create index if not exists model_club_members_user_idx on public.model_club_members (user_id, joined_at desc);
create index if not exists model_club_invites_user_idx on public.model_club_invites (invited_user_id, status, created_at desc);

alter table public.model_clubs enable row level security;
alter table public.model_club_members enable row level security;
alter table public.model_club_invites enable row level security;

create policy "Members read their clubs" on public.model_clubs for select to authenticated using (exists (select 1 from public.model_club_members member where member.club_id = id and member.user_id = auth.uid()));
create policy "Members read club rosters" on public.model_club_members for select to authenticated using (exists (select 1 from public.model_club_members mine where mine.club_id = club_id and mine.user_id = auth.uid()));
create policy "Users read their club invites" on public.model_club_invites for select to authenticated using (invited_user_id = auth.uid() or invited_by = auth.uid());

create or replace function public.add_model_club_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.model_club_members (club_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists add_model_club_owner on public.model_clubs;
create trigger add_model_club_owner after insert on public.model_clubs for each row execute function public.add_model_club_owner();

create or replace function public.accept_model_club_invite(target_invite uuid, target_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare invite_row public.model_club_invites%rowtype;
begin
  select * into invite_row from public.model_club_invites where id = target_invite and invited_user_id = target_user and status = 'pending' for update;
  if invite_row.id is null then return false; end if;
  insert into public.model_club_members (club_id, user_id) values (invite_row.club_id, target_user) on conflict do nothing;
  update public.model_club_invites set status = 'accepted', responded_at = now() where id = target_invite;
  return true;
end;
$$;

revoke all on function public.accept_model_club_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_model_club_invite(uuid, uuid) to service_role;

comment on table public.model_clubs is 'Private analyst clubs. Club summaries use only member-owned, automatically verified aggregate data.';
