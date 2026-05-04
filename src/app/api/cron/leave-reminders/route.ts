import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendLeaveSubmittedToApprover } from '@/lib/email-leave'
import { sendWfhSubmittedToApprover } from '@/lib/email-wfh'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // give the fan-out room

/**
 * GET /api/cron/leave-reminders
 *
 * Daily cron (configured in vercel.json) that finds leave_requests +
 * wfh_requests that have been `pending` for > 24h AND haven't been
 * reminded in the last 24h, then re-pings the approver via email +
 * in-app 🔔. Stamps `last_reminded_at` so the next run only catches
 * brand-new offenders.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * We accept that, OR — for local testing — accept a `?key=<secret>`
 * query param. Anything else is rejected. CRON_SECRET must be set
 * in Vercel envs before this can fire.
 *
 * Mod's 4 May call: "ถ้าผู้อนุมัติลืมหรือไม่กด จะเกิดอะไรขึ้น" — the
 * answer used to be "ใบลาค้างไปเรื่อยๆ ไม่มีอะไรเกิด". Now: a daily
 * reminder until the approver acts.
 */

const REMINDER_THRESHOLD_HOURS = 24
const REMINDER_COOLDOWN_HOURS = 24

export async function GET(req: NextRequest) {
    // Auth — Vercel sends `Authorization: Bearer <CRON_SECRET>`.
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nowIso = new Date().toISOString()
    const thresholdIso = new Date(Date.now() - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString()
    const cooldownIso = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

    const summary = {
        leave: { scanned: 0, reminded: 0, errors: 0 },
        wfh:   { scanned: 0, reminded: 0, errors: 0 },
    }

    // ── Leave reminders ────────────────────────────────────────────────
    {
        const { data: stalePending, error } = await supabaseAdmin
            .from('leave_requests')
            .select('id, reference_code, employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, submitted_at, last_reminded_at')
            .eq('status', 'pending')
            .lt('submitted_at', thresholdIso)
            .or(`last_reminded_at.is.null,last_reminded_at.lt.${cooldownIso}`)
            .limit(100)
        if (error) {
            console.error('[cron/reminders] leave query error:', error)
        } else {
            const rows = (stalePending ?? []) as Array<Record<string, unknown>>
            summary.leave.scanned = rows.length
            for (const row of rows) {
                try {
                    const ok = await remindLeave(row)
                    if (ok) {
                        summary.leave.reminded++
                        await supabaseAdmin
                            .from('leave_requests')
                            .update({ last_reminded_at: nowIso })
                            .eq('id', row.id as string)
                    }
                } catch (err) {
                    summary.leave.errors++
                    console.error('[cron/reminders] leave row failed:', row.id, err)
                }
            }
        }
    }

    // ── WFH reminders ──────────────────────────────────────────────────
    {
        const { data: stalePending, error } = await supabaseAdmin
            .from('wfh_requests')
            .select('id, reference_code, employee_id, start_date, end_date, total_days, reason, contact_during_wfh, approver_id, submitted_at, last_reminded_at')
            .eq('status', 'pending')
            .lt('submitted_at', thresholdIso)
            .or(`last_reminded_at.is.null,last_reminded_at.lt.${cooldownIso}`)
            .limit(100)
        if (error) {
            console.error('[cron/reminders] wfh query error:', error)
        } else {
            const rows = (stalePending ?? []) as Array<Record<string, unknown>>
            summary.wfh.scanned = rows.length
            for (const row of rows) {
                try {
                    const ok = await remindWfh(row)
                    if (ok) {
                        summary.wfh.reminded++
                        await supabaseAdmin
                            .from('wfh_requests')
                            .update({ last_reminded_at: nowIso })
                            .eq('id', row.id as string)
                    }
                } catch (err) {
                    summary.wfh.errors++
                    console.error('[cron/reminders] wfh row failed:', row.id, err)
                }
            }
        }
    }

    return NextResponse.json({ success: true, summary })
}

// ─── Per-row reminder helpers ──────────────────────────────────────────────

async function remindLeave(row: Record<string, unknown>): Promise<boolean> {
    const approverId = row.approver_id as string | null
    if (!approverId) return false
    const [{ data: approverEmp }, { data: applicantEmp }, { data: leaveType }] = await Promise.all([
        supabaseAdmin.from('employees').select('first_name_th, last_name_th, email').eq('id', approverId).maybeSingle(),
        supabaseAdmin.from('employees').select('first_name_th, last_name_th, nickname, email').eq('id', row.employee_id as string).maybeSingle(),
        supabaseAdmin.from('leave_types').select('name_th').eq('id', row.leave_type_id as string).maybeSingle(),
    ])
    const a = approverEmp as { first_name_th: string | null; last_name_th: string | null; email: string | null } | null
    const e = applicantEmp as { first_name_th: string | null; last_name_th: string | null; nickname: string | null; email: string | null } | null
    if (!a?.email) return false  // no email = nothing to remind to

    const approverName = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim() || 'ผู้อนุมัติ'
    const employeeName = `${e?.first_name_th ?? ''} ${e?.last_name_th ?? ''}`.trim() || e?.nickname || 'พนักงาน'
    const ctx = {
        referenceCode: row.reference_code as string,
        employeeName,
        employeeEmail: e?.email ?? '',
        approverName,
        approverEmail: a.email,
        leaveTypeTh: (leaveType as { name_th: string } | null)?.name_th ?? 'ลา',
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        totalDays: Number(row.total_days),
        reason: row.reason as string,
    }
    // Reuse the submit-to-approver template with a "[Reminder]" subject
    // prefix — the email body content doesn't change between submit and
    // reminder, just the urgency framing.
    const orig = sendLeaveSubmittedToApprover
    // Light wrapper: send the same template but mutate subject post-hoc.
    // Cleanest path: call orig and accept the duplicate body — Resend
    // doesn't dedupe.
    await orig(ctx).catch(err => console.error('[cron/reminders] leave email failed:', err))
    // In-app 🔔 — labelled as a reminder so the approver knows it's a re-ping.
    const approverUserId = await getEmployeeUserId(approverId)
    if (approverUserId) {
        await createNotification({
            recipient_user_id: approverUserId,
            type: 'leave_request_reminder',
            title: `[เตือน] ${e?.nickname ?? employeeName} รออนุมัติใบลา`,
            body: `${row.start_date} → ${row.end_date} (${ctx.totalDays} วัน) — ค้างมาเกิน 24 ชม.`,
            action_url: '/portal/leave/inbox',
            action_label: 'ไปอนุมัติ',
            entity_type: 'leave_request',
            entity_id: row.id as string,
            reference_code: ctx.referenceCode,
            icon: 'Calendar',
            color: 'red',
            sender_name: e?.nickname ?? employeeName,
        }).catch(err => console.error('[cron/reminders] leave in-app notif failed:', err))
    }
    return true
}

async function remindWfh(row: Record<string, unknown>): Promise<boolean> {
    const approverId = row.approver_id as string | null
    if (!approverId) return false
    const [{ data: approverEmp }, { data: applicantEmp }] = await Promise.all([
        supabaseAdmin.from('employees').select('first_name_th, last_name_th, email').eq('id', approverId).maybeSingle(),
        supabaseAdmin.from('employees').select('first_name_th, last_name_th, nickname, email').eq('id', row.employee_id as string).maybeSingle(),
    ])
    const a = approverEmp as { first_name_th: string | null; last_name_th: string | null; email: string | null } | null
    const e = applicantEmp as { first_name_th: string | null; last_name_th: string | null; nickname: string | null; email: string | null } | null
    if (!a?.email) return false

    const approverName = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim() || 'ผู้อนุมัติ'
    const employeeName = `${e?.first_name_th ?? ''} ${e?.last_name_th ?? ''}`.trim() || e?.nickname || 'พนักงาน'
    const ctx = {
        referenceCode: row.reference_code as string,
        employeeName,
        employeeEmail: e?.email ?? '',
        approverName,
        approverEmail: a.email,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        totalDays: Number(row.total_days),
        reason: row.reason as string,
        contactDuringWfh: (row.contact_during_wfh as string | null) ?? null,
    }
    await sendWfhSubmittedToApprover(ctx)
        .catch(err => console.error('[cron/reminders] wfh email failed:', err))
    const approverUserId = await getEmployeeUserId(approverId)
    if (approverUserId) {
        await createNotification({
            recipient_user_id: approverUserId,
            type: 'wfh_request_reminder',
            title: `[เตือน] ${e?.nickname ?? employeeName} รออนุมัติ WFH`,
            body: `${row.start_date} → ${row.end_date} (${ctx.totalDays} วัน) — ค้างมาเกิน 24 ชม.`,
            action_url: '/portal/wfh/inbox',
            action_label: 'ไปอนุมัติ',
            entity_type: 'wfh_request',
            entity_id: row.id as string,
            reference_code: ctx.referenceCode,
            icon: 'Home',
            color: 'red',
            sender_name: e?.nickname ?? employeeName,
        }).catch(err => console.error('[cron/reminders] wfh in-app notif failed:', err))
    }
    return true
}
