-- ───────────────────────────────────────────────────────────────────
-- Permission flag: separate "manage payroll" from generic HR access.
-- HR role alone is NOT enough to view/upload salary slips — we
-- explicitly grant per-user via this flag. Defaults to false so the
-- secure default is "no access" (allow-list pattern).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS can_manage_payroll BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "User".can_manage_payroll IS
'Allow-list flag for salary-slip access. Required to upload or view
others'' slips; an employee can always view their own regardless of
this flag. Decoupled from `role` so an HR Manager can hold full HR
access without seeing payroll data.';

-- ───────────────────────────────────────────────────────────────────
-- Salary slips: one signed PDF per (employee, year, month). Soft
-- delete only — Thai labour & tax law requires payroll records kept
-- for ≥ 7 years, and PDPA requires the audit trail of who viewed
-- what to survive after the row is "deleted" by HR.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,

    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

    file_path TEXT NOT NULL,
    file_name TEXT NULL,
    file_size INTEGER NULL,
    mime_type TEXT NULL,

    notes TEXT NULL,

    uploaded_by TEXT NULL REFERENCES "User"(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    deleted_at TIMESTAMPTZ NULL,
    deleted_by TEXT NULL REFERENCES "User"(id),
    deleted_reason TEXT NULL
);

-- One ACTIVE slip per (employee_id, year, month). Re-uploading
-- soft-deletes the old row first so this index lets the new one in.
CREATE UNIQUE INDEX IF NOT EXISTS uq_salary_slips_employee_period
    ON salary_slips(employee_id, year, month)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_salary_slips_employee
    ON salary_slips(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_salary_slips_period
    ON salary_slips(year DESC, month DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE salary_slips IS
'Monthly payroll slips uploaded by accounting/HR-payroll. One active
slip per (employee_id, year, month). Soft-delete only — legal
retention 7 years for tax records.';

-- ───────────────────────────────────────────────────────────────────
-- RLS — defense in depth. Server actions use service role and bypass
-- this entirely, but a future client-side query would still be
-- gated by these policies.
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_managers_can_select" ON salary_slips;
CREATE POLICY "payroll_managers_can_select"
    ON salary_slips
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = auth.uid()::text
              AND u.can_manage_payroll = true
        )
        OR
        -- An employee can always read their own slips.
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = salary_slips.employee_id
              AND e.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "payroll_managers_can_modify" ON salary_slips;
CREATE POLICY "payroll_managers_can_modify"
    ON salary_slips
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = auth.uid()::text
              AND u.can_manage_payroll = true
        )
    );

-- ───────────────────────────────────────────────────────────────────
-- Storage bucket — private, restricted MIME, 10MB cap.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'salary-slips',
    'salary-slips',
    false,
    10 * 1024 * 1024,
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
