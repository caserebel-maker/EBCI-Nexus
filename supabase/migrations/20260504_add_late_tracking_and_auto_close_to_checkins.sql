-- Late tracking + auto-checkout safety net for the check-in system.
--
-- Three new columns on `checkins` close the gaps surfaced in the
-- 4 May audit (forgot card tap, forgot to check out, no late record):
--
--   late_minutes (INTEGER, NULL when on-time)
--     Computed at insert time from `checked_in_at` vs the 08:30 BKK
--     start. Storing it (vs deriving on read) means HR queries can
--     filter/index without re-doing the timezone math, and the value
--     is locked to "what counted as late on the day", insulated from
--     future policy changes.
--
--   late_reason (TEXT, NULL when on-time or unprovided)
--     Optional explanation employee types in the check-in modal
--     when arriving late. Tier-based UX: required (or strongly
--     prompted) past 31min, optional 1-30min.
--
--   auto_closed_at (TIMESTAMPTZ, NULL when employee tapped checkout)
--     Set by /api/cron/auto-checkout when it force-closes a session
--     left open > 12h. Lets HR distinguish "real" check-outs from
--     system-imposed cleanups.
ALTER TABLE public.checkins
    ADD COLUMN IF NOT EXISTS late_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS late_reason TEXT,
    ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.checkins.late_minutes IS
    'Minutes late vs the 08:30 BKK official start. NULL = on time. Stored at insert; read-only afterwards.';
COMMENT ON COLUMN public.checkins.late_reason IS
    'Employee-supplied reason when arriving late (optional ≤30min, prompted >30min). Free text.';
COMMENT ON COLUMN public.checkins.auto_closed_at IS
    'When /api/cron/auto-checkout force-closed this session. NULL = employee tapped checkout themselves.';

CREATE INDEX IF NOT EXISTS idx_checkins_open_sessions
    ON public.checkins (checked_in_at)
    WHERE checked_out_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_checkins_late
    ON public.checkins (checked_in_at)
    WHERE late_minutes IS NOT NULL AND late_minutes > 0;
