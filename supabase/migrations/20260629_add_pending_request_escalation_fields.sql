-- Separate approval-reminder bookkeeping from WFH check-in nudges.
--
-- `last_reminded_at` existed before this migration and is still used by
-- /api/cron/wfh-checkin-nudge for approved-WFH employee check-in nudges.
-- Pending leave/WFH approval reminders now use `approval_reminded_at`,
-- and HR awareness escalation uses `hr_escalated_at`.

ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS approval_reminded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hr_escalated_at TIMESTAMPTZ;

ALTER TABLE public.wfh_requests
    ADD COLUMN IF NOT EXISTS approval_reminded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hr_escalated_at TIMESTAMPTZ;

UPDATE public.leave_requests
SET approval_reminded_at = last_reminded_at
WHERE approval_reminded_at IS NULL
  AND last_reminded_at IS NOT NULL;

UPDATE public.wfh_requests
SET approval_reminded_at = last_reminded_at
WHERE approval_reminded_at IS NULL
  AND last_reminded_at IS NOT NULL
  AND status = 'pending';

COMMENT ON COLUMN public.leave_requests.approval_reminded_at IS
    'Last time the cron reminded the assigned approver about a pending leave request.';
COMMENT ON COLUMN public.wfh_requests.approval_reminded_at IS
    'Last time the cron reminded the assigned approver about a pending WFH request.';
COMMENT ON COLUMN public.leave_requests.hr_escalated_at IS
    'Last time HR was notified that a pending leave request is stale or close to its start date.';
COMMENT ON COLUMN public.wfh_requests.hr_escalated_at IS
    'Last time HR was notified that a pending WFH request is stale or close to its start date.';

CREATE INDEX IF NOT EXISTS leave_requests_pending_approval_reminder_idx
    ON public.leave_requests (status, submitted_at, approval_reminded_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS wfh_requests_pending_approval_reminder_idx
    ON public.wfh_requests (status, submitted_at, approval_reminded_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS leave_requests_pending_hr_escalation_idx
    ON public.leave_requests (status, start_date, hr_escalated_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS wfh_requests_pending_hr_escalation_idx
    ON public.wfh_requests (status, start_date, hr_escalated_at)
    WHERE status = 'pending';
