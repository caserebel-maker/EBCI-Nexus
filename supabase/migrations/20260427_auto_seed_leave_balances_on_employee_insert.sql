-- Auto-seed leave_balances when a new employee is inserted.
--
-- Iterates over every active leave_type that has a non-null
-- default_days_per_year and creates a row in leave_balances for the
-- new hire's start-year. Types with default_days_per_year = NULL
-- (annual, marriage, training) are intentionally skipped — those
-- need an explicit policy decision (annual depends on tenure;
-- marriage gates behind probation; training is unlimited and HR-led).
--
-- Idempotent: ON CONFLICT DO NOTHING in case HR pre-seeded balances
-- before the trigger fires (e.g. a backfill).

CREATE OR REPLACE FUNCTION public.seed_leave_balances_for_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INTEGER;
BEGIN
    -- Skip if status is not active (rehires can be edge-cased later)
    IF NEW.status IS DISTINCT FROM 'active' THEN
        RETURN NEW;
    END IF;

    -- Year defaults to start_date's year, falls back to current year
    -- if start_date isn't set yet.
    v_year := COALESCE(EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
                       EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

    INSERT INTO leave_balances (
        employee_id, leave_type_id, year,
        total_days, used_days, pending_days,
        notes
    )
    SELECT
        NEW.id,
        lt.id,
        v_year,
        lt.default_days_per_year,
        0,
        0,
        'Auto-seeded on employee creation (' || lt.name_th || ')'
    FROM leave_types lt
    WHERE lt.is_active = true
      AND lt.default_days_per_year IS NOT NULL
      AND lt.default_days_per_year > 0
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_leave_balances ON public.employees;

CREATE TRIGGER trg_seed_leave_balances
AFTER INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.seed_leave_balances_for_employee();

COMMENT ON TRIGGER trg_seed_leave_balances ON public.employees IS
'Auto-creates leave_balances rows for every leave_type with a non-null default_days_per_year. Skips annual/marriage/training which need explicit policy.';
