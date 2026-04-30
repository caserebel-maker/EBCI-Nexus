-- =====================================================================
-- Migration: expand leave_types to ม๊อด's 11-category list (APR30)
--
-- Adds 5 new categories that were missing (ลาทำหมัน, ลาคลอด,
-- ลารับราชการทหาร, ลาเกณฑ์ทหาร, ลาอุปสมบท), reorders existing rows
-- to match the order ม๊อด listed, and renames `marriage` to ลาสมรส.
--
-- Adds gender_restriction column so the leave-type dropdown can hide
-- ลาคลอด from male employees and ลาเกณฑ์ทหาร / ลาอุปสมบท from female
-- employees. NULL = visible to everyone.
--
-- Day counts use Thai labour-law defaults where ม๊อด didn't specify;
-- HR can fine-tune per-employee via leave_balances.
-- =====================================================================

ALTER TABLE public.leave_types
    ADD COLUMN IF NOT EXISTS gender_restriction text;

ALTER TABLE public.leave_types
    DROP CONSTRAINT IF EXISTS leave_types_gender_check;
ALTER TABLE public.leave_types
    ADD CONSTRAINT leave_types_gender_check
    CHECK (gender_restriction IS NULL OR gender_restriction IN ('male', 'female'));

-- Re-order existing rows to match the order ม๊อด listed:
-- 1 ลากิจ · 2 ลาพักร้อน · 3 ลาป่วย · 4 ลาทำหมัน · 5 ลาคลอด ·
-- 6 ลารับราชการทหาร · 7 ลาเกณฑ์ทหาร · 8 ลาพัฒนาความรู้ ·
-- 9 ลาอุปสมบท · 10 ลาสมรส · 11 ลาพ่อแม่เสียชีวิต
UPDATE public.leave_types SET display_order = 1  WHERE id = 'personal';
UPDATE public.leave_types SET display_order = 2  WHERE id = 'annual';
UPDATE public.leave_types SET display_order = 3  WHERE id = 'sick';
UPDATE public.leave_types SET display_order = 8  WHERE id = 'training';
UPDATE public.leave_types
    SET display_order = 10, name_th = 'ลาสมรส'
    WHERE id = 'marriage';
UPDATE public.leave_types SET display_order = 11 WHERE id = 'bereavement';

INSERT INTO public.leave_types
    (id, name_th, name_en, default_days_per_year, is_unlimited,
     requires_attachment, attachment_description, advance_notice_days,
     same_day_allowed, gender_restriction, color, description,
     is_active, display_order)
VALUES
    ('sterilization', 'ลาทำหมัน', 'Sterilization Leave', 3, false,
     true, 'ใบรับรองแพทย์', 7,
     false, NULL, '#A78BFA', 'ลาเพื่อทำหมัน — ได้รับค่าจ้าง 3 วัน',
     true, 4),
    ('maternity', 'ลาคลอด', 'Maternity Leave', 98, false,
     true, 'ใบรับรองแพทย์ / สูติบัตร', 30,
     false, 'female', '#F472B6', 'ลาคลอดบุตร 98 วัน (กฎหมายแรงงาน)',
     true, 5),
    ('military_service', 'ลารับราชการทหาร', 'Military Service Leave', NULL, true,
     true, 'หมายเรียกหรือใบสำคัญ', 0,
     true, NULL, '#94A3B8', 'ลาเพื่อรับราชการทหาร — ตามหมายเรียก',
     true, 6),
    ('military_draft', 'ลาเกณฑ์ทหาร', 'Military Draft Leave', NULL, true,
     true, 'หมายเรียกเกณฑ์ทหาร', 0,
     true, 'male', '#94A3B8', 'ลาเข้ารับการตรวจเลือกเป็นทหาร — เฉพาะชาย',
     true, 7),
    ('ordination', 'ลาอุปสมบท', 'Ordination Leave', 15, false,
     false, NULL, 30,
     false, 'male', '#A78BFA', 'ลาอุปสมบท 15 วัน — เฉพาะชาย',
     true, 9)
ON CONFLICT (id) DO NOTHING;
