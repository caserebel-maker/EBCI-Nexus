-- 20260423_backfill_leave_request_pending_notifications.sql
--
-- One-time backfill: create `leave_request_pending` notifications for
-- every currently-pending leave_request whose approver has a linked
-- `employees.user_id`. Previously only new submissions triggered the
-- in-app notification path, so requests created before the Notification
-- Center shipped had no entry in the bell.
--
-- action_url is role-aware: hr_admin recipients deep-link to the
-- /hradmin variant of the inbox so clicking the bell doesn't flip them
-- into employee mode. Everyone else gets /portal/leave/inbox.
--
-- Idempotent via NOT EXISTS guard so this migration can re-run safely
-- (e.g. after more legacy rows get approver_id filled).

INSERT INTO public.notifications (
    recipient_user_id, type, title, body, action_url, action_label,
    entity_type, entity_id, reference_code, icon, color,
    sender_name, created_at
)
SELECT
    approver_emp.user_id,
    'leave_request_pending',
    COALESCE(employee_emp.nickname, employee_emp.first_name_th, 'พนักงาน')
        || ' ขอ' || COALESCE(lt.name_th, 'ลา'),
    CASE
        WHEN lr.start_date = lr.end_date THEN
            TO_CHAR(lr.start_date, 'DD/MM')
            || ' (' || lr.total_days || ' วัน) — '
            || COALESCE(lr.reason, 'ไม่ระบุเหตุผล')
        ELSE
            TO_CHAR(lr.start_date, 'DD/MM') || ' → ' || TO_CHAR(lr.end_date, 'DD/MM')
            || ' (' || lr.total_days || ' วัน) — '
            || COALESCE(lr.reason, 'ไม่ระบุเหตุผล')
    END,
    -- Role-aware action_url — look up the approver's role from the
    -- auth.users metadata and deep-link to the matching shell variant.
    CASE
        WHEN COALESCE(
            au.raw_user_meta_data ->> 'role',
            au.raw_app_meta_data  ->> 'role'
        ) = 'hr_admin' THEN '/hradmin/leave/inbox'
        ELSE '/portal/leave/inbox'
    END,
    'ดูรายละเอียด',
    'leave_request',
    lr.id::text,
    lr.reference_code,
    'Calendar',
    'amber',
    COALESCE(employee_emp.nickname, employee_emp.first_name_th),
    COALESCE(lr.submitted_at, lr.created_at)
FROM public.leave_requests lr
JOIN public.employees approver_emp ON approver_emp.id = lr.approver_id
JOIN public.employees employee_emp ON employee_emp.id = lr.employee_id
LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
-- LEFT so a missing auth row just falls into the portal branch of the
-- CASE instead of dropping the whole row.
LEFT JOIN auth.users au ON au.id::text = approver_emp.user_id
WHERE lr.status = 'pending'
  AND approver_emp.user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_type = 'leave_request'
        AND n.entity_id = lr.id::text
        AND n.type = 'leave_request_pending'
  );
