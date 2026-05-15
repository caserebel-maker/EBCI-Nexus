-- Set default leave quotas for the 7 categories that previously had
-- NULL or 0 days, per Thai Labor Protection Act 2541 (+2562 amendments)
-- and standard EBCI company policy.
--
-- Three new wrinkles vs the existing schema:
--
-- 1. Lifetime leaves — อุปสมบท / สมรส / เกณฑ์ทหาร are once-per-employee
--    benefits, not annual quotas. Adding `is_lifetime BOOLEAN` so the UI
--    can show "X วันตลอดอายุงาน" instead of "X วัน/ปี", and so any
--    future year-rollover cron knows to skip these rows.
--
-- 2. Some types had `is_unlimited=true` as a placeholder. Now that we
--    have actual day caps, flip those to false so the balance enforcer
--    actually counts down.
--
-- 3. Auto-seed function used to skip rows where default_days_per_year
--    IS NULL — that's why Mod saw 0/0 in the edit-employee UI for
--    these categories. After this migration, every active employee
--    gets a backfilled row for every category with a default.

-- ─── 1. Schema: add is_lifetime ───────────────────────────────────────
ALTER TABLE public.leave_types
    ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leave_types.is_lifetime IS
    'true = once-per-employee benefit (อุปสมบท, สมรส, เกณฑ์ทหาร) — UI shows "ตลอดอายุงาน", year-rollover skips. false = annual quota (resets each year).';

-- ─── 2. Update the 6 leave types per Thai labor law + EBCI policy ─────
-- ลาทำหมัน — ม.33 ไม่จำกัดตามใบรับรองแพทย์ — ใส่ 7 เป็น soft cap
UPDATE leave_types SET default_days_per_year = 7,  is_unlimited = false, is_lifetime = false
    WHERE id = 'sterilization';

-- ลารับราชการทหาร — ม.35 60 วัน/ปี
UPDATE leave_types SET default_days_per_year = 60, is_unlimited = false, is_lifetime = false
    WHERE id = 'military_service';

-- ลาเกณฑ์ทหาร — เกิดครั้งเดียวในชีวิต (อายุ 21) ใส่ 5 lifetime
UPDATE leave_types SET default_days_per_year = 5,  is_unlimited = false, is_lifetime = true
    WHERE id = 'military_draft';

-- ลาเพื่อพัฒนาความรู้ — ม.36 (ไม่กำหนด) — company default 7 วัน/ปี
UPDATE leave_types SET default_days_per_year = 7,  is_unlimited = false, is_lifetime = false
    WHERE id = 'training';

-- ลาอุปสมบท — ไม่มีในกฎหมาย, company benefit 15 วัน lifetime
UPDATE leave_types SET default_days_per_year = 15, is_unlimited = false, is_lifetime = true
    WHERE id = 'ordination';

-- ลาสมรส — ไม่มีในกฎหมาย, company benefit 3 วัน lifetime
UPDATE leave_types SET default_days_per_year = 3,  is_unlimited = false, is_lifetime = true
    WHERE id = 'marriage';

-- ─── 3. Update auto-seed function: handle lifetime + use start_year ───
-- For lifetime types, pin the balance to the employee's start year so
-- future year rollovers don't re-seed and double-credit.
CREATE OR REPLACE FUNCTION seed_leave_balances_for_employee()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
BEGIN
    IF NEW.status IS DISTINCT FROM 'active' THEN
        RETURN NEW;
    END IF;

    v_year := COALESCE(EXTRACT(YEAR FROM NEW.start_date)::INTEGER,
                       EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

    INSERT INTO leave_balances (
        employee_id, leave_type_id, year,
        total_days, used_days, pending_days,
        notes
    )
    SELECT
        NEW.id,
        lt.id,
        v_year,
        lt.default_days_per_year,
        0,
        0,
        CASE WHEN lt.is_lifetime
             THEN 'Auto-seeded (' || lt.name_th || ' — lifetime, ไม่ reset รายปี)'
             ELSE 'Auto-seeded on employee creation (' || lt.name_th || ')'
        END
    FROM leave_types lt
    WHERE lt.is_active = true
      AND lt.default_days_per_year IS NOT NULL
      AND lt.default_days_per_year > 0
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. Backfill existing employees: 6 categories × all active staff ──
-- Two passes: yearly types use current year, lifetime types use the
-- employee's start year (so they never re-seed).
--
-- ON CONFLICT DO UPDATE only when the existing row is unmanaged AND
-- has no quota — avoids stomping HR's manual adjustments.

-- Pass 1: yearly types (sterilization, military_service, training)
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, pending_days, notes)
SELECT
    e.id,
    lt.id,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    lt.default_days_per_year,
    0, 0,
    'Backfilled per Thai labor law defaults (yearly)'
FROM employees e
CROSS JOIN leave_types lt
WHERE e.status = 'active'
  AND lt.id IN ('sterilization', 'military_service', 'training')
  AND lt.default_days_per_year IS NOT NULL
ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE
SET total_days = EXCLUDED.total_days,
    notes = EXCLUDED.notes,
    updated_at = now()
WHERE leave_balances.is_manually_adjusted = false
  AND (leave_balances.total_days IS NULL OR leave_balances.total_days = 0);

-- Pass 2: lifetime types (military_draft, ordination, marriage)
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, pending_days, notes)
SELECT
    e.id,
    lt.id,
    COALESCE(EXTRACT(YEAR FROM e.start_date)::INTEGER,
             EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
    lt.default_days_per_year,
    0, 0,
    'Backfilled per Thai labor law defaults (lifetime — ไม่ reset รายปี)'
FROM employees e
CROSS JOIN leave_types lt
WHERE e.status = 'active'
  AND lt.id IN ('military_draft', 'ordination', 'marriage')
  AND lt.default_days_per_year IS NOT NULL
ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE
SET total_days = EXCLUDED.total_days,
    notes = EXCLUDED.notes,
    updated_at = now()
WHERE leave_balances.is_manually_adjusted = false
  AND (leave_balances.total_days IS NULL OR leave_balances.total_days = 0);

-- ─── 5. Normalize sterilization rows still at the old default of 3 ────
-- Rows seeded before this migration (when default was 3) wouldn't be
-- caught by the backfill's "total = 0 OR NULL" guard. Bump them to
-- the new 7 day default — but only when not manually adjusted.
UPDATE leave_balances
SET total_days = 7,
    notes = COALESCE(notes, '') || ' · normalized to 7 (Thai labor default)',
    updated_at = now()
WHERE leave_type_id = 'sterilization'
  AND total_days = 3
  AND is_manually_adjusted = false;
