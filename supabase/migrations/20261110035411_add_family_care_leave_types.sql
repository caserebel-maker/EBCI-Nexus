-- HR assigns employee entitlements before these types can be requested.
INSERT INTO public.leave_types
    (id, name_th, name_en, default_days_per_year, is_unlimited,
     requires_attachment, advance_notice_days, same_day_allowed,
     color, description, is_active, display_order)
VALUES
    ('spouse_childbirth_support', 'ลาเพื่อช่วยเหลือคู่สมรสที่คลอดบุตร',
     'Spouse Childbirth Support Leave', NULL, false,
     false, 0, true, '#38BDF8', 'รอ HR กำหนดสิทธิและเงื่อนไขการลา', true, 12),
    ('child_medical_care', 'ลาต่อเนื่องเพื่อดูแลบุตรที่มีภาวะเจ็บป่วยหรือความผิดปกติ',
     'Extended Child Medical Care Leave', NULL, false,
     false, 0, true, '#34D399', 'รอ HR กำหนดสิทธิและเงื่อนไขการลา', true, 13)
ON CONFLICT (id) DO NOTHING;
