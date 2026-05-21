-- =====================================================================
-- Apply EBCI final leave policy text supplied by HR on 21 May 2026.
--
-- This migration updates the seven finalized leave categories so the
-- employee-facing /portal/leave-policy page and leave-form validation
-- read from the same source of truth.
-- =====================================================================

UPDATE public.leave_types
SET
    name_th = 'ลาพักผ่อนประจำปี',
    advance_notice_days = 1,
    same_day_allowed = false,
    description = 'พนักงานที่ประสงค์จะใช้วันหยุดพักผ่อนประจำปี ต้องยื่นใบลาตามแบบที่บริษัทกำหนด และยื่นขออนุมัติจากหัวหน้างานผู้มีสิทธิอนุมัติการลาไม่น้อยกว่า 1 วันก่อนวันที่จะลาหยุด โดยต้องได้รับอนุมัติจากหัวหน้างานก่อนจึงจะลาหยุดได้'
WHERE id = 'annual';

UPDATE public.leave_types
SET
    name_th = 'ลาป่วย',
    requires_attachment = true,
    attachment_description = 'ใบรับรองแพทย์หรือสถานพยาบาลของทางราชการ เมื่อจำเป็นต้องลาป่วยตั้งแต่ 3 วันทำงานติดต่อกัน หากไม่สามารถนำใบรับรองแพทย์มาแสดง ต้องชี้แจงเป็นหนังสือให้บริษัททราบ',
    advance_notice_days = 0,
    same_day_allowed = false,
    description = 'พนักงานต้องยื่นใบลาป่วยให้หัวหน้างานในวันแรกที่กลับมาทำงาน หากจำเป็นต้องลาป่วยตั้งแต่ 3 วันทำงานติดต่อกัน ต้องส่งใบรับรองแพทย์หรือสถานพยาบาลของทางราชการมาด้วย หากไม่สามารถนำใบรับรองแพทย์มาแสดง ต้องชี้แจงเป็นหนังสือให้บริษัททราบ'
WHERE id = 'sick';

UPDATE public.leave_types
SET
    name_th = 'ลากิจ',
    advance_notice_days = 1,
    same_day_allowed = false,
    description = 'พนักงานที่มีความประสงค์จะใช้ลากิจ ต้องยื่นใบลาและยื่นขออนุมัติจากหัวหน้างานไม่น้อยกว่า 1 วันก่อนวันที่จะลาหยุด และต้องระบุเหตุผลในการลากิจทุกครั้ง'
WHERE id = 'personal';

UPDATE public.leave_types
SET
    name_th = 'ลาคลอด',
    default_days_per_year = 98,
    is_unlimited = false,
    requires_attachment = false,
    attachment_description = NULL,
    advance_notice_days = 15,
    same_day_allowed = false,
    gender_restriction = 'female',
    description = 'พนักงานหญิงมีสิทธิลาคลอดบุตรครรภ์หนึ่งไม่เกิน 98 วัน โดยรวมถึงวันลาเพื่อตรวจครรภ์ก่อนคลอดบุตรด้วย การลาคลอดต้องแจ้งให้หัวหน้างานทราบล่วงหน้าไม่น้อยกว่า 15 วันก่อนถึงวันลาคลอด และต้องยื่นใบลาเพื่อให้หัวหน้าพิจารณาอนุมัติ'
WHERE id = 'maternity';

UPDATE public.leave_types
SET
    name_th = 'ลาเพื่อรับราชการทหาร',
    requires_attachment = true,
    attachment_description = 'หมายเรียกหรือเอกสารราชการที่เกี่ยวข้อง',
    advance_notice_days = 0,
    same_day_allowed = true,
    description = 'พนักงานต้องยื่นใบลาให้บริษัททราบภายใน 3 วันนับจากวันที่ได้รับหมายเรียก และจะต้องกลับเข้าทำงานภายใน 3 วัน'
WHERE id = 'military_service';

UPDATE public.leave_types
SET
    name_th = 'ลาอุปสมบท',
    advance_notice_days = 15,
    same_day_allowed = false,
    gender_restriction = 'male',
    description = 'พนักงานที่มีความประสงค์ลาอุปสมบทต้องยื่นใบลาล่วงหน้าไม่น้อยกว่า 15 วัน เพื่อให้ผู้บังคับบัญชาพิจารณาและอนุมัติการลา'
WHERE id = 'ordination';

UPDATE public.leave_types
SET
    name_th = 'ลาเพื่อการสมรส',
    requires_attachment = false,
    attachment_description = NULL,
    advance_notice_days = 3,
    same_day_allowed = false,
    description = 'พนักงานที่ทำงานกับบริษัทครบ 1 ปี มีสิทธิลาเพื่อการสมรส พนักงานที่จะลาเพื่อการสมรสของตนเองต้องยื่นใบลาล่วงหน้าอย่างน้อย 3 วัน เสนอต่อผู้บังคับบัญชาหรือผู้มีอำนาจในการอนุมัติ'
WHERE id = 'marriage';
