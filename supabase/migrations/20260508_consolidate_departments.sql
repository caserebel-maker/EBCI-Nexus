-- 2026-05-08 — Consolidate department labels per ม๊อด's beta feedback.
--
-- Updates employees.department in place so existing rows match the new
-- canonical list in src/config/departments.ts. Run this BEFORE the
-- corresponding code deploy lands, OR within the same release.
--
-- Idempotent: each UPDATE filters on the OLD value so re-running this
-- migration after the values are already consolidated is a no-op.
--
-- No data loss — every employee keeps their row, only the department
-- label changes.

BEGIN;

-- ── 1. Merge: บัญชี + การเงิน → บัญชีและการเงิน ────────────────────────
UPDATE employees
SET department = 'แผนกบัญชีและการเงิน',
    updated_at = NOW()
WHERE department IN ('แผนกบัญชี', 'แผนกการเงิน');

-- ── 2. Merge: บริหารงานบุคคล + ธุรการ-แม่บ้าน → HR & Purchasing ──────
UPDATE employees
SET department = 'Human Resources and Purchasing',
    updated_at = NOW()
WHERE department IN ('แผนกบริหารงานบุคคล', 'แผนกธุรการ - แม่บ้าน');

-- ── 3. Merge: รับ-ส่ง เอกสาร → เอกสารนำเข้า ────────────────────────
UPDATE employees
SET department = 'แผนกเอกสารนำเข้า',
    updated_at = NOW()
WHERE department = 'แผนกรับ - ส่ง เอกสาร';

-- ── 4. Rename: IT → MIS ────────────────────────────────────────────────
UPDATE employees
SET department = 'แผนก MIS',
    updated_at = NOW()
WHERE department = 'แผนก IT';

-- ── 5. Rename: หน่วยขนส่ง → LSC logistics and supply chain ─────────────
UPDATE employees
SET department = 'LSC logistics and supply chain',
    updated_at = NOW()
WHERE department = 'หน่วยขนส่ง';

-- ── 6. Remove obsolete projects: JOHNSON + เฉพาะกิจ → Unassigned ──────
-- HR will re-assign these employees to their real teams via the HR
-- admin profile editor. Until they do, they show up under "Unassigned"
-- which is the intended interim state.
UPDATE employees
SET department = 'Unassigned',
    updated_at = NOW()
WHERE department IN ('โครงการJOHNSON', 'โครงการเฉพาะกิจ');

COMMIT;

-- ── Sanity check: should return zero rows after migration ──────────────
-- Run separately if you want to verify nothing was missed:
--   SELECT department, COUNT(*) FROM employees
--   WHERE department IN (
--     'แผนกบัญชี', 'แผนกการเงิน', 'แผนกบริหารงานบุคคล',
--     'แผนกธุรการ - แม่บ้าน', 'แผนกรับ - ส่ง เอกสาร', 'แผนก IT',
--     'หน่วยขนส่ง', 'โครงการJOHNSON', 'โครงการเฉพาะกิจ'
--   )
--   GROUP BY department;
