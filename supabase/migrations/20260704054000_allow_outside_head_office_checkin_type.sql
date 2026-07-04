-- Allow assigned employees who work outside EBCI Head Office to use the
-- dedicated check-in type. The application has used this value since the
-- outside-office check-in flow was added, but production still had the
-- original office/wfh/field constraint.

ALTER TABLE public.checkins
    DROP CONSTRAINT IF EXISTS checkins_type_check;

ALTER TABLE public.checkins
    ADD CONSTRAINT checkins_type_check
    CHECK (type IN ('office', 'wfh', 'field', 'outside_head_office'));
