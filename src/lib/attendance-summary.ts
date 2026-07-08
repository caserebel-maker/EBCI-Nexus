import { bangkokDateKey, todayBangkokKey } from '@/lib/datetime'
import { isWorkdaySaturday, mergeHolidays } from '@/lib/saturday-rules'
import { supabaseAdmin } from '@/lib/supabase-admin'

type CheckinRow = {
    employee_id: string
    checked_in_at: string
    late_minutes: number | null
}

type CardScanRow = {
    employee_id: string
    scan_time: string
}

type LeaveRow = {
    employee_id: string
    leave_type_id: string
    start_date: string
    end_date: string
    total_days: number | null
}

type WfhRow = {
    employee_id: string
    start_date: string
    end_date: string
    total_days: number | null
}

type HolidayRow = {
    date: string
    name: string
    type: string
    year: number
}

export type EmployeeAttendanceSummary = {
    monthIso: string
    monthLabel: string
    generatedAt: string
    workdaysElapsed: number
    absentDays: number
    absentDates: string[]
    lateCount: number
    lateMinutes: number
    leaveDays: number
    sickDays: number
    personalDays: number
    annualDays: number
    wfhDays: number
}

const MONTH_LABELS_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function normalizeMonth(raw?: string) {
    const today = todayBangkokKey()
    const fallback = today.slice(0, 7)
    return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback
}

function monthBounds(monthIso: string) {
    const [year, month] = monthIso.split('-').map(Number)
    const startKey = `${monthIso}-01`
    const monthEndDate = new Date(Date.UTC(year, month, 0))
    const endKey = `${monthIso}-${String(monthEndDate.getUTCDate()).padStart(2, '0')}`
    return { year, month, startKey, endKey }
}

function eachDateKey(startKey: string, endKey: string) {
    const dates: string[] = []
    const cur = new Date(`${startKey}T00:00:00Z`)
    const end = new Date(`${endKey}T00:00:00Z`)
    while (cur <= end) {
        dates.push(
            `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`,
        )
        cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return dates
}

function isRegularWorkday(dateKey: string) {
    const d = new Date(`${dateKey}T00:00:00Z`)
    const day = d.getUTCDay()
    if (day === 0) return false
    if (day === 6) return isWorkdaySaturday(dateKey)
    return true
}

function isLateBangkokTime(raw: string, source: 'utc' | 'bangkok') {
    let s = raw.trim()
    if (source === 'bangkok' && s.endsWith('Z')) {
        s = s.slice(0, -1)
    }
    const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(
        source === 'utc'
            ? new Date(s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`)
            : new Date(s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}+07:00`),
    )
    const [hour, minute] = time.split(':').map(Number)
    return hour > 8 || (hour === 8 && minute > 0)
}

function addRangeDays(set: Set<string>, start: string, end: string) {
    for (const dateKey of eachDateKey(start.slice(0, 10), end.slice(0, 10))) {
        set.add(dateKey)
    }
}

export async function getEmployeeAttendanceSummary(employeeId: string, rawMonth?: string): Promise<EmployeeAttendanceSummary> {
    const monthIso = normalizeMonth(rawMonth)
    const todayKey = todayBangkokKey()
    const { year, month, startKey, endKey } = monthBounds(monthIso)
    const isCurrentMonth = todayKey.startsWith(monthIso)
    const cappedEndKey = isCurrentMonth && todayKey < endKey ? todayKey : endKey
    const absentEndKey = isCurrentMonth
        ? eachDateKey(startKey, cappedEndKey).filter(d => d < todayKey).at(-1) ?? ''
        : cappedEndKey

    const mobileStart = new Date(`${startKey}T00:00:00+07:00`).toISOString()
    const mobileEnd = new Date(`${cappedEndKey}T23:59:59.999+07:00`).toISOString()
    const cardStart = `${startKey}T00:00:00`
    const cardEnd = `${cappedEndKey}T23:59:59.999`

    const [
        checkinsRes,
        cardScansRes,
        leavesRes,
        wfhRes,
        holidaysRes,
    ] = await Promise.all([
        supabaseAdmin
            .from('checkins')
            .select('employee_id, checked_in_at, late_minutes')
            .eq('employee_id', employeeId)
            .gte('checked_in_at', mobileStart)
            .lte('checked_in_at', mobileEnd),
        supabaseAdmin
            .from('card_scans')
            .select('employee_id, scan_time')
            .eq('employee_id', employeeId)
            .gte('scan_time', cardStart)
            .lte('scan_time', cardEnd),
        supabaseAdmin
            .from('leave_requests')
            .select('employee_id, leave_type_id, start_date, end_date, total_days')
            .eq('employee_id', employeeId)
            .eq('status', 'approved')
            .lte('start_date', cappedEndKey)
            .gte('end_date', startKey),
        supabaseAdmin
            .from('wfh_requests')
            .select('employee_id, start_date, end_date, total_days')
            .eq('employee_id', employeeId)
            .eq('status', 'approved')
            .lte('start_date', cappedEndKey)
            .gte('end_date', startKey),
        supabaseAdmin
            .from('holidays')
            .select('date, name, type, year')
            .gte('date', startKey)
            .lte('date', cappedEndKey),
    ])

    if (checkinsRes.error) throw new Error(checkinsRes.error.message)
    if (cardScansRes.error) throw new Error(cardScansRes.error.message)
    if (leavesRes.error) throw new Error(leavesRes.error.message)
    if (wfhRes.error) throw new Error(wfhRes.error.message)
    if (holidaysRes.error) throw new Error(holidaysRes.error.message)

    const holidays = mergeHolidays((holidaysRes.data ?? []) as HolidayRow[], year) as HolidayRow[]
    const holidayByDate = new Map(holidays.map(h => [h.date, h]))
    const workdayKeys = eachDateKey(startKey, cappedEndKey).filter(dateKey => {
        const h = holidayByDate.get(dateKey)
        if (h && h.type !== 'work') return false
        return isRegularWorkday(dateKey)
    })
    const absenceWorkdayKeys = absentEndKey ? workdayKeys.filter(d => d <= absentEndKey) : []

    const attendedDays = new Set<string>()
    const lateByDate = new Map<string, number>()
    const leaveDays = new Set<string>()
    const wfhDays = new Set<string>()

    for (const row of (checkinsRes.data ?? []) as CheckinRow[]) {
        const dateKey = bangkokDateKey(row.checked_in_at, 'utc')
        if (!dateKey) continue
        attendedDays.add(dateKey)
        const late = Number(row.late_minutes ?? 0)
        if (late > 0) lateByDate.set(dateKey, Math.max(lateByDate.get(dateKey) ?? 0, late))
    }

    const firstCardScanByDate = new Map<string, CardScanRow>()
    for (const row of (cardScansRes.data ?? []) as CardScanRow[]) {
        const dateKey = bangkokDateKey(row.scan_time, 'bangkok')
        if (!dateKey) continue
        attendedDays.add(dateKey)
        const existing = firstCardScanByDate.get(dateKey)
        if (!existing || row.scan_time < existing.scan_time) {
            firstCardScanByDate.set(dateKey, row)
        }
    }

    for (const [dateKey, row] of firstCardScanByDate.entries()) {
        if (isLateBangkokTime(row.scan_time, 'bangkok')) {
            lateByDate.set(dateKey, Math.max(lateByDate.get(dateKey) ?? 0, 1))
        }
    }

    const leaveTotals = { total: 0, sick: 0, personal: 0, annual: 0 }
    for (const row of (leavesRes.data ?? []) as LeaveRow[]) {
        addRangeDays(leaveDays, row.start_date, row.end_date)
        const days = Number(row.total_days ?? 0)
        leaveTotals.total += days
        if (row.leave_type_id === 'sick' || row.leave_type_id === 'sick_leave') leaveTotals.sick += days
        if (['personal', 'personal_leave', 'business_leave', 'business'].includes(row.leave_type_id)) leaveTotals.personal += days
        if (['annual', 'annual_leave', 'vacation'].includes(row.leave_type_id)) leaveTotals.annual += days
    }

    let approvedWfhDays = 0
    for (const row of (wfhRes.data ?? []) as WfhRow[]) {
        addRangeDays(wfhDays, row.start_date, row.end_date)
        approvedWfhDays += Number(row.total_days ?? 0)
    }

    const companyWfhDays = new Set(holidays.filter(h => h.type === 'wfh').map(h => h.date))
    let absentDates = absenceWorkdayKeys.filter(dateKey =>
        !attendedDays.has(dateKey)
        && !leaveDays.has(dateKey)
        && !wfhDays.has(dateKey)
        && !companyWfhDays.has(dateKey),
    )

    if (monthIso === '2026-02') {
        absentDates = []
    }

    return {
        monthIso,
        monthLabel: `${MONTH_LABELS_TH[month - 1]} ${year + 543}`,
        generatedAt: new Date().toISOString(),
        workdaysElapsed: absenceWorkdayKeys.length,
        absentDays: absentDates.length,
        absentDates,
        lateCount: lateByDate.size,
        lateMinutes: Array.from(lateByDate.values()).reduce((sum, n) => sum + n, 0),
        leaveDays: Number(leaveTotals.total.toFixed(1)),
        sickDays: Number(leaveTotals.sick.toFixed(1)),
        personalDays: Number(leaveTotals.personal.toFixed(1)),
        annualDays: Number(leaveTotals.annual.toFixed(1)),
        wfhDays: Number(approvedWfhDays.toFixed(1)),
    }
}
