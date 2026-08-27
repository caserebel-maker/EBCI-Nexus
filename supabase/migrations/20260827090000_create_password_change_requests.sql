alter table public."User"
    add column if not exists session_version integer not null default 1;

create table if not exists public.password_change_requests (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    email text not null,
    source text not null check (source in ('forgot_password', 'in_app')),
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'approved', 'rejected')),
    requested_at timestamptz not null default now(),
    requested_ip text,
    requested_user_agent text,
    reviewed_by text,
    reviewed_at timestamptz,
    review_note text,
    recovery_sent_at timestamptz
);

create unique index if not exists password_change_requests_one_pending_per_user
    on public.password_change_requests (user_id)
    where status = 'pending';

create index if not exists password_change_requests_status_requested_idx
    on public.password_change_requests (status, requested_at desc);

alter table public.password_change_requests enable row level security;

comment on table public.password_change_requests is
    'Audited password reset/change requests. Only service-role server actions may read or mutate rows.';
