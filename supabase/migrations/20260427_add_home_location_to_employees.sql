-- Home / residence location of each employee, captured by HR.
-- Stored as separate lat/long numerics so we can:
--   * Validate input ranges at insert time (-90..90 / -180..180).
--   * Use the values for future analytics (commute time clustering,
--     emergency proximity, etc.) without parsing strings every time.
--
-- The label is free-text (e.g. "บ้าน", "บ้านพ่อแม่", "หอพัก").
-- The note is optional context (apartment number, landmark).
-- All four columns are nullable — many employees won't have this
-- captured yet, and that's fine; the UI shows an empty state.

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS home_latitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS home_longitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS home_location_label TEXT,
    ADD COLUMN IF NOT EXISTS home_location_note TEXT,
    ADD COLUMN IF NOT EXISTS home_location_updated_at TIMESTAMPTZ;

-- Range validation. Reject obvious garbage at write time so we
-- don't end up with a null-island employee or coordinates flipped.
ALTER TABLE public.employees
    DROP CONSTRAINT IF EXISTS employees_home_lat_range,
    DROP CONSTRAINT IF EXISTS employees_home_lng_range;

ALTER TABLE public.employees
    ADD CONSTRAINT employees_home_lat_range
        CHECK (home_latitude IS NULL OR (home_latitude BETWEEN -90 AND 90)),
    ADD CONSTRAINT employees_home_lng_range
        CHECK (home_longitude IS NULL OR (home_longitude BETWEEN -180 AND 180));

COMMENT ON COLUMN public.employees.home_latitude IS
'Home residence latitude in decimal degrees. HR-captured. NULL if not yet collected.';
COMMENT ON COLUMN public.employees.home_longitude IS
'Home residence longitude in decimal degrees. HR-captured. NULL if not yet collected.';
COMMENT ON COLUMN public.employees.home_location_label IS
'Short label for the location, e.g. "บ้าน", "หอพัก", "บ้านพ่อแม่".';
COMMENT ON COLUMN public.employees.home_location_note IS
'Optional context: apartment number, building name, nearby landmark.';
