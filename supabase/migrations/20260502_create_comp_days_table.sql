-- §2.1 BETA_FEEDBACK — Comp day (วันหยุดสะสม) instead of leave
--
-- Today, employees who work on a holiday have to file a leave request
-- when they want to take a comp day off — wrong-shaped because (1) it
-- decrements their leave balance and (2) the workflow demands a reason.
-- This table records earned + used comp days separately from leave.
--
-- Lifecycle of a row:
--   GRANTED → AVAILABLE (no used_on, not voided, not expired)
--           → USED      (used_on set; cannot be re-used)
--           → EXPIRED   (expires_at passed, never used; computed, no
--                        column flip — keeps audit history clean)
--           → VOIDED    (HR mistake, employee left, etc — voided_at set)
--
-- HR grants. Employee uses. HR can void (with reason). Refund-on-void
-- semantics are trivial because we never decrement anything — the
-- balance is just a count of available rows.
CREATE TABLE IF NOT EXISTS public.comp_days (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- The date the employee worked that earned the comp day. Usually
    -- a holiday or weekend; we DON'T enforce against the holidays
    -- table because edge cases (manager approves comp for a normal
    -- weekday) shouldn't be blocked by a foreign key.
    worked_on       DATE NOT NULL,
    earned_reason   TEXT,

    -- Audit: who granted + when. granted_by → User.id (auth UUID),
    -- same convention as employee_audit_log.actor_user_id.
    granted_by      TEXT REFERENCES public."User"(id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Usage. used_on is the date the employee took as time off.
    -- used_at is when they registered the use (clock time).
    used_on         DATE,
    used_at         TIMESTAMPTZ,
    used_note       TEXT,

    -- Optional expiry. NULL = never expires (HR can grant unlimited).
    -- Set this when company policy requires "use within X days".
    expires_at      DATE,

    -- Voiding (HR-only).
    voided_at       TIMESTAMPTZ,
    voided_by       TEXT REFERENCES public."User"(id),
    voided_reason   TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Sanity: voided rows shouldn't have a usage and vice-versa.
    -- Application-level still validates first; this is just a guard.
    CONSTRAINT comp_days_not_used_and_voided CHECK (
        used_on IS NULL OR voided_at IS NULL
    )
);

CREATE INDEX IF NOT EXISTS comp_days_employee_id_idx
    ON public.comp_days(employee_id);

-- Compound index for the "available balance" query — used heavily by
-- the dashboard widget + employee portal page.
CREATE INDEX IF NOT EXISTS comp_days_available_idx
    ON public.comp_days(employee_id, used_on, voided_at, expires_at);

-- Default-deny RLS. Same pattern as the rest of the app — service role
-- (supabaseAdmin) reads/writes; browser anon key has no access.
ALTER TABLE public.comp_days ENABLE ROW LEVEL SECURITY;

-- updated_at touch trigger — convention shared with leave_drafts.
CREATE OR REPLACE FUNCTION public.touch_comp_days_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comp_days_touch_updated_at ON public.comp_days;
CREATE TRIGGER comp_days_touch_updated_at
    BEFORE UPDATE ON public.comp_days
    FOR EACH ROW EXECUTE FUNCTION public.touch_comp_days_updated_at();

COMMENT ON TABLE public.comp_days IS
    'Compensatory days off (วันหยุดสะสม). HR grants when employee works a holiday; employee uses to take time off without spending leave balance.';
COMMENT ON COLUMN public.comp_days.granted_by IS
    'User.id (auth UUID) of HR staff who granted — same convention as employee_audit_log.actor_user_id.';
COMMENT ON COLUMN public.comp_days.expires_at IS
    'Optional date — NULL means never expires. EXPIRED status is computed from this column, not flipped, so audit history stays intact.';
