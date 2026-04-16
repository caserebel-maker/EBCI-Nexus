-- ============================================================
-- Migration: add_employee_columns
-- Adds columns used by the app but missing from original schema
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── Personal info (stored directly on employees, not via applicants) ──────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS nickname      TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ── Photo storage ─────────────────────────────────────────────────────────────
-- photo_path : relative path inside Supabase Storage bucket "employee-photos"
-- photo_url  : full public URL (set after upload to public bucket)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_url  TEXT;

-- ── Employment details ────────────────────────────────────────────────────────
-- approval_level : 1 (staff) → 4 (executive), used for leave approval chain
-- quit_date      : date employee left (when status = 'inactive')
-- quit_reason    : resigned / retired / contract_ended / other
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS approval_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quit_date      DATE,
  ADD COLUMN IF NOT EXISTS quit_reason    TEXT;

-- ── Supervisor relationship ───────────────────────────────────────────────────
-- supervisor_id : self-referencing FK to employees.id
-- Note: the original Prisma schema used manager_id — supervisor_id is the new
--       canonical column used by the portal and HR dashboard.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS supervisor_id TEXT REFERENCES employees(id) ON DELETE SET NULL;

-- ── Index for supervisor lookups ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id ON employees(supervisor_id);

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Run this after migration to confirm all columns exist:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'employees'
-- ORDER BY ordinal_position;
