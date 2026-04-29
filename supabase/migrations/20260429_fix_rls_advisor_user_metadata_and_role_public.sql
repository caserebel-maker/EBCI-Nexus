-- =====================================================================
-- Migration: fix Supabase advisor findings
--   1. Drop 8 RLS policies that reference auth.jwt -> user_metadata.
--      user_metadata is end-user editable via supabase.auth.updateUser,
--      so any policy gating on it can be bypassed by an authenticated
--      attacker. App writes go through service_role (RLS bypass) so
--      dropping these leaves tables effectively service-role-only.
--   2. Re-create remaining policies with explicit role targeting
--      (TO anon, authenticated) instead of TO public.
-- =====================================================================

-- ---------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;

DROP POLICY IF EXISTS "Public announcements are viewable by everyone" ON public.announcements;
CREATE POLICY "announcements_published_public_read"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING ("publishStatus" = 'published');

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_authenticated_read"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------
-- applicants — keep anon INSERT for careers form, keep deny-all SELECT
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit an application" ON public.applicants;
CREATE POLICY "applicants_anon_insert"
  ON public.applicants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Applicants are private" ON public.applicants;
CREATE POLICY "applicants_no_direct_select"
  ON public.applicants
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------------
-- applicant_educations / applicant_experiences — keep deny-all
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Applicant details are private" ON public.applicant_educations;
CREATE POLICY "applicant_educations_no_direct_access"
  ON public.applicant_educations
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Experience details are private" ON public.applicant_experiences;
CREATE POLICY "applicant_experiences_no_direct_access"
  ON public.applicant_experiences
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------
-- employee_audit_log — keep User-table lookup, tighten role
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_log_no_write" ON public.employee_audit_log;
CREATE POLICY "audit_log_no_direct_write"
  ON public.employee_audit_log
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_log_read_hr_staff" ON public.employee_audit_log;
CREATE POLICY "audit_log_read_hr_staff"
  ON public.employee_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND u.can_view_audit_log = true
    )
  );

-- ---------------------------------------------------------------------
-- employee_contracts — keep User-table lookup, tighten role
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "hr_can_modify_contracts" ON public.employee_contracts;
CREATE POLICY "employee_contracts_hr_modify"
  ON public.employee_contracts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND (u.role = 'hr_admin' OR u.can_edit_employees = true OR u.can_manage_system = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND (u.role = 'hr_admin' OR u.can_edit_employees = true OR u.can_manage_system = true)
    )
  );

DROP POLICY IF EXISTS "hr_can_select_contracts" ON public.employee_contracts;
CREATE POLICY "employee_contracts_hr_select"
  ON public.employee_contracts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND (u.role = 'hr_admin' OR u.can_edit_employees = true OR u.can_manage_system = true)
    )
  );

-- ---------------------------------------------------------------------
-- employees — drop ALL user_metadata-based policies
-- "Employees are private" (deny-all) re-created as the only policy
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "employee_self" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "hr_admin_all" ON public.employees;
DROP POLICY IF EXISTS "manager_department" ON public.employees;

DROP POLICY IF EXISTS "Employees are private" ON public.employees;
CREATE POLICY "employees_no_direct_access"
  ON public.employees
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------
-- leave_approvals — drop user_metadata-based policy
-- No remaining policies → effective deny-all (service_role bypass)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "leave_approvals_select" ON public.leave_approvals;

-- ---------------------------------------------------------------------
-- salary_slips — keep User-table lookup, tighten role
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_managers_can_modify" ON public.salary_slips;
CREATE POLICY "salary_slips_payroll_modify"
  ON public.salary_slips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND u.can_manage_payroll = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND u.can_manage_payroll = true
    )
  );

DROP POLICY IF EXISTS "payroll_managers_can_select" ON public.salary_slips;
CREATE POLICY "salary_slips_payroll_or_self_select"
  ON public.salary_slips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "User" u
      WHERE u.id = (auth.uid())::text
        AND u.can_manage_payroll = true
    )
    OR EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = salary_slips.employee_id
        AND e.user_id = (auth.uid())::text
    )
  );
