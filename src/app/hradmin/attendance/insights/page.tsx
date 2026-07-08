import { redirect } from 'next/navigation'
import { canViewAttendanceInsights, getAuth } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokDateKey, todayBangkokKey } from '@/lib/datetime'
import { isWorkdaySaturday, mergeHolidays } from '@/lib/saturday-rules'
import { AttendanceInsightsView, type AttendanceInsightsData } from './insights-view'

export const dynamic = 'force-dynamic'

interface SearchParams {
    month?: string
}

type EmployeeRow = {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    is_advisor: boolean | null
}

type CheckinRow = {
    employee_id: string
    type: string | null
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
    status: string
    is_half_day: boolean | null
}

type WfhRow = {
    employee_id: string
    start_date: string
    end_date: string
    total_days: number | null
    status: string
}

type HolidayRow = {
    date: string
    name: string
    type: string
    year: number
}

const MONTH_LABELS_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const ATTENDANCE_INSIGHTS_EXCLUDED_EMPLOYEE_CODES = new Set([
    '001-29', // สายัณห์ จันทร์วิภาสวงศ์
    '009-35', // ชรินทร์ทิพย์ ชมชูเวชช์
    '021-42', // ศุภดล แสนทวีสุข
    '048-45', // พันธ์ทิพย์ สร้อยมณี
    '161-51', // ราเชนทร์ เข้มกลม
    '491-67', // ชยุต กุลธนาวัฒน์
])

function normalizeMonth(raw: string | undefined) {
    const today = todayBangkokKey()
    const fallback = today.slice(0, 7)
    return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback
}

function monthBounds(monthIso: string) {
    const [year, month] = monthIso.split('-').map(Number)
    const startKey = `${monthIso}-01`
    const monthEndDate = new Date(year, month, 0)
    const endKey = `${monthIso}-${String(monthEndDate.getDate()).padStart(2, '0')}`
    return { year, month, startKey, endKey }
}

function eachDateKey(startKey: string, endKey: string) {
    const dates: string[] = []
    const cur = new Date(`${startKey}T00:00:00+07:00`)
    const end = new Date(`${endKey}T00:00:00+07:00`)
    while (cur <= end) {
        dates.push(
            `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
        )
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

function isRegularWorkday(dateKey: string) {
    const d = new Date(`${dateKey}T00:00:00+07:00`)
    const day = d.getDay()
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

function fullName(e: EmployeeRow) {
    const name = `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim()
    return name || e.nickname || e.employee_code || 'ไม่ระบุชื่อ'
}

function isExcludedFromAttendanceInsights(e: EmployeeRow) {
    return Boolean(
        e.is_advisor ||
        (e.employee_code && ATTENDANCE_INSIGHTS_EXCLUDED_EMPLOYEE_CODES.has(e.employee_code)),
    )
}

function addRangeDays(map: Map<string, Set<string>>, employeeId: string, start: string, end: string) {
    for (const dateKey of eachDateKey(start.slice(0, 10), end.slice(0, 10))) {
        const set = map.get(employeeId) ?? new Set<string>()
        set.add(dateKey)
        map.set(employeeId, set)
    }
}

export default async function AttendanceInsightsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canViewAttendanceInsights(auth)) redirect('/hradmin/dashboard')

    const sp = await searchParams
    const monthIso = normalizeMonth(sp.month)
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
        employeesRes,
        checkinsRes,
        cardScansRes,
        leavesRes,
        wfhRes,
        holidaysRes,
    ] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, is_advisor')
            .eq('status', 'active')
            .order('first_name_th', { ascending: true }),
        supabaseAdmin
            .from('checkins')
            .select('employee_id, type, checked_in_at, late_minutes')
            .gte('checked_in_at', mobileStart)
            .lte('checked_in_at', mobileEnd),
        supabaseAdmin
            .from('card_scans')
            .select('employee_id, scan_time')
            .gte('scan_time', cardStart)
            .lte('scan_time', cardEnd),
        supabaseAdmin
            .from('leave_requests')
            .select('employee_id, leave_type_id, start_date, end_date, total_days, status, is_half_day')
            .eq('status', 'approved')
            .lte('start_date', cappedEndKey)
            .gte('end_date', startKey),
        supabaseAdmin
            .from('wfh_requests')
            .select('employee_id, start_date, end_date, total_days, status')
            .eq('status', 'approved')
            .lte('start_date', cappedEndKey)
            .gte('end_date', startKey),
        supabaseAdmin
            .from('holidays')
            .select('date, name, type, year')
            .gte('date', startKey)
            .lte('date', cappedEndKey),
    ])

    if (employeesRes.error) throw new Error(employeesRes.error.message)
    if (checkinsRes.error) throw new Error(checkinsRes.error.message)
    if (cardScansRes.error) throw new Error(cardScansRes.error.message)
    if (leavesRes.error) throw new Error(leavesRes.error.message)
    if (wfhRes.error) throw new Error(wfhRes.error.message)
    if (holidaysRes.error) throw new Error(holidaysRes.error.message)

    const employees = ((employeesRes.data ?? []) as EmployeeRow[]).filter(e => !isExcludedFromAttendanceInsights(e))
    const employeeIds = new Set(employees.map(e => e.id))
    const holidays = mergeHolidays((holidaysRes.data ?? []) as HolidayRow[], year) as HolidayRow[]
    const holidayByDate = new Map(holidays.map(h => [h.date, h]))
    const workdayKeys = eachDateKey(startKey, cappedEndKey).filter(dateKey => {
        const h = holidayByDate.get(dateKey)
        if (h && h.type !== 'work') return false
        return isRegularWorkday(dateKey)
    })
    const absenceWorkdayKeys = absentEndKey ? workdayKeys.filter(d => d <= absentEndKey) : []

    const attendedByEmployee = new Map<string, Set<string>>()
    const lateByEmployee = new Map<string, Map<string, number>>()
    const wfhByEmployee = new Map<string, Set<string>>()
    const leaveByEmployee = new Map<string, Set<string>>()
    const leaveDaysByEmployee = new Map<string, { total: number; sick: number; personal: number; annual: number }>()
    const wfhDaysByEmployee = new Map<string, number>()

    for (const row of (checkinsRes.data ?? []) as CheckinRow[]) {
        if (!employeeIds.has(row.employee_id)) continue
        const dateKey = bangkokDateKey(row.checked_in_at, 'utc')
        if (!dateKey) continue
        const attended = attendedByEmployee.get(row.employee_id) ?? new Set<string>()
        attended.add(dateKey)
        attendedByEmployee.set(row.employee_id, attended)

        const late = Number(row.late_minutes ?? 0)
        if (late > 0) {
            const perDay = lateByEmployee.get(row.employee_id) ?? new Map<string, number>()
            perDay.set(dateKey, Math.max(perDay.get(dateKey) ?? 0, late))
            lateByEmployee.set(row.employee_id, perDay)
        }
    }

    // HIP card data can contain several scans per day (morning in,
    // lunch, afternoon, evening out) and older sync rows do not always
    // carry a reliable scan_type. For lateness, only the FIRST scan of
    // each employee/day is an arrival signal. Later scans still prove
    // attendance but must not be counted as "มาสาย".
    const firstCardScanByEmployeeDate = new Map<string, CardScanRow>()
    for (const row of (cardScansRes.data ?? []) as CardScanRow[]) {
        if (!employeeIds.has(row.employee_id)) continue
        const dateKey = bangkokDateKey(row.scan_time, 'bangkok')
        if (!dateKey) continue
        const attended = attendedByEmployee.get(row.employee_id) ?? new Set<string>()
        attended.add(dateKey)
        attendedByEmployee.set(row.employee_id, attended)

        const key = `${row.employee_id}:${dateKey}`
        const existing = firstCardScanByEmployeeDate.get(key)
        if (!existing || row.scan_time < existing.scan_time) {
            firstCardScanByEmployeeDate.set(key, row)
        }
    }

    for (const [key, row] of firstCardScanByEmployeeDate.entries()) {
        const [employeeId, dateKey] = key.split(':')
        if (employeeId && dateKey && isLateBangkokTime(row.scan_time, 'bangkok')) {
            const perDay = lateByEmployee.get(row.employee_id) ?? new Map<string, number>()
            perDay.set(dateKey, Math.max(perDay.get(dateKey) ?? 0, 1))
            lateByEmployee.set(row.employee_id, perDay)
        }
    }

    for (const row of (leavesRes.data ?? []) as LeaveRow[]) {
        if (!employeeIds.has(row.employee_id)) continue
        addRangeDays(leaveByEmployee, row.employee_id, row.start_date, row.end_date)
        const current = leaveDaysByEmployee.get(row.employee_id) ?? { total: 0, sick: 0, personal: 0, annual: 0 }
        const days = Number(row.total_days ?? 0)
        current.total += days
        if (row.leave_type_id === 'sick' || row.leave_type_id === 'sick_leave') current.sick += days
        if (['personal', 'personal_leave', 'business_leave', 'business'].includes(row.leave_type_id)) current.personal += days
        if (['annual', 'annual_leave', 'vacation'].includes(row.leave_type_id)) current.annual += days
        leaveDaysByEmployee.set(row.employee_id, current)
    }

    for (const row of (wfhRes.data ?? []) as WfhRow[]) {
        if (!employeeIds.has(row.employee_id)) continue
        addRangeDays(wfhByEmployee, row.employee_id, row.start_date, row.end_date)
        wfhDaysByEmployee.set(row.employee_id, (wfhDaysByEmployee.get(row.employee_id) ?? 0) + Number(row.total_days ?? 0))
    }

    // Company-wide WFH days count as working off-site, not absence.
    const companyWfhDays = new Set(holidays.filter(h => h.type === 'wfh').map(h => h.date))

    const rows = employees.map(employee => {
        const attended = attendedByEmployee.get(employee.id) ?? new Set<string>()
        const leaveDays = leaveByEmployee.get(employee.id) ?? new Set<string>()
        const wfhDays = wfhByEmployee.get(employee.id) ?? new Set<string>()
        const lateDayMap = lateByEmployee.get(employee.id) ?? new Map<string, number>()
        const leaveTotals = leaveDaysByEmployee.get(employee.id) ?? { total: 0, sick: 0, personal: 0, annual: 0 }
        const absentDates = absenceWorkdayKeys.filter(dateKey =>
            !attended.has(dateKey)
            && !leaveDays.has(dateKey)
            && !wfhDays.has(dateKey)
            && !companyWfhDays.has(dateKey),
        )
        const lateCount = lateDayMap.size
        const lateMinutes = Array.from(lateDayMap.values()).reduce((sum, n) => sum + n, 0)
        const riskScore = absentDates.length * 3 + lateCount * 2 + leaveTotals.sick + leaveTotals.personal * 0.5
        let riskLevel: AttendanceInsightsData['employees'][number]['riskLevel'] = 'normal'
        if (absentDates.length >= 2 || lateCount >= 5 || leaveTotals.sick >= 5 || riskScore >= 12) riskLevel = 'high'
        else if (absentDates.length >= 1 || lateCount >= 3 || leaveTotals.sick >= 3 || riskScore >= 6) riskLevel = 'watch'

        return {
            employeeId: employee.id,
            employeeCode: employee.employee_code,
            name: fullName(employee),
            nickname: employee.nickname,
            department: employee.department,
            position: employee.position,
            absentDays: absentDates.length,
            absentDates,
            lateCount,
            lateMinutes,
            leaveDays: Number(leaveTotals.total.toFixed(1)),
            sickDays: Number(leaveTotals.sick.toFixed(1)),
            personalDays: Number(leaveTotals.personal.toFixed(1)),
            annualDays: Number(leaveTotals.annual.toFixed(1)),
            wfhDays: Number((wfhDaysByEmployee.get(employee.id) ?? 0).toFixed(1)),
            riskScore: Number(riskScore.toFixed(1)),
            riskLevel,
        }
    }).sort((a, b) => b.riskScore - a.riskScore || b.absentDays - a.absentDays || b.lateCount - a.lateCount)

    const departmentStats = Array.from(
        rows.reduce((map, row) => {
            const key = row.department ?? 'ไม่ระบุแผนก'
            const current = map.get(key) ?? { department: key, employees: 0, absentDays: 0, lateCount: 0, leaveDays: 0 }
            current.employees += 1
            current.absentDays += row.absentDays
            current.lateCount += row.lateCount
            current.leaveDays += row.leaveDays
            map.set(key, current)
            return map
        }, new Map<string, AttendanceInsightsData['departments'][number]>()).values(),
    ).sort((a, b) => (b.absentDays + b.lateCount) - (a.absentDays + a.lateCount))

    const data: AttendanceInsightsData = {
        monthIso,
        monthLabel: `${MONTH_LABELS_TH[month - 1]} ${year + 543}`,
        generatedAt: new Date().toISOString(),
        policyNote: isCurrentMonth
            ? 'การขาดงานนับเฉพาะวันทำงานที่ผ่านไปแล้ว ไม่รวมวันนี้ระหว่างวัน และไม่รวมพนักงานกรณีพิเศษ'
            : 'การขาดงานนับจากวันทำงานของเดือนที่เลือก และไม่รวมพนักงานกรณีพิเศษ',
        summary: {
            activeEmployees: employees.length,
            workdaysElapsed: absenceWorkdayKeys.length,
            absentDays: rows.reduce((sum, row) => sum + row.absentDays, 0),
            lateCount: rows.reduce((sum, row) => sum + row.lateCount, 0),
            leaveDays: Number(rows.reduce((sum, row) => sum + row.leaveDays, 0).toFixed(1)),
            sickDays: Number(rows.reduce((sum, row) => sum + row.sickDays, 0).toFixed(1)),
            personalDays: Number(rows.reduce((sum, row) => sum + row.personalDays, 0).toFixed(1)),
            annualDays: Number(rows.reduce((sum, row) => sum + row.annualDays, 0).toFixed(1)),
            watchEmployees: rows.filter(row => row.riskLevel !== 'normal').length,
            highRiskEmployees: rows.filter(row => row.riskLevel === 'high').length,
        },
        employees: rows,
        departments: departmentStats,
    }

    return <AttendanceInsightsView data={data} />
}
