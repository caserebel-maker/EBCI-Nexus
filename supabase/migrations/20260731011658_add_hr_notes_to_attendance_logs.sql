-- Allow HR to record short per-employee, per-day attendance notes.
-- Used by /hradmin/attendance and included in attendance CSV exports.

ALTER TABLE public.attendance_logs
    ADD COLUMN IF NOT EXISTS hr_note TEXT,
    ADD COLUMN IF NOT EXISTS hr_note_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hr_note_updated_by TEXT;

COMMENT ON COLUMN public.attendance_logs.hr_note IS
    'Short HR-entered note for the employee attendance day, exported in HR attendance CSV.';

COMMENT ON COLUMN public.attendance_logs.hr_note_updated_at IS
    'Timestamp of the latest HR note edit.';

COMMENT ON COLUMN public.attendance_logs.hr_note_updated_by IS
    'Application session/User id of the HR staff member who last edited hr_note.';
