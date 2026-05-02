-- §3.1 BETA_FEEDBACK Layer 2 — per-employee WFH request flow.
--
-- Why a separate table from leave_requests:
--   - WFH ≠ ลา. The employee is still working; no leave-balance is
--     debited and the day is not "ขาดงาน" — counting against either
--     of those would be wrong.
--   - Different semantics for cancellation (no balance refund needed),
--     reporting (attendance not absence), and downstream integration
--     (drives the /portal/checkin "WFH" button eligibility).
--
-- Approver routing reuses lib/leave-approval.resolveLeaveApprover()
-- so each employee's WFH request goes to the same person their leave
-- requests would. One inbox to action.
--
-- Reference codes follow `WFH-{year}-{seq}` so HR can cite them by
-- voice the same way they cite LV-{year}-{seq}. Sequence is shared
-- across years but display rolls; if Mod ever wants per-year reset
-- we can swap to a wrapper RPC like generate_leave_reference.
CREATE SEQUENCE IF NOT EXISTS public.wfh_request_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_wfh_reference()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    seq_val BIGINT;
    yr INT := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Bangkok'))::INT;
BEGIN
    seq_val := nextval('public.wfh_request_seq');
    RETURN 'WFH-' || yr || '-' || lpad(seq_val::TEXT, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.wfh_requests (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code           TEXT UNIQUE NOT NULL,

    employee_id              TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Date range (inclusive on both ends). Same shape as leave_requests
    -- so the calendar can render WFH days alongside leave days with the
    -- same expansion logic.
    start_date               DATE NOT NULL,
    end_date                 DATE NOT NULL,
    total_days               NUMERIC NOT NULL DEFAULT 1,

    -- Why the employee is asking (e.g. "ช่างมาล้างแอร์", "พาลูกหาหมอ").
    -- Required so the approver has context — pure rubber-stamping isn't
    -- the goal.
    reason                   TEXT NOT NULL,
    contact_during_wfh       TEXT,

    -- State machine: pending → approved/rejected, or pending → cancelled.
    -- approved → cancelled is allowed too (employee changes plan); we
    -- DON'T require approver re-confirmation for cancellation since no
    -- balance is being refunded — failure mode is benign.
    status                   TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT wfh_requests_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

    -- Approver routing. employee_id of the approver (NOT User.id) so
    -- existing helpers like displayApproverName() work without changes.
    approver_id              TEXT REFERENCES public.employees(id),
    approved_at              TIMESTAMPTZ,
    approval_notes           TEXT,
    rejection_reason         TEXT,

    submitted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at             TIMESTAMPTZ,
    cancellation_reason      TEXT,

    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wfh_requests_employee_id_idx ON public.wfh_requests(employee_id);
CREATE INDEX IF NOT EXISTS wfh_requests_approver_id_idx ON public.wfh_requests(approver_id);
CREATE INDEX IF NOT EXISTS wfh_requests_status_idx ON public.wfh_requests(status);
CREATE INDEX IF NOT EXISTS wfh_requests_dates_idx ON public.wfh_requests(start_date, end_date);

ALTER TABLE public.wfh_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_wfh_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wfh_requests_touch_updated_at ON public.wfh_requests;
CREATE TRIGGER wfh_requests_touch_updated_at
    BEFORE UPDATE ON public.wfh_requests
    FOR EACH ROW EXECUTE FUNCTION public.touch_wfh_requests_updated_at();

COMMENT ON TABLE public.wfh_requests IS
    'Per-employee WFH (work-from-home) requests. Distinct from leave_requests because WFH does not consume leave balance and the employee is still working.';
