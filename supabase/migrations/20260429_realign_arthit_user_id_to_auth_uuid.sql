-- Realign มด's `User.id` to her Supabase `auth.users.id` UUID.
--
-- Background:
--   Same divergence pattern as ปอนด์ (Apr 27 fix, commit 336f211 →
--   migration 20260427_realign_admin_user_id_to_auth_uuid.sql), and
--   the same root cause as the notifications.recipient_user_id bug
--   (Apr 22, commit e15ec5a):
--
--     auth.users.id (= session.id at runtime) = 48d4b74a-38e8-4106-a5da-8017e55fd6d8
--     employees.user_id (correctly set)       = 48d4b74a-…  (matches)
--     User.id (legacy, divergent)             = 23a770e5-f5bf-4933-83ab-c694f69496d6
--
--   getCurrentPermissions() in src/lib/permissions-server.ts looks up
--   the User row via .eq('id', session.id). For มด that lookup
--   returned no row, dropping her into EMPTY_PERMISSIONS — so her
--   audit-log access, payroll exclusion, etc. were all stuck at
--   false regardless of what the actual row said.
--
--   Symptom in the wild: มด is one of 7 beta testers with
--   role='hr_admin'. She could reach /hradmin/* (the layout gate
--   uses session.role from auth metadata, which works) but couldn't
--   see /hradmin/settings/permissions, /hradmin/settings/audit,
--   the salary card, etc. — every per-flag gate evaluated to false.
--
-- Safety:
--   Pre-flight verified 2 FK rows pointed at the old User.id:
--     - leave_balances.last_adjusted_by × 1
--     - user_permission_audit_log.target_user_id × 1
--   Both updated in this same transaction. The other 7 FKs to
--   "User"(id) (leave_records.approved_by, employee_audit_log,
--   employee_contracts × 2, salary_slips × 2,
--   user_permission_audit_log.changed_by_user_id) had zero refs.
--
--   The realign is done as insert-then-delete (with a temp username
--   to dodge the User_username_key unique constraint mid-flight)
--   rather than a straight UPDATE on the PK, because most FKs to
--   "User"(id) are not declared `ON UPDATE CASCADE`.

BEGIN;

-- 1. Clone the existing row at the new (correct) id with a temp username.
INSERT INTO "User" (id, username, password, role, name, biometric_id, fingerprint_data, "createdAt", "updatedAt",
  can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits,
  can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log)
SELECT
  '48d4b74a-38e8-4106-a5da-8017e55fd6d8',
  '__arthit_tmp__',
  password, role, name, biometric_id, fingerprint_data, "createdAt", "updatedAt",
  can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits,
  can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log
FROM "User" WHERE id = '23a770e5-f5bf-4933-83ab-c694f69496d6';

-- 2. Repoint the 2 referencing rows to the new id.
UPDATE leave_balances
   SET last_adjusted_by = '48d4b74a-38e8-4106-a5da-8017e55fd6d8'
 WHERE last_adjusted_by = '23a770e5-f5bf-4933-83ab-c694f69496d6';

UPDATE user_permission_audit_log
   SET target_user_id   = '48d4b74a-38e8-4106-a5da-8017e55fd6d8'
 WHERE target_user_id   = '23a770e5-f5bf-4933-83ab-c694f69496d6';

-- 3. Drop the legacy row (FK refs cleared, username now free).
DELETE FROM "User" WHERE id = '23a770e5-f5bf-4933-83ab-c694f69496d6';

-- 4. Restore the canonical username on the new row.
UPDATE "User"
   SET username = 'arthit'
 WHERE id = '48d4b74a-38e8-4106-a5da-8017e55fd6d8';

COMMIT;

-- Note: this migration is NOT idempotent — re-running will fail step 1
-- (insert at the same id again will violate User_pkey). That's
-- intentional. Migrations apply once; if the row was already realigned
-- this script being re-run is itself a signal that something's off.
