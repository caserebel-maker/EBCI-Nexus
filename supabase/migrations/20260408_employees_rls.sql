-- =============================================================================
-- RLS Policy สำหรับตาราง employees
-- Role มาจาก auth.users raw_user_meta_data->>'role'
--
-- hr_admin  → เห็นพนักงานทุกคน
-- manager   → เห็นเฉพาะพนักงานใน department เดียวกับตัวเอง
-- employee  → เห็นเฉพาะ row ของตัวเอง (จับคู่ผ่าน user_id)
-- =============================================================================

-- เปิด RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ลบ policy เก่าทิ้งก่อน (ถ้ามี) เพื่อให้ idempotent
DROP POLICY IF EXISTS "hr_admin_all"       ON employees;
DROP POLICY IF EXISTS "manager_department" ON employees;
DROP POLICY IF EXISTS "employee_self"      ON employees;

-- ----------------------------------------------------------------------------
-- 1. hr_admin: เห็นทุก row (SELECT / INSERT / UPDATE / DELETE)
-- ----------------------------------------------------------------------------
CREATE POLICY "hr_admin_all"
    ON employees
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_admin'
    );

-- ----------------------------------------------------------------------------
-- 2. manager: อ่านได้เฉพาะพนักงานใน department เดียวกับตัวเอง
--    (ดึง department ของ manager จาก employees row ที่ user_id ตรงกัน)
-- ----------------------------------------------------------------------------
CREATE POLICY "manager_department"
    ON employees
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'manager'
        AND department = (
            SELECT e.department
            FROM employees e
            WHERE e.user_id = auth.uid()::text
            LIMIT 1
        )
    );

-- ----------------------------------------------------------------------------
-- 3. employee: อ่านได้เฉพาะ row ของตัวเอง (user_id = auth.uid())
-- ----------------------------------------------------------------------------
CREATE POLICY "employee_self"
    ON employees
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'employee'
        AND user_id = auth.uid()::text
    );

-- ----------------------------------------------------------------------------
-- หมายเหตุ: service_role (supabaseAdmin) bypass RLS เสมอ
-- ดังนั้น server actions ทั้งหมดที่ใช้ supabaseAdmin จะเข้าถึงได้ทุก row
-- ----------------------------------------------------------------------------
