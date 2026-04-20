-- ============================================
-- Seed: mock approver data for Tab 2 (อำนาจอนุมัติ) demo
-- Applied: 2026-04-20 via Supabase MCP
-- ============================================
--
-- Reality: before this seed, ALL 55 employees had is_approver=false,
-- approval_scopes={}, approval_limit_thb=NULL.
-- This seed populates 3 real employees so Tab 2 has something to render.
-- HR should replace these values with real policy numbers before launch.
--
-- Scope codes (used in approval_scopes text[]):
--   'leave'  — การลา
--   'ot'     — OT
--   'budget' — เบิกเงิน (tier from approval_limit_thb: ≤30k small / ≤100k medium / ≤500k large / >500k unlimited)
--   'hr'     — HR-specific actions

UPDATE employees SET
    is_approver        = true,
    approval_scopes    = ARRAY['leave','ot','budget','hr']::text[],
    approval_limit_thb = 1000000
WHERE id = '35048dec-c9fe-4c57-9527-5c5db1cbe60b';  -- จิม (ฐานวัฒน์) — รองกรรมการผู้จัดการ, level 4

UPDATE employees SET
    is_approver        = true,
    approval_scopes    = ARRAY['leave','hr']::text[],
    approval_limit_thb = NULL
WHERE id = '23a770e5-f5bf-4933-83ab-c694f69496d6';  -- มด (อาทิตย์) — หัวหน้าแผนกบริหารงานบุคคล, level 3

UPDATE employees SET
    is_approver        = true,
    approval_scopes    = ARRAY['leave','ot','budget']::text[],
    approval_limit_thb = 50000
WHERE id = '7265d04d-8194-4090-98e8-2dca101432a1';  -- ปุ๊ (พิทยะรัฐ) — ผู้ช่วยผู้จัดการ IT, level 3

-- Verify (should show 3 rows)
SELECT nickname, position, approval_level, is_approver, approval_scopes, approval_limit_thb
FROM employees
WHERE is_approver = true
ORDER BY approval_level DESC;

-- To roll back: UPDATE employees SET is_approver=false, approval_scopes='{}', approval_limit_thb=NULL
-- WHERE id IN (...);
