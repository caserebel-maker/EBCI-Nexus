-- 20260424_enable_rls_employee_audit_log.sql
--
-- Enable RLS on employee_audit_log so anon / authenticated clients
-- can't read or modify rows directly. Service role (used by every
-- server-side action that writes audit entries) bypasses RLS by design,
-- so existing audit-line inserts keep working without code changes.
--
-- Read access is granted only to HR staff via a new User-table flag
-- `can_view_audit_log`. The flag is auto-set true for current
-- super-admins so the first audit-log viewer page doesn't 403 on
-- people who have always had access.
--
-- Write access stays exclusive to service_role. Audit rows must be
-- machine-generated through the server actions; no client should be
-- able to forge entries even if it has the anon key.

ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."User"
    ADD COLUMN IF NOT EXISTS can_view_audit_log boolean NOT NULL DEFAULT false;

UPDATE public."User"
   SET can_view_audit_log = true
 WHERE role = 'hr_admin'
    OR can_manage_system = true;

DROP POLICY IF EXISTS audit_log_read_hr_staff ON public.employee_audit_log;
DROP POLICY IF EXISTS audit_log_no_write       ON public.employee_audit_log;

CREATE POLICY audit_log_read_hr_staff
    ON public.employee_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = auth.uid()::text
              AND u.can_view_audit_log = true
        )
    );

CREATE POLICY audit_log_no_write
    ON public.employee_audit_log
    FOR ALL
    USING (false)
    WITH CHECK (false);
