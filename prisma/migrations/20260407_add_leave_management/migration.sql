-- ============================================================
-- Leave Management System Migration (PostgreSQL / Supabase)
-- Run this in Supabase SQL Editor or psql
-- ============================================================

-- Add manager role support to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id TEXT REFERENCES employees(id);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'personal', 'annual', 'maternity', 'ordination')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_days FLOAT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by TEXT REFERENCES "User"(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notified_at TIMESTAMP,
    escalated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    year INTEGER NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'personal', 'annual', 'maternity', 'ordination')),
    entitled_days FLOAT NOT NULL,
    used_days FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, year, leave_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);

-- Row Level Security (RLS)
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Prisma server-side uses service role)
CREATE POLICY "Service role has full access to leave_requests"
    ON leave_requests FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to leave_balances"
    ON leave_balances FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- OPTIONAL: Seed default leave entitlements for existing employees
-- Run after the above if needed
-- ============================================================
-- INSERT INTO leave_balances (id, employee_id, year, leave_type, entitled_days, used_days)
-- SELECT
--     gen_random_uuid()::text,
--     e.id,
--     EXTRACT(YEAR FROM NOW())::INT,
--     lt.leave_type,
--     lt.entitled_days,
--     0
-- FROM employees e
-- CROSS JOIN (VALUES
--     ('sick', 30),
--     ('personal', 3),
--     ('annual', 6),
--     ('maternity', 90),
--     ('ordination', 15)
-- ) AS lt(leave_type, entitled_days)
-- ON CONFLICT (employee_id, year, leave_type) DO NOTHING;
