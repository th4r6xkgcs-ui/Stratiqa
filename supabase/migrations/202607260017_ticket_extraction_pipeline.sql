alter table public.pick_evidence
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'ready', 'review', 'unavailable', 'failed')),
  add column if not exists extracted_sportsbook text,
  add column if not exists extracted_ticket_id text,
  add column if not exists extracted_stake numeric check (extracted_stake >= 0),
  add column if not exists extracted_payout numeric check (extracted_payout >= 0),
  add column if not exists extracted_selections jsonb not null default '[]'::jsonb,
  add column if not exists extracted_event text,
  add column if not exists extraction_confidence numeric check (extraction_confidence between 0 and 100),
  add column if not exists match_score numeric check (match_score between 0 and 100),
  add column if not exists extraction_provider text,
  add column if not exists extracted_at timestamptz;

create index if not exists evidence_extraction_queue_idx
on public.pick_evidence (extraction_status, submitted_at)
where object_path is not null and verification_status = 'pending';

create unique index if not exists unique_extracted_sportsbook_ticket
on public.pick_evidence (lower(extracted_sportsbook), lower(extracted_ticket_id))
where extracted_ticket_id is not null;

comment on column public.pick_evidence.match_score is
'Automated screenshot-to-locked-pick similarity. It assists review but never independently certifies a wager.';
