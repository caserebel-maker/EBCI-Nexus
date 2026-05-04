-- Reminder bookkeeping for the pending-request nudge cron
-- (api/cron/leave-reminders, scheduled via vercel.json).
--
-- The cron runs daily, finds rows that have been pending for > 24h,
-- and re-pings the approver. We stamp `last_reminded_at` on each
-- ping so the next run won't blast the same row again — a request
-- that's been sitting for 5 days gets at most one reminder per day,
-- not 5 reminders per run.
ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

ALTER TABLE public.wfh_requests
    ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leave_requests.last_reminded_at IS
    'Last time the cron sent a "still pending" reminder to the approver. NULL = never reminded.';
COMMENT ON COLUMN public.wfh_requests.last_reminded_at IS
    'Same as leave_requests.last_reminded_at — used by api/cron/leave-reminders.';
