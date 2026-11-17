-- Expense claims (การเบิกค่าใช้จ่าย)
--
-- Flow: employee submits → HR/Super admin approves or rejects → HR marks paid.
-- HR can also record a claim on behalf of an employee (it starts as approved).
-- Receipts live in the existing private `employee-expenses` storage bucket
-- under the `claims/` prefix; only the path is stored here.

-- 1) Categories — managed by HR from /hradmin/expenses (no code change needed)
CREATE TABLE IF NOT EXISTS public.expense_claim_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.expense_claim_categories (name, sort_order) VALUES
    ('ค่าเดินทาง / ค่าน้ำมัน / ทางด่วน / ที่จอดรถ', 10),
    ('ค่าเบี้ยเลี้ยง / ค่าที่พัก (ต่างจังหวัด)', 20),
    ('ค่ารักษาพยาบาล', 30),
    ('ค่าอุปกรณ์ / วัสดุสำนักงาน', 40),
    ('ค่าอบรม / สัมมนา', 50),
    ('ค่าโทรศัพท์ / อินเทอร์เน็ต', 60),
    ('ค่ารับรองลูกค้า / ค่าอาหาร', 70),
    ('อื่น ๆ', 999)
ON CONFLICT (name) DO NOTHING;

-- 2) Claims
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    category_id UUID NULL REFERENCES public.expense_claim_categories(id) ON DELETE SET NULL,
    -- snapshot so history still reads correctly if HR renames/removes a category
    category_name TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT NULL,

    receipt_path TEXT NULL,
    receipt_file_name TEXT NULL,
    receipt_mime_type TEXT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),

    submitted_by TEXT NULL,          -- session user id (employee or HR)
    submitted_by_name TEXT NULL,
    reviewed_by TEXT NULL,
    reviewed_by_name TEXT NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_note TEXT NULL,           -- reason when rejected
    paid_by TEXT NULL,
    paid_by_name TEXT NULL,
    paid_on DATE NULL,
    payment_note TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_employee
    ON public.expense_claims(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status
    ON public.expense_claims(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_expense_claim_categories_updated_at ON public.expense_claim_categories;
CREATE TRIGGER trg_expense_claim_categories_updated_at
    BEFORE UPDATE ON public.expense_claim_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_expense_updated_at();

DROP TRIGGER IF EXISTS trg_expense_claims_updated_at ON public.expense_claims;
CREATE TRIGGER trg_expense_claims_updated_at
    BEFORE UPDATE ON public.expense_claims
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_expense_updated_at();

-- 3) RLS: the app reads/writes through the service role on the server,
-- so no client policies are granted. Enabling RLS blocks direct access
-- with the anon/authenticated keys.
ALTER TABLE public.expense_claim_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
