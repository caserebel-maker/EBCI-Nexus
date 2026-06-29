import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/wfh-checkin-nudge
 *
 * Daily cron (vercel.json: 03:00 UTC = 10:00 BKK) that finds employees
 * with an APPROVED WFH covering today who haven't checked in yet, and
 * sends them an in-app nudge.
 *
 * Mod's 4 May audit Scenario 3: "อนุมัติ WFH แต่ลืมเช็คอิน" — without
 * this cron, the day silently lands as `status='absent'` in
 * reconciliation (then gets reclassified to 'on_leave' only if the
 * employee also happened to file leave for the day, which they didn't).
 * The nudge gives them a chance to fix it before the day ends and the
 * data calcifies.
 *
 * Why 10:00 BKK (2h past the 08:00 official start)? Earlier than that
 * is too aggressive — the on-time WFH'er hasn't even sat down at their
 * desk yet at 09:00. Past noon and we're nudging too late to save
 * the workday's data.
 *
 * Cooldown: per-day. We use wfh_requests.last_reminded_at for this
 * employee check-in nudge only. Pending-approval reminders use
 * approval_reminded_at, so these two reminder flows cannot suppress
 * each other.
 *
 * Auth: same Bearer CRON_SECRET pattern as /api/cron/leave-reminders.
 */

interface WfhRow {
    id: string
    employee_id: string
    reference_code: string
    start_date: string
    end_date: string
    last_reminded_at: string | null
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

    const nowIso = new Date().toISOString()

    // Bangkok-local "today" YYYY-MM-DD — used to match against
    // wfh_requests.start_date / end_date which are date-typed.
    const nowBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayBkkIso = `${nowBkk.getUTCFullYear()}-${String(nowBkk.getUTCMonth() + 1).padStart(2, '0')}-${String(nowBkk.getUTCDate()).padStart(2, '0')}`

    // Bangkok start-of-today expressed as a UTC instant.
    // Use this to (a) check if the employee already checked in today,
    // (b) decide whether last_reminded_at is "stale enough" to re-nudge.
    const startOfTodayBkkUtcIso = new Date(`${todayBkkIso}T00:00:00+07:00`).toISOString()

    // 1. WFH approved + covering today + not nudged today yet.
    const { data: wfhRows, error: qErr } = await supabaseAdmin
        .from('wfh_requests')
        .select('id, employee_id, reference_code, start_date, end_date, last_reminded_at')
        .eq('status', 'approved')
        .lte('start_date', todayBkkIso)
        .gte('end_date', todayBkkIso)
        .or(`last_reminded_at.is.null,last_reminded_at.lt.${startOfTodayBkkUtcIso}`)
        .limit(200)

    if (qErr) {
        console.error('[cron/wfh-nudge] query error:', qErr)
        return NextResponse.json({ error: qErr.message }, { status: 500 })
    }

    const rows = (wfhRows ?? []) as WfhRow[]
    const summary = { scanned: rows.length, nudged: 0, alreadyCheckedIn: 0, errors: 0 }

    if (rows.length === 0) {
        return NextResponse.json({ success: true, summary })
    }

    // 2. Bulk-fetch today's checkins for ALL candidate employees in one
    //    query (avoid N+1).
    const employeeIds = Array.from(new Set(rows.map(r => r.employee_id)))
    const { data: todaysCheckins } = await supabaseAdmin
        .from('checkins')
        .select('employee_id')
        .in('employee_id', employeeIds)
        .gte('checked_in_at', startOfTodayBkkUtcIso)

    const checkedInToday = new Set(
        (todaysCheckins ?? []).map(c => c.employee_id as string),
    )

    // 3. Per-row nudge.
    for (const row of rows) {
        try {
            if (checkedInToday.has(row.employee_id)) {
                summary.alreadyCheckedIn++
                continue
            }
            const ok = await nudgeEmployee(row)
            if (ok) {
                summary.nudged++
                await supabaseAdmin
                    .from('wfh_requests')
                    .update({ last_reminded_at: nowIso })
                    .eq('id', row.id)
            }
        } catch (err) {
            summary.errors++
            console.error('[cron/wfh-nudge] row failed:', row.id, err)
        }
    }

    return NextResponse.json({ success: true, summary })
}

async function nudgeEmployee(row: WfhRow): Promise<boolean> {
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, user_id')
        .eq('id', row.employee_id)
        .maybeSingle()

    const e = emp as {
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        user_id: string | null
    } | null
    if (!e) return false

    // ── In-app 🔔 ─────────────────────────────────────────────────────
    const userId = e.user_id ?? await getEmployeeUserId(row.employee_id)
    if (userId) {
        await createNotification({
            recipient_user_id: userId,
            type: 'wfh_checkin_nudge',
            title: 'อย่าลืมเช็คอิน WFH วันนี้',
            body: `วันนี้คุณได้รับอนุมัติ WFH แล้ว (${row.reference_code}) — กรุณาเช็คอินผ่านแอปเพื่อบันทึกว่ามาทำงานวันนี้`,
            color: 'amber',
            icon: 'Home',
            entity_type: 'wfh_request',
            entity_id: row.id,
            reference_code: row.reference_code,
            action_url: '/portal/checkin',
            action_label: 'ไปเช็คอิน',
        }).catch(err => console.error('[cron/wfh-nudge] notif failed:', err))
    }

    return true
}
