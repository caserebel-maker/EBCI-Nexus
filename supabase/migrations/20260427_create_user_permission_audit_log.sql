-- Audit log for permission-flag changes on the User table.
--
-- Why a dedicated table (vs employee_audit_log): different concern.
-- employee_audit_log captures business-data changes (department, salary,
-- leave_balance), gated by HR Manager preset. Permission changes are
-- super-admin territory — who can do WHAT in the system. Mixing them
-- forces every audit reader to filter, and complicates retention policy.
--
-- Each row is a full before/after snapshot, not a diff, so the editor
-- can render "what changed" without needing to compute deltas from
-- adjacent rows. preset_after is denormalized for quick filtering
-- ("show me everyone promoted to super_admin in the last 30 days").

CREATE TABLE IF NOT EXISTS public.user_permission_audit_log (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id        text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    changed_by_user_id    text NOT NULL REFERENCES "User"(id) ON DELETE SET NULL,
    changed_at            timestamptz NOT NULL DEFAULT now(),
    permissions_before    jsonb NOT NULL,
    permissions_after     jsonb NOT NULL,
    preset_before         text,    -- 'super_admin' | 'hr_manager' | ... | 'custom' | NULL on first edit
    preset_after          text,
    role_before           text,
    role_after            text,
    note                  text     -- optional reason from the editor
);

CREATE INDEX IF NOT EXISTS idx_perm_audit_target  ON public.user_permission_audit_log(target_user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_audit_actor   ON public.user_permission_audit_log(changed_by_user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_audit_preset  ON public.user_permission_audit_log(preset_after, changed_at DESC);

COMMENT ON TABLE  public.user_permission_audit_log IS 'Append-only history of permission flag changes per User. Read by /hradmin/settings/permissions editor.';
COMMENT ON COLUMN public.user_permission_audit_log.permissions_before IS 'Full snapshot of all can_* flags BEFORE the edit';
COMMENT ON COLUMN public.user_permission_audit_log.permissions_after  IS 'Full snapshot of all can_* flags AFTER the edit';
COMMENT ON COLUMN public.user_permission_audit_log.preset_after IS 'Resolved preset name after the edit (super_admin/hr_manager/payroll_manager/executive/employee/custom)';
