'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { revalidatePath } from 'next/cache'

const DISCREPANCY_THRESHOLD_MIN = 10

export type ReconStatus =
    | 'matched'        // card + mobile within threshold
    | 'discrepancy'    // card + mobile but > threshold
    | 'card_only'
    | 'mobile_only'
    | 'on_leave'       // §1.3 — approved leave covers the date; never "ขาด"
    | 'absent'

export interface ReconRow {
    employeeId: string
    employeeCode: string
    firstNameTh: string
    nickname: string | null
    department: string | null
    position: string | null
    cardTime: string | null     // ISO without tz (Bangkok local)
    mobileTime: string | null
    varianceMinutes: number | null
    status: ReconStatus
    officialClockIn: string | null
    /** §1.3 — when status='on_leave' or the employee has an approved
     *  leave that day, surface the leave-type name so HR sees "ลาป่วย"
     *  instead of just "ลา". Null for non-leave rows. */
    leaveTypeName: string | null
    /** §3.16p2 — true when the employee has a half-day leave on this date.
     *  Used by the UI to show a "ลาครึ่งเช้า/บ่าย" badge alongside
     *  the underlying status (matched/card_only/etc.). */
    isHalfDayLeave: boolean
    halfDayLeavePeriod: 'morning' | 'afternoon' | null
}

export interface ReconSummary {
    date: string  // YYYY-MM-DD
    totalEmployees: number
    matched: number
    discrepancy: number
    cardOnly: number
    mobileOnly: number
    onLeave: number
    absent: number
    rows: ReconRow[]
    reconciledAt: string
}

/**
 * Our two sides store naive timestamps under different conventions:
 *   - card_scans.scan_time  = Bangkok wall-clock (UTC+7)
 *   - checkins.checked_in_at = UTC wall-clock (Node's toISOString)
 *
 * Giving each side the right explicit offset is what makes the
 * cross-source variance meaningful. Without this, two times that look
 * "07:35" (card) and "01:03" (mobile) read as ~6.5 hours apart even
 * though they're actually 28 minutes apart in real time.
 */
function toMs(ts: string | null, source: 'utc' | 'bangkok'): number | null {
    if (!ts) return null
    let s = ts.trim()
    if (!s.includes('T')) s = s.replace(' ', 'T')
    if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
        s = source === 'utc' ? `${s}Z` : `${s}+07:00`
    }
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.getTime()
}

// Compare card and mobile times; classify into one of 5 statuses.
function classify(
    cardMs: number | null,
    mobileMs: number | null,
): { status: ReconStatus; variance: number | null } {
    if (cardMs && mobileMs) {
        const variance = Math.abs(cardMs - mobileMs) / 60000
        return {
            status: variance <= DISCREPANCY_THRESHOLD_MIN ? 'matched' : 'discrepancy',
            variance: Math.round(variance * 10) / 10,
        }
    }
    if (cardMs) return { status: 'card_only', variance: null }
    if (mobileMs) return { status: 'mobile_only', variance: null }
    return { status: 'absent', variance: null }
}

// Compute + upsert attendance_logs for a single date. Idempotent.
export async function reconcileDate(
    date: string,
): Promise<{ processed: number; summary: ReconSummary } | { error: string }> {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'ไม่มีสิทธิ์เข้าถึง' }
    }
    const session = auth.session

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: 'รูปแบบวันที่ไม่ถูกต้อง' }
    }
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59.999`

    // 1. Active employees (excl. advisors)
    const { data: emps, error: empErr } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position')
        .eq('status', 'active')
    if (empErr) return { error: empErr.message }

    const staff = (emps ?? []).filter(
        e => e.position !== 'ที่ปรึกษา' && e.department !== 'ที่ปรึกษา',
    )

    // 2. Earliest card scan per employee for the day
    const { data: scans } = await supabaseAdmin
        .from('card_scans')
        .select('employee_id, scan_time')
        .gte('scan_time', dayStart)
        .lte('scan_time', dayEnd)
        .order('scan_time', { ascending: true })
    const cardByEmp = new Map<string, string>() // earliest
    for (const s of scans ?? []) {
        const eid = s.employee_id as string
        if (!cardByEmp.has(eid)) cardByEmp.set(eid, String(s.scan_time))
    }

    // 3. Earliest mobile checkin per employee for the day
    const { data: mobiles } = await supabaseAdmin
        .from('checkins')
        .select('employee_id, checked_in_at, source')
        .gte('checked_in_at', dayStart)
        .lte('checked_in_at', dayEnd)
        .order('checked_in_at', { ascending: true })
    const mobileByEmp = new Map<string, string>()
    for (const m of mobiles ?? []) {
        if (m.source === 'card') continue // card-source lives in card_scans now
        const eid = m.employee_id as string
        if (!mobileByEmp.has(eid)) mobileByEmp.set(eid, String(m.checked_in_at))
    }

    // 4. Existing attendance_logs for the date (to upsert without unique key)
    const { data: existingLogs } = await supabaseAdmin
        .from('attendance_logs')
        .select('id, employee_id, date')
        .gte('date', dayStart)
        .lte('date', dayEnd)
    const existingLogByEmp = new Map<string, string>() // employeeId → logId
    for (const l of existingLogs ?? []) {
        existingLogByEmp.set(l.employee_id as string, l.id as string)
    }

    // 4b. §1.3 — approved leaves that cover this date. Drives the
    // "absent → on_leave" reclassification so leave days never show
    // up as ขาด in the dashboard. We pull all leave types in one
    // round-trip to avoid N+1 lookups inside the row loop.
    const { data: leavesOnDate } = await supabaseAdmin
        .from('leave_requests')
        .select('employee_id, leave_type_id, is_half_day, half_day_period')
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date)
    const leaveTypeIds = Array.from(
        new Set((leavesOnDate ?? []).map(r => r.leave_type_id as string)),
    )
    const { data: leaveTypes } = leaveTypeIds.length
        ? await supabaseAdmin
            .from('leave_types')
            .select('id, name_th')
            .in('id', leaveTypeIds)
        : { data: [] as Array<{ id: string; name_th: string | null }> }
    const leaveTypeNameById = new Map<string, string>(
        (leaveTypes ?? []).map(t => [t.id as string, (t.name_th ?? '') as string]),
    )
    const leaveByEmp = new Map<string, { typeName: string; isHalfDay: boolean; halfDayPeriod: 'morning' | 'afternoon' | null }>()
    for (const r of leavesOnDate ?? []) {
        const eid = r.employee_id as string
        if (leaveByEmp.has(eid)) continue
        leaveByEmp.set(eid, {
            typeName: leaveTypeNameById.get(r.leave_type_id as string) ?? 'ลา',
            isHalfDay: Boolean(r.is_half_day),
            halfDayPeriod: (r.half_day_period as 'morning' | 'afternoon' | null) ?? null,
        })
    }

    // 5. Build reconciliation rows
    const reconciledAt = new Date().toISOString()
    const rows: ReconRow[] = []
    const upsertRecords: Record<string, unknown>[] = []

    for (const e of staff) {
        const cardTime = cardByEmp.get(e.id) ?? null
        const mobileTime = mobileByEmp.get(e.id) ?? null
        const classified = classify(
            toMs(cardTime, 'bangkok'),
            toMs(mobileTime, 'utc'),
        )
        const variance = classified.variance
        // §1.3 — if the employee has an approved (full-day) leave that
        // covers this date AND we'd otherwise mark them absent, flip
        // the status to 'on_leave' so it never reads as "ขาด". Half-day
        // leaves stay as their underlying status (the punch they DID
        // make is more informative than a leave label).
        const leaveOnDate = leaveByEmp.get(e.id) ?? null
        let status: ReconStatus = classified.status
        if (status === 'absent' && leaveOnDate && !leaveOnDate.isHalfDay) {
            status = 'on_leave'
        }
        const official =
            cardTime // card is the source of truth when present
                ? cardTime
                : mobileTime ?? null

        rows.push({
            employeeId: e.id,
            employeeCode: e.employee_code,
            firstNameTh: e.first_name_th ?? '',
            nickname: e.nickname ?? null,
            department: e.department ?? null,
            position: e.position ?? null,
            cardTime,
            mobileTime,
            varianceMinutes: variance,
            status,
            officialClockIn: official,
            leaveTypeName: leaveOnDate?.typeName ?? null,
            isHalfDayLeave: leaveOnDate?.isHalfDay ?? false,
            halfDayLeavePeriod: leaveOnDate?.halfDayPeriod ?? null,
        })

        const logId = existingLogByEmp.get(e.id)
        const record: Record<string, unknown> = {
            employee_id: e.id,
            date: dayStart,
            card_scan_time: cardTime,
            mobile_checkin_time: mobileTime,
            variance_minutes: variance,
            reconciliation_status: status,
            official_clock_in: official,
            source: cardTime ? 'card' : mobileTime ? 'mobile' : null,
            reconciled_at: reconciledAt,
            reconciled_by: session.id,
        }
        if (logId) {
            record.id = logId
        } else {
            // Generate cuid-like id locally since attendance_logs.id is text
            record.id = `al_${date.replace(/-/g, '')}_${e.id.slice(0, 8)}_${Math.random()
                .toString(36)
                .slice(2, 8)}`
            record.created_at = reconciledAt
        }
        record.updated_at = reconciledAt
        upsertRecords.push(record)
    }

    // 6. Upsert (simple pattern — insert with on_conflict = id)
    if (upsertRecords.length) {
        const { error: upErr } = await supabaseAdmin
            .from('attendance_logs')
            .upsert(upsertRecords, { onConflict: 'id' })
        if (upErr) {
            console.error('attendance_logs upsert error:', upErr)
            return { error: upErr.message }
        }
    }

    // Sort rows: discrepancy first (needs attention), then by status, then by name
    const statusOrder: Record<ReconStatus, number> = {
        discrepancy: 0,
        matched: 1,
        card_only: 2,
        mobile_only: 3,
        on_leave: 4,
        absent: 5,
    }
    rows.sort((a, b) => {
        const s = statusOrder[a.status] - statusOrder[b.status]
        if (s !== 0) return s
        return a.employeeCode.localeCompare(b.employeeCode)
    })

    const summary: ReconSummary = {
        date,
        totalEmployees: staff.length,
        matched: rows.filter(r => r.status === 'matched').length,
        discrepancy: rows.filter(r => r.status === 'discrepancy').length,
        cardOnly: rows.filter(r => r.status === 'card_only').length,
        mobileOnly: rows.filter(r => r.status === 'mobile_only').length,
        onLeave: rows.filter(r => r.status === 'on_leave').length,
        absent: rows.filter(r => r.status === 'absent').length,
        rows,
        reconciledAt,
    }

    revalidatePath('/hradmin/attendance/reconcile')
    return { processed: staff.length, summary }
}

export async function getReconciliation(
    date: string,
): Promise<ReconSummary | { error: string }> {
    const r = await reconcileDate(date)
    if ('error' in r) return r
    return r.summary
}
