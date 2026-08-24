CREATE TABLE IF NOT EXISTS public.attendance_gps_review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    requested_for_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    employee_note TEXT NULL,
    gps_error TEXT NULL,
    latitude NUMERIC NULL,
    longitude NUMERIC NULL,
    accuracy_meters NUMERIC NULL,
    user_agent TEXT NULL,
    ip_address TEXT NULL,
    reviewed_by TEXT NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT attendance_gps_review_requests_status_check
        CHECK (status IN ('pending', 'reviewed', 'dismissed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_gps_review_pending_once
    ON public.attendance_gps_review_requests (employee_id, requested_for_date)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_attendance_gps_review_date_status
    ON public.attendance_gps_review_requests (requested_for_date, status, created_at);

COMMENT ON TABLE public.attendance_gps_review_requests IS
    'Employee-submitted fallback requests when they are physically at the office but browser GPS/location fails. HR reviews these before deciding how to annotate or correct attendance.';

ALTER TABLE public.attendance_gps_review_requests ENABLE ROW LEVEL SECURITY;
