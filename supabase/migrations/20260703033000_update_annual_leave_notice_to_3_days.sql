-- Align annual leave advance notice with the current HR policy.
-- Employee-facing leave form and policy pages read these values from leave_types.

UPDATE public.leave_types
SET
    advance_notice_days = 3,
    description = 'พนักงานที่ประสงค์จะใช้วันหยุดพักผ่อนประจำปี ต้องยื่นใบลาตามแบบที่บริษัทกำหนด และยื่นขออนุมัติจากหัวหน้างานผู้มีสิทธิอนุมัติการลาไม่น้อยกว่า 3 วันก่อนวันที่จะลาหยุด โดยต้องได้รับอนุมัติจากหัวหน้างานก่อนจึงจะลาหยุดได้'
WHERE id = 'annual';
