-- Fine-grained access for the HR attendance insights dashboard.
-- This keeps the page out of the default HR Admin permission set while
-- allowing Mod/Mot, Mod HR, Jim MD, Panthip, and Pom to be explicitly granted.

ALTER TABLE public."User"
ADD COLUMN IF NOT EXISTS can_view_attendance_insights boolean NOT NULL DEFAULT false;

UPDATE public."User" AS u
SET
    can_view_attendance_insights = true,
    "updatedAt" = NOW()
FROM public.employees AS e
WHERE
    (
        e.user_id = u.id
        OR lower(e.email) = lower(u.username)
    )
    AND u.name NOT ILIKE '%mock%'
    AND lower(u.username) NOT IN ('jim', 'mod')
    AND (
        u.can_manage_system = true
        OR e.nickname IN ('ม๊อด', 'มด', 'จิม', 'ป้อม')
        OR e.first_name_th ILIKE '%พันธ์ทิพย์%'
        OR e.last_name_th ILIKE '%พันธ์ทิพย์%'
        OR u.name ILIKE '%ม๊อด%'
        OR u.name ILIKE '%มด%'
        OR u.name ILIKE '%จิม%'
        OR u.name ILIKE '%พันธ์ทิพย์%'
        OR u.name ILIKE '%ป้อม%'
    );

UPDATE public."User" AS u
SET
    can_view_attendance_insights = true,
    "updatedAt" = NOW()
WHERE
    u.name NOT ILIKE '%mock%'
    AND lower(u.username) NOT IN ('jim', 'mod')
    AND (
        u.can_manage_system = true
        OR u.name ILIKE '%ม๊อด%'
        OR u.name ILIKE '%มด%'
        OR u.name ILIKE '%จิม%'
        OR u.name ILIKE '%พันธ์ทิพย์%'
        OR u.name ILIKE '%ป้อม%'
    );

UPDATE public."User" AS u
SET
    can_view_attendance_insights = false,
    "updatedAt" = NOW()
WHERE
    u.name ILIKE '%mock%'
    OR lower(u.username) IN ('jim', 'mod');
