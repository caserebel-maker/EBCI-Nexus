-- ============================================
-- Seed: mock users for จิม (MD, Executive Viewer) + มด (HR, HR Manager)
-- Applied: 2026-04-20 via Supabase MCP
-- ============================================
--
-- Reality notes (differed from org-authority-spec.md §4.2):
--   - "User" table has no `email` column; primary identifier is `username` (text)
--   - "User" has composite PK on `id` (text, cuid-style for admin)
--   - Before this seed, only 1 row existed: username='admin', role='hr_admin'
--     (ปอนด์ — Super Admin preset auto-migrated by earlier migration)
--
-- This file inserts placeholder rows. username/password/display-name are mocks
-- to unblock Phase 2 UI work. Replace when real credentials are issued.

INSERT INTO "User" (id, username, password, role, name, "createdAt", "updatedAt",
    can_view_all_employees, can_edit_employees,
    can_view_approval_limits, can_edit_approval_limits,
    can_approve_leave, can_manage_system)
VALUES
    -- จิม (MD) — Executive Viewer
    ('mock_jim', 'jim', '0000', 'manager', 'จิม (MD) — mock', NOW(), NOW(),
        true, false, true, false, true, false),

    -- มด (HR) — HR Manager
    ('mock_mod', 'mod', '0000', 'manager', 'มด (HR) — mock', NOW(), NOW(),
        true, true, true, false, true, false)

ON CONFLICT (id) DO UPDATE SET
    can_view_all_employees   = EXCLUDED.can_view_all_employees,
    can_edit_employees       = EXCLUDED.can_edit_employees,
    can_view_approval_limits = EXCLUDED.can_view_approval_limits,
    can_edit_approval_limits = EXCLUDED.can_edit_approval_limits,
    can_approve_leave        = EXCLUDED.can_approve_leave,
    can_manage_system        = EXCLUDED.can_manage_system,
    "updatedAt"              = NOW();

-- Verify: expect 3 rows (admin + mock_jim + mock_mod)
SELECT id, username, name, role,
       can_view_all_employees   AS view_all,
       can_edit_employees       AS edit_emp,
       can_view_approval_limits AS view_lim,
       can_edit_approval_limits AS edit_lim,
       can_approve_leave        AS appr_leave,
       can_manage_system        AS manage
FROM "User"
WHERE id IN ('mock_jim', 'mock_mod') OR role = 'hr_admin'
ORDER BY id;
