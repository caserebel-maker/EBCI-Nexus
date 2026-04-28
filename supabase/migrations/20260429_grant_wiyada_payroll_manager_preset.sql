-- Apply the Payroll Manager preset to wiyada (ปุ๋ย, แผนกบัญชี).
--
-- Background:
--   wiyada was created via Supabase MCP on Apr 28 (NEXT.md §3.3) but
--   the seed only set up the auth user + employees row + User row at
--   the matching auth UUID. The User row landed with the default
--   employee preset (every flag false), even though NEXT.md §4 lists
--   her as a Payroll Manager. The morning sweep (Apr 29) caught it
--   when verifying that the §3.4 e2e bulk-upload test would actually
--   work — without can_manage_payroll = true, the sidebar shortcut
--   to /hradmin/payroll/bulk doesn't render and she can't reach the
--   page even by typing the URL.
--
-- Effect:
--   Sets her flags to the canonical `payroll_manager` preset values
--   from src/lib/permission-presets.ts. Inserts an audit row crediting
--   admin (ปอนด์, 9dc14c59-…) as the actor with a reason — same shape
--   the in-app /hradmin/settings/permissions editor would produce, so
--   the change shows up cleanly on /hradmin/settings/audit.

UPDATE "User"
   SET can_view_all_employees   = false,
       can_edit_employees       = false,
       can_view_approval_limits = false,
       can_edit_approval_limits = false,
       can_approve_leave        = false,
       can_manage_system        = false,
       can_manage_payroll       = true,
       can_view_audit_log       = false,
       "updatedAt"              = now()
 WHERE id = 'b065b9cc-ad18-4df2-a694-a603c5a4005e'
   AND can_manage_payroll = false;  -- idempotent: skip if already granted

INSERT INTO user_permission_audit_log (
    target_user_id, changed_by_user_id,
    permissions_before, permissions_after,
    preset_before, preset_after,
    role_before, role_after,
    note
)
SELECT
    'b065b9cc-ad18-4df2-a694-a603c5a4005e',
    '9dc14c59-d2a3-4804-abf1-14417507f0dc',
    '{"can_view_all_employees":false,"can_edit_employees":false,"can_view_approval_limits":false,"can_edit_approval_limits":false,"can_approve_leave":false,"can_manage_system":false,"can_manage_payroll":false,"can_view_audit_log":false}'::jsonb,
    '{"can_view_all_employees":false,"can_edit_employees":false,"can_view_approval_limits":false,"can_edit_approval_limits":false,"can_approve_leave":false,"can_manage_system":false,"can_manage_payroll":true,"can_view_audit_log":false}'::jsonb,
    'employee', 'payroll_manager',
    'employee', 'employee',
    'Pre-beta sync: wiyada was created with no payroll flag — apply payroll_manager preset so /hradmin/payroll/bulk is reachable for the e2e test (NEXT.md §3.4)'
WHERE NOT EXISTS (
    -- idempotent: don't re-insert if a fixup audit row was already written
    SELECT 1 FROM user_permission_audit_log
    WHERE target_user_id    = 'b065b9cc-ad18-4df2-a694-a603c5a4005e'
      AND preset_after      = 'payroll_manager'
      AND note LIKE 'Pre-beta sync%'
);
