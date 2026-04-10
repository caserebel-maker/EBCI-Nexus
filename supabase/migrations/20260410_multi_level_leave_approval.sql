-- ─── Multi-level Leave Approval System ───────────────────────────────────────
-- Task 1: DB Schema
-- 1=พนักงานทั่วไป, 2=หัวหน้าแผนก, 3=หัวหน้าฝ่าย, 4=HR Admin, 5=MD

-- ── 1. employees: approval_level + supervisor_id ──────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS approval_level INT DEFAULT 1;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id);

-- ── 2. leave_approvals table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_approvals (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id  UUID        REFERENCES leave_requests(id) ON DELETE CASCADE,
    approver_id       UUID        REFERENCES employees(id),
    approver_role     TEXT,       -- 'supervisor' | 'manager' | 'hr' | 'md'
    status            TEXT        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    comment           TEXT,
    acted_at          TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. leave_requests: current_step + current_approver_id ────────────────────
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS current_approver_id UUID REFERENCES employees(id);
