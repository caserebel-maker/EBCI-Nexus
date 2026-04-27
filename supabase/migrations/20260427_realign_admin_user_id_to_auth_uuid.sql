-- Realign ปอนด์'s legacy Prisma CUID `User.id` to her Supabase auth.users UUID.
--
-- Background:
--   The first admin user was created in the Prisma era with id default
--   `cuid()` → `cm6ml6x8n000008l43y9z3y9z`. After migrating to Supabase
--   auth, every other user got their `User.id` set to the auth user
--   UUID directly, but ปอนด์'s row was never realigned.
--
-- Symptom:
--   `getCurrentPermissions()` in `src/lib/permissions-server.ts` looks
--   up the User row via `.eq('id', session.id)` — where session.id is
--   the auth.users UUID. For ปอนด์, that lookup returned no row, so
--   she fell into EMPTY_PERMISSIONS and didn't see the salary-slips
--   card on employee profile pages despite `can_manage_payroll = true`
--   being set on her actual row.
--
--   Same class of bug as the notifications.recipient_user_id fix in
--   commit e15ec5a (Apr 22) — both share the cuid-vs-UUID divergence.
--
-- Safety:
--   Verified all 7 FKs pointing to `User.id` (leave_records.approved_by,
--   employee_audit_log.actor_user_id, leave_balances.last_adjusted_by,
--   employee_contracts.uploaded_by/deleted_by, salary_slips.uploaded_by/
--   deleted_by) had ZERO rows referencing the cuid before this update —
--   she hadn't approved a leave or uploaded a contract/slip yet. So a
--   straight UPDATE on the PK is safe (no cascade required).
--
--   Idempotent: subsequent runs hit zero rows.

UPDATE "User"
SET id = '9dc14c59-d2a3-4804-abf1-14417507f0dc'
WHERE id = 'cm6ml6x8n000008l43y9z3y9z';

-- Sanity comment for future reviewers:
--   The auth UUID 9dc14c59... is ปอนด์'s row in auth.users (email
--   tumyen@gmail.com). It also matches employees.user_id for her row,
--   so the chain (auth → employees → User) is now uniform.
