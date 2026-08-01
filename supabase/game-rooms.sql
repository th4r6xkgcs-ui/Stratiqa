-- STRATIQA Game Rooms: run once in Supabase SQL Editor.
create table if not exists public.game_room_messages (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check (char_length(event_id) between 1 and 220),
  event_name text not null check (char_length(event_name) between 1 and 160),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists game_room_messages_event_created_idx on public.game_room_messages (event_id, created_at);

create table if not exists public.game_room_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.game_room_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

alter table public.game_room_messages enable row level security;
alter table public.game_room_reports enable row level security;
