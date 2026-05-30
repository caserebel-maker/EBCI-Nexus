-- Add check-out columns to attendance_logs table to support checkout tracking for cards and mobile check-ins.
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS card_checkout_time timestamp without time zone;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS mobile_checkout_time timestamp with time zone;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS official_clock_out timestamp with time zone;
