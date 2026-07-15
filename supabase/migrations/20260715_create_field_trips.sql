CREATE TABLE IF NOT EXISTS public.field_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    checkin_id UUID NOT NULL REFERENCES public.checkins(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    estimated_return_time TEXT NULL,
    left_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at TIMESTAMPTZ NULL,
    latitude NUMERIC NULL,
    longitude NUMERIC NULL,
    accuracy_meters NUMERIC NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for fast lookups on active trips
CREATE INDEX IF NOT EXISTS idx_field_trips_active
    ON public.field_trips (employee_id)
    WHERE returned_at IS NULL;

-- Enable RLS (Default Deny strategy)
ALTER TABLE public.field_trips ENABLE ROW LEVEL SECURITY;
