-- Holidays table — referenced by /portal/calendar + /hradmin/leave?tab=calendar
-- + the holidays admin UI at /hradmin/holidays. Was missing in DB until now;
-- code paths that try to read from it use try/catch and silently degrade.
--
-- Shape matches what existing routes already SELECT/INSERT:
--   /api/holidays GET/POST: id, date, name, type, year
--   /api/holidays/[id] PUT/DELETE
--   portal/calendar/page.tsx: id, date, name, type
--   hradmin/leave/calendar Tab 4: date, name (best-effort)
--
-- `year` is stored even though it's derivable from `date` because the existing
-- API queries filter `eq('year', year)` and a generated/indexed column is the
-- cheapest way to keep that fast without rewriting every caller.

CREATE TABLE IF NOT EXISTS public.holidays (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date        date NOT NULL,
    name        text NOT NULL,
    type        text NOT NULL DEFAULT 'public',
    year        int  NOT NULL GENERATED ALWAYS AS (EXTRACT(year FROM date)::int) STORED,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (date, name)
);

CREATE INDEX IF NOT EXISTS idx_holidays_year ON public.holidays(year);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);

COMMENT ON COLUMN public.holidays.type IS 'public | company | religious — drives bg color in calendar';
COMMENT ON COLUMN public.holidays.year IS 'Auto-derived from date; indexed for cheap year filters';
