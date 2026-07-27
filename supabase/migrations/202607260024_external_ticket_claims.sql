alter table public.pick_evidence
  add column if not exists claim_type text not null default 'locked_pick'
    check (claim_type in ('locked_pick', 'external_ticket'));

create index if not exists external_ticket_review_queue_idx
on public.pick_evidence (verification_status, submitted_at)
where claim_type = 'external_ticket' and pick_id is null;

comment on column public.pick_evidence.claim_type is
'Locked-pick proof confirms real-money stats. External tickets are review-only and never affect ratings until independently matched to official event, market, placement time, and result data.';
