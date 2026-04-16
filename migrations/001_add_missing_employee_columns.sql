-- ============================================================
-- Migration: 001_add_missing_employee_columns
-- Verified against live Supabase schema on 2026-04-16
-- ============================================================
--
-- Columns already in DB (no action needed):
--   applicant_id, approval_level, created_at, date_of_birth,
--   department, email, employee_code, employment_type, end_date,
--   first_name_en, first_name_th, gender, id, last_name_en,
--   last_name_th, manager_id, nickname, phone, photo_path,
--   photo_url, position, probation_end_date, quit_date,
--   start_date, status, supervisor_id, title, updated_at, user_id
--
-- Missing column found by code analysis:
--   quit_reason  — used in [id]/actions.ts updateEmployee payload
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS quit_reason TEXT;

-- ── Verify after running ──────────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'employees'
-- ORDER BY column_name;
