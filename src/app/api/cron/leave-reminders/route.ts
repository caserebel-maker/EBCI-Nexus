import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/leave-reminders
 *
 * Pending leave/WFH safety net:
 * - after 4h: re-ping the assigned approver via bell + Telegram
 * - after 24h OR near the request date: notify HR for awareness/follow-up
 *
 * HR is not an approver here. The message is intentionally worded as
 * "ช่วยติดตาม" so Mod/HR gets signal only when a pending request is at
 * risk of being missed, not every time someone submits and cancels.
 */

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://ebci-nexus.vercel.app'

const APPROVER_REMINDER_THRESHOLD_HOURS = 4
const APPROVER_REMINDER_COOLDOWN_HOURS = 4
const HR_STALE_THRESHOLD_HOURS = 24
const HR_ESCALATION_COOLDOWN_HOURS = 24
const HR_NEAR_START_DAYS = 1

type RequestKind = 'leave' | 'wfh'

interface PendingRow {
    id: string
    reference_code: string | null
    employee_id: string
    leave_type_id?: string | null
    start_date: string
    end_date: string
    total_days: number | string
    reason: string | null
    approver_id: string | null
    submitted_at: string | null
    approval_reminded_at: string | null
    hr_escalated_at: string | null
}

interface EmployeeLite {
    id: string
    user_id: string | null
    email: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    position: string | null
    telegram_chat_id: string | null
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const approverThresholdIso = hoursAgoIso(APPROVER_REMINDER_THRESHOLD_HOURS)
    const approverCooldownIso = hoursAgoIso(APPROVER_REMINDER_COOLDOWN_HOURS)
    const hrStaleThresholdIso = hoursAgoIso(HR_STALE_THRESHOLD_HOURS)
    const hrCooldownIso = hoursAgoIso(HR_ESCALATION_COOLDOWN_HOURS)
    const nearStartDate = addBangkokDays(ymdBangkok(now), HR_NEAR_START_DAYS)

    const summary = {
        leave: { scanned: 0, approverReminded: 0, hrEscalated: 0, errors: 0 },
        wfh: { scanned: 0, approverReminded: 0, hrEscalated: 0, errors: 0 },
    }

    await processPendingKind({
        kind: 'leave',
        nowIso,
        approverThresholdIso,
        approverCooldownIso,
        hrStaleThresholdIso,
        hrCooldownIso,
        nearStartDate,
        summary: summary.leave,
    })

    await processPendingKind({
        kind: 'wfh',
        nowIso,
        approverThresholdIso,
        approverCooldownIso,
        hrStaleThresholdIso,
        hrCooldownIso,
        nearStartDate,
        summary: summary.wfh,
    })

    return NextResponse.json({ success: true, summary })
}

async function processPendingKind(args: {
    kind: RequestKind
    nowIso: string
    approverThresholdIso: string
    approverCooldownIso: string
    hrStaleThresholdIso: string
    hrCooldownIso: string
    nearStartDate: string
    summary: { scanned: number; approverReminded: number; hrEscalated: number; errors: number }
}) {
    const table = args.kind === 'leave' ? 'leave_requests' : 'wfh_requests'
    const selectCols = args.kind === 'leave'
        ? 'id, reference_code, employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, submitted_at, approval_reminded_at, hr_escalated_at'
        : 'id, reference_code, employee_id, start_date, end_date, total_days, reason, approver_id, submitted_at, approval_reminded_at, hr_escalated_at'

    const { data, error } = await supabaseAdmin
        .from(table)
        .select(selectCols)
        .eq('status', 'pending')
        .or(
            [
                `and(submitted_at.lt.${args.approverThresholdIso},or(approval_reminded_at.is.null,approval_reminded_at.lt.${args.approverCooldownIso}))`,
                `and(submitted_at.lt.${args.hrStaleThresholdIso},or(hr_escalated_at.is.null,hr_escalated_at.lt.${args.hrCooldownIso}))`,
                `and(start_date.lte.${args.nearStartDate},or(hr_escalated_at.is.null,hr_escalated_at.lt.${args.hrCooldownIso}))`,
            ].join(','),
        )
        .order('submitted_at', { ascending: true, nullsFirst: false })
        .limit(100)

    if (error) {
        args.summary.errors++
        console.error(`[cron/reminders] ${args.kind} query error:`, error)
        return
    }

    const rows = (data ?? []) as PendingRow[]
    args.summary.scanned = rows.length
    for (const row of rows) {
        try {
            const submittedAt = row.submitted_at ? new Date(row.submitted_at).getTime() : 0
            const shouldRemindApprover =
                Boolean(row.approver_id) &&
                submittedAt > 0 &&
                row.submitted_at! < args.approverThresholdIso &&
                isNullOrOlder(row.approval_reminded_at, args.approverCooldownIso)

            const shouldEscalateHr =
                isNullOrOlder(row.hr_escalated_at, args.hrCooldownIso) &&
                (
                    (submittedAt > 0 && row.submitted_at! < args.hrStaleThresholdIso) ||
                    row.start_date <= args.nearStartDate
                )

            if (shouldRemindApprover) {
                const ok = await notifyApprover(args.kind, row)
                if (ok) {
                    args.summary.approverReminded++
                    await supabaseAdmin
                        .from(table)
                        .update({ approval_reminded_at: args.nowIso })
                        .eq('id', row.id)
                }
            }

            if (shouldEscalateHr) {
                const ok = await notifyHr(args.kind, row)
                if (ok) {
                    args.summary.hrEscalated++
                    await supabaseAdmin
                        .from(table)
                        .update({ hr_escalated_at: args.nowIso })
                        .eq('id', row.id)
                }
            }
        } catch (err) {
            args.summary.errors++
            console.error(`[cron/reminders] ${args.kind} row failed:`, row.id, err)
        }
    }
}

async function notifyApprover(kind: RequestKind, row: PendingRow): Promise<boolean> {
    if (!row.approver_id) return false
    const [employee, approver, leaveTypeName] = await Promise.all([
        fetchEmployee(row.employee_id),
        fetchEmployee(row.approver_id),
        kind === 'leave' ? fetchLeaveTypeName(row.leave_type_id ?? null) : Promise.resolve('WFH'),
    ])
    if (!approver) return false

    const applicantName = displayEmployeeName(employee)
    const applicantNick = employee?.nickname || applicantName
    const dateLabel = dateRangeLabel(row.start_date, row.end_date)
    const requestLabel = kind === 'leave' ? leaveTypeName : 'WFH'
    const inboxPath = kind === 'leave' ? '/portal/leave/inbox' : '/portal/wfh/inbox'
    const title = `[เตือน] ${applicantNick} รออนุมัติ${requestLabel}`
    const body = `${dateLabel} (${Number(row.total_days)} วัน) — ค้างมาเกิน 4 ชม.`

    if (approver.user_id) {
        await createNotification({
            recipient_user_id: approver.user_id,
            type: kind === 'leave' ? 'leave_request_reminder' : 'wfh_request_reminder',
            title,
            body,
            action_url: inboxPath,
            action_label: 'ไปอนุมัติ',
            entity_type: kind === 'leave' ? 'leave_request' : 'wfh_request',
            entity_id: row.id,
            reference_code: row.reference_code,
            icon: kind === 'leave' ? 'Calendar' : 'Home',
            color: 'amber',
            sender_name: applicantNick,
        }).catch(err => console.error('[cron/reminders] approver in-app failed:', err))
    }

    if (approver.telegram_chat_id) {
        const text = [
            `⏰ <b>เตือนอนุมัติ${escapeTelegramHtml(requestLabel)}</b>`,
            `👤 ${escapeTelegramHtml(applicantNick)}`,
            `📅 ${escapeTelegramHtml(dateLabel)} (${Number(row.total_days)} วัน)`,
            row.reason ? `📝 ${escapeTelegramHtml(row.reason.slice(0, 200))}` : '',
            `<a href="${escapeTelegramHtml(`${BASE_URL}${inboxPath}`)}">เปิดกล่องอนุมัติใน Nexus →</a>`,
        ].filter(Boolean).join('\n')
        sendTelegram({ chatId: approver.telegram_chat_id, text })
            .catch(err => console.error('[cron/reminders] approver telegram failed:', err))
    }

    return Boolean(approver.user_id || approver.telegram_chat_id)
}

async function notifyHr(kind: RequestKind, row: PendingRow): Promise<boolean> {
    const [employee, approver, leaveTypeName, hrTargets] = await Promise.all([
        fetchEmployee(row.employee_id),
        row.approver_id ? fetchEmployee(row.approver_id) : Promise.resolve(null),
        kind === 'leave' ? fetchLeaveTypeName(row.leave_type_id ?? null) : Promise.resolve('WFH'),
        findHrNotifyTargets(),
    ])
    if (hrTargets.length === 0) return false

    const applicantName = displayEmployeeName(employee)
    const applicantNick = employee?.nickname || applicantName
    const approverName = approver ? displayApproverName(approver) : 'ผู้อนุมัติ'
    const dateLabel = dateRangeLabel(row.start_date, row.end_date)
    const requestLabel = kind === 'leave' ? leaveTypeName : 'WFH'
    const actionPath = kind === 'leave' ? '/hradmin/leave?tab=requests' : '/portal/wfh'
    const title = `[ติดตาม] ${applicantNick} รออนุมัติ${requestLabel}`
    const body = `${dateLabel} (${Number(row.total_days)} วัน) — รอ ${approverName} อนุมัติ กรุณาช่วยติดตาม ไม่ใช่การอนุมัติแทน`

    let delivered = false
    for (const target of hrTargets) {
        if (target.userId) {
            delivered = true
            await createNotification({
                recipient_user_id: target.userId,
                type: kind === 'leave' ? 'leave_request_hr_escalation' : 'wfh_request_hr_escalation',
                title,
                body,
                action_url: actionPath,
                action_label: 'ดูรายการ',
                entity_type: kind === 'leave' ? 'leave_request' : 'wfh_request',
                entity_id: row.id,
                reference_code: row.reference_code,
                icon: kind === 'leave' ? 'CalendarClock' : 'Home',
                color: 'blue',
                sender_name: applicantNick,
                metadata: { approverName, reminderReason: 'pending_request_safety_net' },
            }).catch(err => console.error('[cron/reminders] HR in-app failed:', err))
        }

        if (target.telegramChatId) {
            delivered = true
            const text = [
                `📌 <b>ช่วยติดตาม${escapeTelegramHtml(requestLabel)}ค้างอนุมัติ</b>`,
                `👤 ${escapeTelegramHtml(applicantName)}`,
                `📅 ${escapeTelegramHtml(dateLabel)} (${Number(row.total_days)} วัน)`,
                `🧑‍💼 รออนุมัติจาก: ${escapeTelegramHtml(approverName)}`,
                row.reason ? `📝 ${escapeTelegramHtml(row.reason.slice(0, 200))}` : '',
                `หมายเหตุ: HR รับทราบ/ช่วยตามงาน ไม่ใช่ผู้อนุมัติแทน`,
                `<a href="${escapeTelegramHtml(`${BASE_URL}${actionPath}`)}">ดูใน Nexus →</a>`,
            ].filter(Boolean).join('\n')
            sendTelegram({ chatId: target.telegramChatId, text })
                .catch(err => console.error('[cron/reminders] HR telegram failed:', err))
        }
    }

    return delivered
}

async function fetchEmployee(id: string): Promise<EmployeeLite | null> {
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, user_id, email, first_name_th, last_name_th, nickname, position, telegram_chat_id')
        .eq('id', id)
        .maybeSingle()
    if (error) {
        console.error('[cron/reminders] employee query failed:', id, error)
        return null
    }
    return (data ?? null) as EmployeeLite | null
}

async function fetchLeaveTypeName(id: string | null): Promise<string> {
    if (!id) return 'ใบลา'
    const fallback: Record<string, string> = {
        annual: 'ลาพักร้อน',
        vacation: 'ลาพักร้อน',
        personal: 'ลากิจ',
        business: 'ลากิจ',
        sick: 'ลาป่วย',
    }
    const { data } = await supabaseAdmin
        .from('leave_types')
        .select('name_th')
        .eq('id', id)
        .maybeSingle()
    return (data?.name_th as string | null) ?? fallback[id] ?? 'ใบลา'
}

function displayEmployeeName(emp: EmployeeLite | null): string {
    if (!emp) return 'พนักงาน'
    const fullName = `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
    if (fullName && emp.nickname) return `${fullName} (${emp.nickname})`
    return fullName || emp.nickname || 'พนักงาน'
}

function displayApproverName(emp: EmployeeLite): string {
    const firstName = emp.first_name_th?.trim() || emp.nickname || 'ผู้อนุมัติ'
    const nick = emp.nickname && emp.nickname !== firstName ? ` (${emp.nickname})` : ''
    return [emp.position?.trim(), firstName + nick].filter(Boolean).join(' ')
}

function dateRangeLabel(start: string, end: string): string {
    return start === end ? start : `${start} → ${end}`
}

function hoursAgoIso(hours: number): string {
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function isNullOrOlder(value: string | null, cutoffIso: string): boolean {
    return !value || value < cutoffIso
}

function ymdBangkok(date: Date): string {
    const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000)
    return `${bkk.getUTCFullYear()}-${String(bkk.getUTCMonth() + 1).padStart(2, '0')}-${String(bkk.getUTCDate()).padStart(2, '0')}`
}

function addBangkokDays(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00+07:00`)
    d.setUTCDate(d.getUTCDate() + days)
    return ymdBangkok(d)
}
