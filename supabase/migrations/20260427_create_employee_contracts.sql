-- Employment contract storage: 1 employee → many contracts.
-- Lifecycle: probation → permanent → amendment(s) → renewal(s) → termination.
-- Contracts are NEVER hard-deleted (Thai labour law: keep ≥ 2 yrs after exit).
-- Soft delete via `deleted_at`; backfill restoration via `superseded_by` chain.

CREATE TABLE IF NOT EXISTS public.employee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,

    -- 5 supported types (matches Thai labour-law standard set)
    contract_type TEXT NOT NULL CHECK (contract_type IN (
        'probation',     -- ทดลองงาน
        'permanent',     -- ประจำ
        'amendment',     -- แก้ไข (ขึ้นเงินเดือน / เปลี่ยนตำแหน่ง)
        'renewal',       -- ต่ออายุ
        'termination'    -- สิ้นสุดสัญญา
    )),

    -- Date metadata — signed_date is required, effective dates optional
    signed_date DATE NOT NULL,
    effective_start DATE NULL,
    effective_end DATE NULL,

    -- File metadata. file_path = key inside the 'employee-contracts' bucket.
    -- We store path (not signed URL) so we can mint fresh URLs on demand
    -- and rotate ACLs without rewriting the DB.
    file_path TEXT NOT NULL,
    file_name TEXT NULL,                 -- original filename for download UX
    file_size INTEGER NULL,              -- bytes
    mime_type TEXT NULL,                 -- 'application/pdf' / 'image/jpeg' / ...
    page_count INTEGER NULL,             -- only set for PDFs after server probe

    -- Free-form HR comment (e.g. "renewed after 6-month review")
    notes TEXT NULL,

    -- Audit fields
    uploaded_by TEXT NULL REFERENCES "User"(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Chain: this contract supersedes another one (set when uploading
    -- amendment/renewal/termination — preserves the audit trail).
    superseded_by UUID NULL REFERENCES employee_contracts(id) ON DELETE SET NULL,

    -- Soft delete only — set deleted_at + deleted_by, never DELETE.
    deleted_at TIMESTAMPTZ NULL,
    deleted_by TEXT NULL REFERENCES "User"(id),
    deleted_reason TEXT NULL
);

-- Indexes for the queries the UI actually runs
CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee
    ON employee_contracts(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_contracts_signed_date
    ON employee_contracts(signed_date DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE employee_contracts IS
'Signed employment contracts (PDF/image). HR-only access via RLS. Never hard-delete (legal retention 2+ years post-termination). Use deleted_at for soft delete.';

-- ── RLS ───────────────────────────────────────────────────────────────
-- Server actions use service-role and bypass RLS, but we still enable it
-- defense-in-depth so any future client-side query can't leak contracts.
ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_select_contracts" ON employee_contracts;
CREATE POLICY "hr_can_select_contracts"
    ON employee_contracts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = auth.uid()::text
              AND (u.role = 'hr_admin'
                   OR u.can_edit_employees = true
                   OR u.can_manage_system = true)
        )
    );

DROP POLICY IF EXISTS "hr_can_modify_contracts" ON employee_contracts;
CREATE POLICY "hr_can_modify_contracts"
    ON employee_contracts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = auth.uid()::text
              AND (u.role = 'hr_admin'
                   OR u.can_edit_employees = true
                   OR u.can_manage_system = true)
        )
    );

-- ── Storage bucket ────────────────────────────────────────────────────
-- Private bucket, 20MB cap, restricted MIME types (PDF + common images
-- including HEIC/HEIF for iPhone scans).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-contracts',
    'employee-contracts',
    false,
    20 * 1024 * 1024,
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/heif',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
