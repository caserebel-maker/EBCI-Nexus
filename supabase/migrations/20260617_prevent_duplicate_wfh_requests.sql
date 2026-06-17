-- Prevent duplicate active WFH rows for the same employee/date.
--
-- Existing historical duplicates are left untouched so this migration can
-- deploy safely. From this point forward:
--   - INSERT pending/approved cannot overlap another pending/approved row.
--   - UPDATE to approved cannot overlap another approved row.
--
-- The application layer mirrors these checks for friendly Thai errors; this
-- trigger is the race-condition backstop.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_wfh_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    overlapping_ref TEXT;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'approved') THEN
        SELECT reference_code
        INTO overlapping_ref
        FROM public.wfh_requests
        WHERE employee_id = NEW.employee_id
          AND status IN ('pending', 'approved')
          AND start_date <= NEW.end_date
          AND end_date >= NEW.start_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF overlapping_ref IS NOT NULL THEN
            RAISE EXCEPTION 'duplicate_active_wfh_request:%', overlapping_ref
                USING ERRCODE = '23505';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' THEN
        SELECT reference_code
        INTO overlapping_ref
        FROM public.wfh_requests
        WHERE id <> NEW.id
          AND employee_id = NEW.employee_id
          AND status = 'approved'
          AND start_date <= NEW.end_date
          AND end_date >= NEW.start_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF overlapping_ref IS NOT NULL THEN
            RAISE EXCEPTION 'duplicate_approved_wfh_request:%', overlapping_ref
                USING ERRCODE = '23505';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_active_wfh_request_trg ON public.wfh_requests;
CREATE TRIGGER prevent_duplicate_active_wfh_request_trg
    BEFORE INSERT OR UPDATE OF employee_id, start_date, end_date, status
    ON public.wfh_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_active_wfh_request();

COMMENT ON FUNCTION public.prevent_duplicate_active_wfh_request() IS
    'Blocks duplicate active WFH rows for the same employee/date while leaving old historical duplicates untouched.';
