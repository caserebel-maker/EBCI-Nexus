-- HR policy decision (Apr 27 2026): ลาพ่อแม่เสียชีวิต ให้ตั้งแต่ day 1
--
-- Rationale: ลาพ่อแม่เสียชีวิต เป็นเหตุการณ์ฉุกเฉินที่
-- พนักงานควบคุมไม่ได้ ต่างจากลาแต่งงาน (วางแผนล่วงหน้าได้)
-- abuse risk ใกล้ 0 เพราะมีใบมรณบัตรเป็น attachment กำกับ
--
-- 5 วัน/ปี — ครอบคลุมเดินทาง + งานศพ
-- (มาตรฐานบริษัทไทยส่วนใหญ่ 3-7 วัน, เลือก 5 เป็นจุดกลาง)
--
-- ลาแต่งงานคงไว้เดิม (ผ่านโปรก่อนค่อยให้) — แยกตัดสินใจอีกที
-- ถ้า HR อยากเปลี่ยน

-- 1) Document the new policy on the type itself so future seeding
--    code can pick up the default.
UPDATE leave_types
SET default_days_per_year = 5,
    description = 'ลาพ่อแม่เสียชีวิต — ให้ตั้งแต่ day 1 ไม่ต้องรอผ่านโปร · ต้องแนบใบมรณบัตร'
WHERE id = 'bereavement';

-- 2) Backfill balance rows for the 53 active employees so the entry
--    appears as 5/5 ทันทีในหน้า /portal/leave (ไม่ใช่ 0/0 อีกต่อไป)
INSERT INTO leave_balances (
    employee_id, leave_type_id, year,
    total_days, used_days, pending_days, notes
)
SELECT
    e.id,
    'bereavement',
    2026,
    5,
    0,
    0,
    'นโยบาย Apr 2026: ลาพ่อแม่เสียชีวิต ให้ตั้งแต่ day 1 ไม่ต้องรอผ่านโปร'
FROM employees e
WHERE e.status = 'active'
ON CONFLICT DO NOTHING;
