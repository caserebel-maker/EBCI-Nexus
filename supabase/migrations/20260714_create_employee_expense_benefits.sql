CREATE TABLE IF NOT EXISTS public.employee_expense_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other'
        CHECK (category IN ('phone', 'travel', 'fuel', 'uniform', 'medical', 'training', 'welfare', 'other')),
    description TEXT NULL,
    default_amount NUMERIC(12, 2) NULL,
    start_month DATE NULL,
    end_month DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT NULL REFERENCES "User"(id),
    updated_by TEXT NULL REFERENCES "User"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benefit_id UUID NOT NULL REFERENCES public.employee_expense_benefits(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    payment_year INTEGER NOT NULL CHECK (payment_year BETWEEN 2000 AND 2100),
    payment_month INTEGER NOT NULL CHECK (payment_month BETWEEN 1 AND 12),
    amount NUMERIC(12, 2) NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'not_eligible', 'cancelled')),
    paid_on DATE NULL,
    receipt_path TEXT NULL,
    receipt_file_name TEXT NULL,
    receipt_file_size INTEGER NULL,
    receipt_mime_type TEXT NULL,
    notes TEXT NULL,
    recorded_by TEXT NULL REFERENCES "User"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (benefit_id, payment_year, payment_month)
);

CREATE INDEX IF NOT EXISTS idx_employee_expense_benefits_employee
    ON public.employee_expense_benefits(employee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_employee_expense_payments_employee_period
    ON public.employee_expense_payments(employee_id, payment_year DESC, payment_month DESC);

CREATE INDEX IF NOT EXISTS idx_employee_expense_payments_benefit_period
    ON public.employee_expense_payments(benefit_id, payment_year DESC, payment_month DESC);

CREATE OR REPLACE FUNCTION public.set_employee_expense_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_expense_benefits_updated_at ON public.employee_expense_benefits;
CREATE TRIGGER trg_employee_expense_benefits_updated_at
    BEFORE UPDATE ON public.employee_expense_benefits
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_expense_updated_at();

DROP TRIGGER IF EXISTS trg_employee_expense_payments_updated_at ON public.employee_expense_payments;
CREATE TRIGGER trg_employee_expense_payments_updated_at
    BEFORE UPDATE ON public.employee_expense_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_employee_expense_updated_at();

ALTER TABLE public.employee_expense_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_expense_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_benefits_hr_or_self_select" ON public.employee_expense_benefits;
CREATE POLICY "expense_benefits_hr_or_self_select"
    ON public.employee_expense_benefits
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_expense_benefits.employee_id
              AND e.user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "expense_payments_hr_or_self_select" ON public.employee_expense_payments;
CREATE POLICY "expense_payments_hr_or_self_select"
    ON public.employee_expense_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_expense_payments.employee_id
              AND e.user_id = (SELECT auth.uid())::text
        )
    );

DROP POLICY IF EXISTS "expense_benefits_hr_modify" ON public.employee_expense_benefits;
CREATE POLICY "expense_benefits_hr_modify"
    ON public.employee_expense_benefits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
    );

DROP POLICY IF EXISTS "expense_payments_hr_modify" ON public.employee_expense_payments;
CREATE POLICY "expense_payments_hr_modify"
    ON public.employee_expense_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = (SELECT auth.uid())::text
              AND u.role = 'hr_admin'
        )
    );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-expenses',
    'employee-expenses',
    false,
    10 * 1024 * 1024,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
