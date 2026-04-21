'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const DISCREPANCY_THRESHOLD_MIN = 10

export type ReconStatus =
    | 'matched'        // card + mobile within threshold
    | 'discrepancy'    // card + mobile but > threshold
    | 'card_only'
    | 'mobile_only'
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
}

export interface ReconSummary {
    date: string  // YYYY-MM-DD
    totalEmployees: number
    matched: number
    discrepancy: number
    cardOnly: number
    mobileOnly: number
    absent: number
    rows: ReconRow[]
    reconciledAt: string
}

function toMs(ts: string | null): number | null {
    if (!ts) return null
    // "YYYY-MM-DD HH:MM:SS" or ISO — parse both
    const normalized = ts.includes('T') ? ts : ts.replace(' ', 'T')
    const d = new Date(normalized)
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
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง' }
    }

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

    // 5. Build reconciliation rows
    const reconciledAt = new Date().toISOString()
    const rows: ReconRow[] = []
    const upsertRecords: Record<string, unknown>[] = []

    for (const e of staff) {
        const cardTime = cardByEmp.get(e.id) ?? null
        const mobileTime = mobileByEmp.get(e.id) ?? null
        const { status, variance } = classify(toMs(cardTime), toMs(mobileTime))
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
        absent: 4,
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
