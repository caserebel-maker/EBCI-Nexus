-- =====================================================================
-- Migration: create room_bookings (single-room MVP)
--
-- One row per booking. Cancellations are soft (cancelled_at IS NOT NULL)
-- so the audit trail survives. The exclusion constraint guarantees that
-- two ACTIVE bookings cannot overlap in time on the same room — enforced
-- at the DB level so race conditions cannot create a double-book.
--
-- room_id defaults to 'main' so the company's single room works without
-- a rooms table; future-proofs for adding more rooms later without
-- breaking the constraint shape.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.room_bookings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id text NOT NULL DEFAULT 'main',
  title text NOT NULL,
  notes text,
  attendees text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  booked_by_employee_id text REFERENCES public.employees(id) ON DELETE SET NULL,
  booked_by_name text NOT NULL,
  cancelled_at timestamptz,
  cancelled_by_employee_id text REFERENCES public.employees(id) ON DELETE SET NULL,
  cancelled_by_name text,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_bookings_time_range_valid CHECK (ends_at > starts_at),
  CONSTRAINT room_bookings_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (cancelled_at IS NULL)
);

CREATE INDEX room_bookings_starts_at_idx ON public.room_bookings (starts_at);
CREATE INDEX room_bookings_room_active_starts_idx
  ON public.room_bookings (room_id, starts_at)
  WHERE cancelled_at IS NULL;

ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
-- No policies → service_role only (app uses supabaseAdmin for all writes)
