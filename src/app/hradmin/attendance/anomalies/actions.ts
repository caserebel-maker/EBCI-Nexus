'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { revalidatePath } from 'next/cache'

/**
 * Two operational signals for HR's morning sweep:
 *
 *   1. Open sessions  — anyone still `checked_out_at IS NULL`. Until
 *      the 18:30 BKK auto-checkout cron fires, this is the live list
 *      of "did they leave without tapping out". Sorted by duration
 *      open (longest first) so the obvious forgetters bubble up.
 *
 *   2. Late check-ins — every checkin row this month with
 *      `late_minutes > 0`, with the employee-supplied reason. Lets
 *      Mod / Mod's team spot pattern offenders without having to
 *      open each daily reconciliation page.
 *
 * Both run server-side; the page is a thin RSC wrapper.
 *
 * Includes `closeOpenSessionManually(checkinId, atIsoOrNull)` for HR
 * to override an auto-close (or close a session early before the cron
 * gets to it). Mirrors the auto-checkout cron's audit pattern: stamps
 * `auto_closed_at` so the row reads as a system-helper close even
 * when an HR human triggered it (alternative — null auto_closed_at —
 * would lie about whether the employee tapped out themselves).
 */

export interface OpenSessionRow {
    checkinId: string
    employeeId: string
    employeeCode: string
    nameTh: string
    nickname: string | null
    department: string | null
    type: string
    checkedInAtIso: string
    minutesOpen: number  // computed at query time vs now()
    lateMinutes: number | null
}

export interface LateCheckinRow {
    checkinId: string
    employeeId: string
    employeeCode: string
    nameTh: string
    nickname: string | null
    department: string | null
    checkedInAtIso: string
    lateMinutes: number
    lateReason: string | null
    type: string
}

export interface AnomaliesData {
    openSessions: OpenSessionRow[]
    lateCheckins: LateCheckinRow[]
    monthIso: string  // YYYY-MM that lateCheckins covers
    fetchedAt: string
}

/**
 * Fetch both lists in parallel. Defaults to current Bangkok-local month
 * for late check-ins; pass YYYY-MM to override (e.g. "2026-04" for
 * last month's audit).
 */
export async function getAnomalies(monthOverride?: string): Promise<AnomaliesData | { error: string }> {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'ไม่มีสิทธิ์เข้าถึง' }
    }

    // Bangkok-local "this month" → YYYY-MM
    const nowBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const defaultMonth = `${nowBkk.getUTCFullYear()}-${String(nowBkk.getUTCMonth() + 1).padStart(2, '0')}`
    const monthIso = (monthOverride && /^\d{4}-\d{2}$/.test(monthOverride))
        ? monthOverride
        : defaultMonth

    // Month boundaries in UTC. start = 1st day 00:00 BKK = previous day 17:00 UTC.
    const [yyyy, mm] = monthIso.split('-').map(Number)
    const startBkk = new Date(`${monthIso}-01T00:00:00+07:00`).toISOString()
    // First of next month, BKK 00:00.
    const nextMonth = mm === 12 ? `${yyyy + 1}-01` : `${yyyy}-${String(mm + 1).padStart(2, '0')}`
    const endBkk = new Date(`${nextMonth}-01T00:00:00+07:00`).toISOString()

    const [openRes, lateRes, empsRes] = await Promise.all([
        supabaseAdmin
            .from('checkins')
            .select('id, employee_id, type, checked_in_at, late_minutes')
            .is('checked_out_at', null)
            .order('checked_in_at', { ascending: true })
            .limit(200),
        supabaseAdmin
            .from('checkins')
            .select('id, employee_id, type, checked_in_at, late_minutes, late_reason')
            .gt('late_minutes', 0)
            .gte('checked_in_at', startBkk)
            .lt('checked_in_at', endBkk)
            .order('checked_in_at', { ascending: false })
            .limit(500),
        // Pull all active employees in one shot to enrich both lists.
        supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department')
            .eq('status', 'active'),
    ])

    if (openRes.error) return { error: openRes.error.message }
    if (lateRes.error) return { error: lateRes.error.message }

    type Emp = {
        id: string; employee_code: string;
        first_name_th: string | null; last_name_th: string | null;
        nickname: string | null; department: string | null;
    }
    const empMap = new Map<string, Emp>()
    for (const e of (empsRes.data ?? []) as Emp[]) empMap.set(e.id, e)

    const enrich = (employeeId: string) => {
        const e = empMap.get(employeeId)
        return {
            employeeCode: e?.employee_code ?? '?',
            nameTh: `${(e?.first_name_th ?? '').trim()} ${(e?.last_name_th ?? '').trim()}`.trim() || '(ไม่พบชื่อ)',
            nickname: e?.nickname ?? null,
            department: e?.department ?? null,
        }
    }

    const nowMs = Date.now()
    const openSessions: OpenSessionRow[] = ((openRes.data ?? []) as Array<{
        id: string; employee_id: string; type: string;
        checked_in_at: string; late_minutes: number | null;
    }>).map(r => ({
        checkinId: r.id,
        employeeId: r.employee_id,
        ...enrich(r.employee_id),
        type: r.type,
        checkedInAtIso: r.checked_in_at,
        minutesOpen: Math.max(0, Math.floor((nowMs - new Date(r.checked_in_at).getTime()) / 60000)),
        lateMinutes: r.late_minutes,
    }))
    // Re-sort longest open first (was asc by checked_in_at = oldest first,
    // which IS longest open — but explicit makes intent clear if the query
    // ordering ever changes).
    openSessions.sort((a, b) => b.minutesOpen - a.minutesOpen)

    const lateCheckins: LateCheckinRow[] = ((lateRes.data ?? []) as Array<{
        id: string; employee_id: string; type: string;
        checked_in_at: string; late_minutes: number; late_reason: string | null;
    }>).map(r => ({
        checkinId: r.id,
        employeeId: r.employee_id,
        ...enrich(r.employee_id),
        checkedInAtIso: r.checked_in_at,
        lateMinutes: r.late_minutes,
        lateReason: r.late_reason,
        type: r.type,
    }))

    return {
        openSessions,
        lateCheckins,
        monthIso,
        fetchedAt: new Date().toISOString(),
    }
}

/**
 * HR-triggered manual close of an open session. Stamps `auto_closed_at`
 * so the row is consistent with what the cron would have done — the
 * Hours Worked column should show "system helped close this", not "the
 * employee tapped out".
 *
 * If `closeAtIso` is null, defaults to checked_in_at + 9h (same default
 * the cron uses). Pass an explicit ISO to set a different time (e.g.
 * the employee told HR they actually left at 16:30).
 */
export async function closeOpenSessionManually(
    checkinId: string,
    closeAtIso: string | null,
): Promise<{ success: true } | { error: string }> {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'ไม่มีสิทธิ์เข้าถึง' }
    }
    if (!checkinId) return { error: 'missing checkinId' }

    // Need the original check-in time to compute the +9h default if no
    // explicit close time was provided.
    const { data: row } = await supabaseAdmin
        .from('checkins')
        .select('checked_in_at, checked_out_at')
        .eq('id', checkinId)
        .maybeSingle()
    if (!row) return { error: 'ไม่พบ check-in นี้' }
    if (row.checked_out_at) return { error: 'check-in นี้ปิดไปแล้ว' }

    const finalCloseIso = closeAtIso
        ?? new Date(new Date(row.checked_in_at as string).getTime() + 9 * 60 * 60 * 1000).toISOString()

    const { error } = await supabaseAdmin
        .from('checkins')
        .update({
            checked_out_at: finalCloseIso,
            auto_closed_at: new Date().toISOString(),
        })
        .eq('id', checkinId)
    if (error) return { error: error.message }

    revalidatePath('/hradmin/attendance/anomalies')
    return { success: true }
}
