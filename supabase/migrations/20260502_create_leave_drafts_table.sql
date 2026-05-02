-- §2.4 BETA_FEEDBACK — Draft + autosave ใบลา
--
-- Separate table from leave_requests so:
--   1. drafts don't pollute approver inbox / audit / reports queries
--   2. required NOT NULL fields on leave_requests stay strict
--   3. payload is freeform jsonb so future form-shape changes don't
--      need migrations — drafts older than the new shape just fail
--      to restore gracefully (handled client-side)
--
-- One employee can have multiple drafts (might be planning leave for
-- multiple periods). Caller decides how many to allow in UI — current
-- soft cap is 10 per employee, enforced in the API route.
CREATE TABLE IF NOT EXISTS public.leave_drafts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leave_drafts_employee_id_idx
    ON public.leave_drafts(employee_id);

CREATE INDEX IF NOT EXISTS leave_drafts_updated_at_idx
    ON public.leave_drafts(updated_at DESC);

-- Default-deny RLS — only service role (supabaseAdmin) reads/writes.
-- Same pattern as the rest of the leave tables (locked Apr 28 sweep).
ALTER TABLE public.leave_drafts ENABLE ROW LEVEL SECURITY;

-- updated_at touch trigger so autosave timestamps are accurate.
CREATE OR REPLACE FUNCTION public.touch_leave_drafts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_drafts_touch_updated_at ON public.leave_drafts;
CREATE TRIGGER leave_drafts_touch_updated_at
    BEFORE UPDATE ON public.leave_drafts
    FOR EACH ROW EXECUTE FUNCTION public.touch_leave_drafts_updated_at();

COMMENT ON TABLE public.leave_drafts IS
    'Autosaved leave-form drafts. Separate from leave_requests (no FK link); on submit the draft row is deleted.';
COMMENT ON COLUMN public.leave_drafts.payload IS
    'Freeform jsonb of form state — see /api/leave/draft for shape.';
