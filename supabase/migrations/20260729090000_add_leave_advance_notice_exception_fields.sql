-- Allow annual leave submitted with short advance notice to remain auditable.
--
-- HR policy still requires annual leave to be filed in advance, but real-world
-- cases can require approver discretion. These fields record when a request is
-- submitted under that exception path and why.

ALTER TABLE public.leave_requests
    ADD COLUMN IF NOT EXISTS advance_notice_exception_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS advance_notice_exception_reason TEXT;

ALTER TABLE public.leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_advance_notice_exception_reason_check,
    ADD CONSTRAINT leave_requests_advance_notice_exception_reason_check
        CHECK (
            advance_notice_exception_required = FALSE
            OR length(btrim(coalesce(advance_notice_exception_reason, ''))) > 0
        );

COMMENT ON COLUMN public.leave_requests.advance_notice_exception_required IS
    'True when annual leave is submitted with less than the configured advance_notice_days and needs approver discretion.';

COMMENT ON COLUMN public.leave_requests.advance_notice_exception_reason IS
    'Employee-supplied reason for short-notice annual leave, shown to approvers and retained for HR audit.';

