-- ============================================
-- Seed: จิม (MD) + มด (HR) permission presets
-- Run on: 2026-04-20+
-- Apply via Supabase SQL Editor, or psql with $DATABASE_URL
-- ============================================
--
-- Prerequisites:
--   1. Migration from org-authority-spec §4.1 already applied ✅ (ปอนด์ session, Apr 20 afternoon)
--   2. "User" rows for jim + mod must exist. If not, create them via the signup/admin flow
--      OR adapt the UPDATE below to INSERT with the schema your User table uses.
--      Run `SELECT id, email, name, role FROM "User" ORDER BY email;` to confirm they exist.
--
-- Presets match lib/permission-presets.ts:
--   executive  = view all + view limits + approve_leave (no edit, no manage)
--   hr_manager = view all + edit employees + view limits + approve_leave (no edit_limits, no manage)

BEGIN;

-- จิม (MD) — Executive Viewer
UPDATE "User"
SET can_view_all_employees   = true,
    can_edit_employees       = false,
    can_view_approval_limits = true,
    can_edit_approval_limits = false,
    can_approve_leave        = true,
    can_manage_system        = false
WHERE email = 'jim@ebci.co.th';

-- มด (HR) — HR Manager
UPDATE "User"
SET can_view_all_employees   = true,
    can_edit_employees       = true,
    can_view_approval_limits = true,
    can_edit_approval_limits = false,
    can_approve_leave        = true,
    can_manage_system        = false
WHERE email = 'mod@ebci.co.th';

-- Verify
SELECT email,
       can_view_all_employees   AS view_all,
       can_edit_employees       AS edit_emp,
       can_view_approval_limits AS view_lim,
       can_edit_approval_limits AS edit_lim,
       can_approve_leave        AS appr_leave,
       can_manage_system        AS manage
FROM "User"
WHERE email IN ('jim@ebci.co.th', 'mod@ebci.co.th')
ORDER BY email;

-- If the output looks right, COMMIT. If not, ROLLBACK.
COMMIT;
-- ROLLBACK;
