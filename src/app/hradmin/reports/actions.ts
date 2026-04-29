'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { bangkokDateKey } from '@/lib/datetime'

// ─── Attendance Report ───────────────────────────────────────────────────────

export interface AttendanceRow {
    employeeId: string
    employeeCode: string
    employeeName: string
    department: string | null
    officeDays: number
    wfhDays: number
    offsiteDays: number
    /** Office check-ins where the Bangkok-local clock-in time was
     *  later than the company cutoff. See LATE_CUTOFF_MIN below. */
    lateDays: number
    /** Days the employee was on approved leave during the window
     *  (counted day-by-day; half-days count as 0.5 elsewhere but we
     *  round here for a clean integer column on Excel). */
    leaveDays: number
    /** Workdays in the window minus everything that was accounted for
     *  (any check-in type + leave). Holidays are subtracted from
     *  `workdays` first so they don't read as "absent". Never below 0. */
    absentDays: number
    totalDays: number
}

export interface AttendanceReport {
    /** Inclusive window the report covers. Bangkok-local YYYY-MM-DD. */
    fromDate: string
    toDate: string
    /** Net working days (Mon–Fri minus public/religious/company
     *  holidays). WFH days NOT subtracted — those are working too,
     *  just remote. */
    workdays: number
    /** Public/religious/company holidays inside the window. WFH days
     *  in the calendar table are NOT counted as holidays. */
    holidays: number
    /** Convenience legacy fields — set when the window is exactly one
     *  calendar month so the existing CSV filename and chart copy
     *  keep working unchanged. Both null when granularity is week or
     *  custom range. */
    month: number | null
    year: number | null
    rows: AttendanceRow[]
    typeBreakdown: { type: string; count: number; color: string }[]
}

/** Cutoff used to flag a check-in as "มาสาย".
 *  08:30 = Bangkok minutes-of-day = 510. Hard-coded for v1 because
 *  EBCI doesn't yet store a per-office shift schedule; once HR settles
 *  on cutoff(s) per role/office we'll move this into a config table. */
const LATE_CUTOFF_MIN = 8 * 60 + 30

/** YYYY-MM-DD comparator helper. Strings sort correctly because the
 *  format is fixed-width. */
const dateKeyInRange = (key: string, from: string, to: string) =>
    key >= from && key <= to

/** Iterate from-date → to-date inclusive yielding YYYY-MM-DD keys.
 *  We use string concatenation rather than Date arithmetic to avoid
 *  DST / timezone surprises (the keys are Bangkok-local). */
function* dateKeysInclusive(from: string, to: string) {
    const [fy, fm, fd] = from.split('-').map(Number)
    const [ty, tm, td] = to.split('-').map(Number)
    const cur = new Date(Date.UTC(fy, fm - 1, fd))
    const end = new Date(Date.UTC(ty, tm - 1, td))
    while (cur <= end) {
        const y = cur.getUTCFullYear()
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
        const d = String(cur.getUTCDate()).padStart(2, '0')
        yield `${y}-${m}-${d}`
        cur.setUTCDate(cur.getUTCDate() + 1)
    }
}

/** Count weekdays (Mon=1 … Fri=5) between fromDate + toDate inclusive,
 *  excluding any keys present in `holidayKeys`. */
function countNetWorkdays(from: string, to: string, holidayKeys: Set<string>): {
    workdays: number
    holidays: number
} {
    let workdays = 0
    let holidays = 0
    for (const key of dateKeysInclusive(from, to)) {
        const [y, m, d] = key.split('-').map(Number)
        const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
        if (dow < 1 || dow > 5) continue          // skip Sat/Sun
        if (holidayKeys.has(key)) {
            holidays++
            continue
        }
        workdays++
    }
    return { workdays, holidays }
}

/**
 * Range-based attendance report. The parameter shape (fromDate, toDate)
 * supports the new granularity selector — month/week/custom range —
 * by collapsing every variant into the same date-pair contract before
 * the query runs. Keep this signature stable; the UI layer is the only
 * place that knows about "granularity".
 *
 * Both dates are Bangkok-local YYYY-MM-DD strings, inclusive.
 */
export async function getAttendanceReport(
    fromDate: string,
    toDate: string,
    department?: string,
): Promise<AttendanceReport | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return { error: 'ไม่มีสิทธิ์เข้าถึง' }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        return { error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' }
    }
    if (fromDate > toDate) {
        return { error: 'วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด' }
    }

    // Convert to UTC instants the checkins query understands. The
    // Bangkok day [00:00,24:00) in UTC = the previous day 17:00 to
    // current day 17:00; the query covers a wider UTC window than
    // strictly needed and we filter precisely later via bangkokDateKey.
    const [fy, fm, fd] = fromDate.split('-').map(Number)
    const [ty, tm, td] = toDate.split('-').map(Number)
    const start = new Date(Date.UTC(fy, fm - 1, fd, -7))           // Bangkok 00:00 of fromDate
    const end   = new Date(Date.UTC(ty, tm - 1, td + 1, -7))       // Bangkok 00:00 of (toDate + 1)

    // Detect "exactly one calendar month" so the legacy month/year
    // filename + chart copy can keep working unchanged. Both null
    // when the window crosses a month boundary or covers a partial.
    const monthBoundary = (
        fromDate.endsWith('-01')
        && fy === ty && fm === tm
        && Number(toDate.slice(8)) === new Date(Date.UTC(fy, fm, 0)).getUTCDate()
    )
    const month = monthBoundary ? fm : null
    const year  = monthBoundary ? fy : null

    // Holidays in the window — used both to subtract from workdays
    // and to flag "ขาดงาน" correctly. WFH-typed calendar entries are
    // working days for everyone, so they're EXCLUDED from this set.
    const { data: holidayRows } = await supabaseAdmin
        .from('holidays')
        .select('date, type')
        .gte('date', fromDate)
        .lte('date', toDate)
    const holidayKeys = new Set<string>()
    for (const h of holidayRows ?? []) {
        if ((h.type as string) === 'wfh') continue
        holidayKeys.add(h.date as string)
    }
    const { workdays, holidays } = countNetWorkdays(fromDate, toDate, holidayKeys)

    const empQuery = supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, department')
        .eq('status', 'active')
    if (department) empQuery.eq('department', department)
    const { data: employees, error: empErr } = await empQuery
    if (empErr) return { error: empErr.message }

    const employeeIds = (employees ?? []).map(e => e.id)
    if (!employeeIds.length) {
        return {
            fromDate, toDate, workdays, holidays, month, year,
            rows: [], typeBreakdown: [],
        }
    }

    const { data: checkins, error: chkErr } = await supabaseAdmin
        .from('checkins')
        .select('employee_id, type, checked_in_at')
        .gte('checked_in_at', start.toISOString())
        .lt('checked_in_at', end.toISOString())
        .in('employee_id', employeeIds)
    if (chkErr) return { error: chkErr.message }

    // Approved leave requests overlapping the window. Compute the
    // per-employee count of days inside [fromDate, toDate] that fall
    // within at least one approved request — used for the "ลา" column
    // and feeds into the absent calculation.
    const { data: leaveRows } = await supabaseAdmin
        .from('leave_requests')
        .select('employee_id, start_date, end_date, status')
        .eq('status', 'approved')
        .lte('start_date', toDate)
        .gte('end_date', fromDate)
        .in('employee_id', employeeIds)

    const leaveDaysByEmp = new Map<string, Set<string>>()
    for (const lr of leaveRows ?? []) {
        const empId = lr.employee_id as string
        const set = leaveDaysByEmp.get(empId) ?? new Set<string>()
        for (const key of dateKeysInclusive(
            (lr.start_date as string).slice(0, 10),
            (lr.end_date as string).slice(0, 10),
        )) {
            if (!dateKeyInRange(key, fromDate, toDate)) continue
            // Don't double-count holidays — leave-on-a-holiday isn't
            // really a "leave day" since the company was closed.
            if (holidayKeys.has(key)) continue
            // Skip Sat/Sun — leave on a non-workday doesn't burn.
            const [y, m, d] = key.split('-').map(Number)
            const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
            if (dow < 1 || dow > 5) continue
            set.add(key)
        }
        leaveDaysByEmp.set(empId, set)
    }

    // Count unique days per employee per type (not per checkin).
    // `checked_in_at` is stored as UTC wall-clock — slicing the raw
    // ISO directly produces the wrong calendar date for events between
    // 17:00-24:00 UTC (= 00:00-07:00 Bangkok next day). Convert to the
    // Bangkok-local YYYY-MM-DD before grouping. Late-day detection
    // walks the same loop so we don't pay for a second pass.
    interface EmpBucket {
        office: Set<string>
        wfh: Set<string>
        offsite: Set<string>
        late: Set<string>
    }
    const perEmp = new Map<string, EmpBucket>()
    for (const c of checkins ?? []) {
        const checkInIso = c.checked_in_at as string
        const day = bangkokDateKey(checkInIso, 'utc')
        if (!day) continue
        if (!dateKeyInRange(day, fromDate, toDate)) continue
        const bucket = perEmp.get(c.employee_id) ?? {
            office: new Set(), wfh: new Set(), offsite: new Set(), late: new Set(),
        }
        const t = c.type as string
        if (t === 'office') bucket.office.add(day)
        else if (t === 'wfh') bucket.wfh.add(day)
        else bucket.offsite.add(day)

        // Only office check-ins can be "late" — WFH/field bypass the
        // geofenced cutoff and shouldn't count as tardy.
        if (t === 'office') {
            const utcDate = new Date(checkInIso.endsWith('Z') ? checkInIso : `${checkInIso}Z`)
            // Bangkok = UTC+7. Compute minute-of-day in Bangkok.
            const bkkMs = utcDate.getTime() + 7 * 60 * 60 * 1000
            const bkk = new Date(bkkMs)
            const minOfDay = bkk.getUTCHours() * 60 + bkk.getUTCMinutes()
            if (minOfDay > LATE_CUTOFF_MIN) bucket.late.add(day)
        }
        perEmp.set(c.employee_id, bucket)
    }

    let totalOffice = 0
    let totalWfh = 0
    let totalOffsite = 0

    const rows: AttendanceRow[] = (employees ?? []).map(e => {
        const b: EmpBucket = perEmp.get(e.id) ?? {
            office: new Set(), wfh: new Set(), offsite: new Set(), late: new Set(),
        }
        const officeDays = b.office.size
        const wfhDays = b.wfh.size
        const offsiteDays = b.offsite.size
        const lateDays = b.late.size
        const leaveDays = leaveDaysByEmp.get(e.id)?.size ?? 0
        const totalDays = officeDays + wfhDays + offsiteDays
        // ขาด = workdays in window − everything accounted for. Floored
        // at 0 because someone could in theory check in on a holiday
        // (which counts in `totalDays` but not in `workdays`), making
        // the naive subtraction go negative.
        const absentDays = Math.max(0, workdays - totalDays - leaveDays)
        totalOffice += officeDays
        totalWfh += wfhDays
        totalOffsite += offsiteDays
        return {
            employeeId: e.id,
            employeeCode: e.employee_code,
            employeeName: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim(),
            department: e.department,
            officeDays,
            wfhDays,
            offsiteDays,
            lateDays,
            leaveDays,
            absentDays,
            totalDays,
        }
    })

    rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode))

    return {
        fromDate, toDate, workdays, holidays, month, year, rows,
        typeBreakdown: [
            { type: 'เข้าออฟฟิศ', count: totalOffice, color: '#60A5FA' },
            { type: 'WFH', count: totalWfh, color: '#34D399' },
            { type: 'Off-site', count: totalOffsite, color: '#FBBF24' },
        ],
    }
}

// ─── Leave Report ─────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด',
    ordination: 'ลาบวช',
}
const LEAVE_COLORS: Record<string, string> = {
    sick: '#A78BFA', personal: '#F472B6', annual: '#60A5FA',
    maternity: '#34D399', ordination: '#FBBF24',
}

export interface LeaveRow {
    employeeId: string
    employeeCode: string
    employeeName: string
    department: string | null
    byType: Record<string, number> // sick: days, annual: days, ...
    total: number
}

export interface LeaveReport {
    year: number
    typeBreakdown: { label: string; type: string; count: number; color: string }[]
    rows: LeaveRow[]
}

export async function getLeaveReport(year: number, department?: string): Promise<LeaveReport | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return { error: 'ไม่มีสิทธิ์เข้าถึง' }

    const start = new Date(Date.UTC(year, 0, 1)).toISOString()
    const end = new Date(Date.UTC(year + 1, 0, 1)).toISOString()

    const { data: leaves, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id,
            employee_id,
            leave_type,
            total_days,
            start_date,
            employees!leave_requests_employee_id_fkey!inner (
                id,
                employee_code,
                first_name_th,
                last_name_th,
                department
            )
        `)
        .eq('status', 'approved')
        .gte('start_date', start)
        .lt('start_date', end)
    if (error) return { error: error.message }

    type LeaveRow0 = {
        employee_id: string
        leave_type: string
        total_days: number | null
        employees: {
            employee_code: string
            first_name_th: string | null
            last_name_th: string | null
            department: string | null
        }
    }
    const filtered = (leaves as unknown as LeaveRow0[] ?? []).filter(
        l => !department || l.employees?.department === department
    )

    const perEmp = new Map<string, LeaveRow>()
    const typeTotals: Record<string, number> = {}

    for (const l of filtered) {
        const days = l.total_days ?? 0
        typeTotals[l.leave_type] = (typeTotals[l.leave_type] ?? 0) + days
        const emp = l.employees
        const existing = perEmp.get(l.employee_id) ?? {
            employeeId: l.employee_id,
            employeeCode: emp?.employee_code ?? '',
            employeeName: `${emp?.first_name_th ?? ''} ${emp?.last_name_th ?? ''}`.trim(),
            department: emp?.department ?? null,
            byType: {},
            total: 0,
        }
        existing.byType[l.leave_type] = (existing.byType[l.leave_type] ?? 0) + days
        existing.total += days
        perEmp.set(l.employee_id, existing)
    }

    const rows = Array.from(perEmp.values()).sort((a, b) => b.total - a.total)

    const typeBreakdown = Object.entries(typeTotals)
        .map(([type, count]) => ({
            type,
            label: LEAVE_TYPE_LABELS[type] ?? type,
            count,
            color: LEAVE_COLORS[type] ?? '#94A3B8',
        }))
        .sort((a, b) => b.count - a.count)

    return { year, typeBreakdown, rows }
}

// ─── Contract Report ──────────────────────────────────────────────────────────

export interface ContractRow {
    employeeId: string
    employeeCode: string
    employeeName: string
    department: string | null
    position: string | null
    employmentType: string
    startDate: string
    tenureMonths: number
}

export interface ContractReport {
    rows: ContractRow[]
    byType: { type: string; count: number; color: string }[]
}

const EMP_TYPE_LABELS: Record<string, string> = {
    'full-time': 'ประจำ',
    contract: 'สัญญาจ้าง',
    intern: 'ฝึกงาน',
}
const EMP_TYPE_COLORS: Record<string, string> = {
    'full-time': '#60A5FA',
    contract: '#FBBF24',
    intern: '#F472B6',
}

export async function getContractReport(): Promise<ContractReport | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return { error: 'ไม่มีสิทธิ์เข้าถึง' }

    const { data: employees, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, department, position, employment_type, start_date')
        .eq('status', 'active')
        .order('start_date', { ascending: true })

    if (error) return { error: error.message }

    const now = Date.now()
    const rows: ContractRow[] = (employees ?? []).map(e => {
        const start = new Date(e.start_date ?? Date.now())
        const months = Math.max(0, Math.round((now - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
        return {
            employeeId: e.id,
            employeeCode: e.employee_code,
            employeeName: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim(),
            department: e.department,
            position: e.position,
            employmentType: e.employment_type ?? 'full-time',
            startDate: (e.start_date as string)?.slice(0, 10) ?? '',
            tenureMonths: months,
        }
    })

    const counts: Record<string, number> = {}
    for (const r of rows) counts[r.employmentType] = (counts[r.employmentType] ?? 0) + 1
    const byType = Object.entries(counts).map(([type, count]) => ({
        type: EMP_TYPE_LABELS[type] ?? type,
        count,
        color: EMP_TYPE_COLORS[type] ?? '#94A3B8',
    }))

    return { rows, byType }
}

// ─── Department List (for filters) ────────────────────────────────────────────

export async function getDepartments(): Promise<string[]> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('department')
        .eq('status', 'active')

    const unique = Array.from(
        new Set((data ?? []).map(e => e.department as string | null).filter((d): d is string => !!d))
    )
    return unique.sort()
}
