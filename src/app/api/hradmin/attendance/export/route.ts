import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { bangkokDateKey, formatBangkokDateTime, formatBangkokTime, todayBangkokKey, toDate } from '@/lib/datetime'
import {
    HIP_OUTAGE_GRACE_CHECKIN_TIME,
    HIP_OUTAGE_GRACE_NOTE,
    isHipOutageGraceDate,
    shouldApplyHipOutageGrace,
} from '@/lib/hip-outage-grace'
import { isWorkdaySaturday } from '@/lib/saturday-rules'
import { getCheckinTypeLabel, normalizeOutsideHeadOfficeCheckin } from '@/lib/outside-head-office'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WORK_LOCATION_LABELS: Record<string, string> = {
    johnson: 'จอห์นสัน',
    saraburi: 'ทำงานที่บ้าน (สระบุรี)',
    outside_head_office: 'นอก Head Office',
    'outside-head-office': 'นอก Head Office',
    remote_office: 'นอก Head Office',
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
    cancellation_requested: 'ขอยกเลิกแล้ว',
}

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
    public: 'วันสำคัญทางศาสนา/ราชการ',
    company: 'วันหยุดที่บริษัทกำหนด',
    religious: 'วันสำคัญทางศาสนา',
    wfh: 'วันทำงาน WFH บริษัท',
}

type EmployeeRow = {
    id: string
    user_id?: string | null
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    email?: string | null
    department: string | null
    position: string | null
    work_location: string | null
    status?: string | null
    is_advisor?: boolean | null
}

type CheckinRow = {
    employee_id: string
    source: string | null
    type?: string | null
    checked_in_at: string
    checked_out_at: string | null
    notes?: string | null
    late_minutes?: number | null
    late_reason?: string | null
    auto_closed_at?: string | null
}

type CardScanRow = {
    id?: string | null
    employee_id: string | null
    employee_code: string | null
    scan_time: string
    created_at?: string | null
}

type LeaveRow = {
    id: string
    reference_code: string | null
    employee_id: string
    leave_type_id: string | null
    start_date: string
    end_date: string
    total_days: number | string | null
    reason: string | null
    status: string | null
    approver_id: string | null
    current_approver_id?: string | null
    submitted_at: string | null
    approved_at: string | null
    rejection_reason: string | null
    is_half_day: boolean | null
    half_day_period: string | null
    cancellation_requested_at: string | null
    cancellation_decided_by: string | null
    cancellation_decision_reason: string | null
    created_at: string | null
    updated_at: string | null
}

type WfhRow = {
    id: string
    reference_code: string | null
    employee_id: string
    start_date: string
    end_date: string
    total_days: number | string | null
    reason: string | null
    contact_during_wfh: string | null
    status: string | null
    approver_id: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    submitted_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    created_at: string | null
    updated_at: string | null
}

type HolidayRow = {
    date: string
    name: string
    type: string | null
}

type AttendanceLogNoteRow = {
    employee_id: string
    date: string
    hr_note: string | null
    hr_note_updated_at: string | null
    hr_note_updated_by: string | null
}

type DateSource = 'utc' | 'bangkok'

const SUPABASE_PAGE_SIZE = 1000

function getDatesInRange(startStr: string, endStr: string): string[] {
    const dates: string[] = []
    const [sYr, sMon, sDay] = startStr.split('-').map(Number)
    const [eYr, eMon, eDay] = endStr.split('-').map(Number)

    const start = new Date(sYr, sMon - 1, sDay)
    const end = new Date(eYr, eMon - 1, eDay)

    const cur = new Date(start)
    while (cur <= end) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        dates.push(`${y}-${m}-${d}`)
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

function getDateObject(dateStr: string) {
    const [yr, mon, day] = dateStr.split('-').map(Number)
    return new Date(yr, mon - 1, day)
}

function formatThaiDate(dateStr: string, options: Intl.DateTimeFormatOptions = {}) {
    return getDateObject(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    })
}

function formatThaiWeekday(dateStr: string) {
    return getDateObject(dateStr).toLocaleDateString('th-TH', { weekday: 'long' })
}

function csvEscape(value: unknown) {
    const text = value === null || value === undefined || value === '' ? '—' : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

function csvRow(columns: unknown[]) {
    return columns.map(csvEscape).join(',')
}

function uniqJoin(values: Array<string | null | undefined>, empty = '—') {
    const cleaned = values
        .map(v => (v ?? '').trim())
        .filter(Boolean)
    return Array.from(new Set(cleaned)).join(' | ') || empty
}

function statusLabel(status: string | null | undefined) {
    if (!status) return '—'
    return REQUEST_STATUS_LABELS[status] ?? status
}

function employeeFullName(emp: Pick<EmployeeRow, 'first_name_th' | 'last_name_th'> | null | undefined) {
    return `${emp?.first_name_th ?? ''} ${emp?.last_name_th ?? ''}`.trim() || '—'
}

function workLocationLabel(value: string | null | undefined) {
    if (!value) return 'สำนักงาน EBCI (ปกติ)'
    return WORK_LOCATION_LABELS[value] ?? value
}

function timestampLabel(raw: string | null | undefined, source: DateSource = 'utc') {
    if (!raw) return '—'
    return formatBangkokDateTime(raw, source)
}

function dateOnly(value: string | null | undefined) {
    if (!value) return '—'
    return value.slice(0, 10)
}

function compareTimestamp(a: string, aSource: DateSource, b: string, bSource: DateSource) {
    const da = toDate(a, aSource)?.getTime() ?? 0
    const db = toDate(b, bSource)?.getTime() ?? 0
    return da - db
}

function halfDayLabel(row: LeaveRow | null | undefined) {
    if (!row?.is_half_day) return 'เต็มวัน'
    if (row.half_day_period === 'morning') return 'ครึ่งวันเช้า'
    if (row.half_day_period === 'afternoon') return 'ครึ่งวันบ่าย'
    return 'ครึ่งวัน'
}

function requestSummary(row: LeaveRow | WfhRow, typeName?: string) {
    const ref = row.reference_code ?? row.id
    return `${ref} · ${typeName ?? 'WFH'} · ${statusLabel(row.status)} · ${dateOnly(row.start_date)}-${dateOnly(row.end_date)}`
}

function mapDateEmployeeRows<T extends { employee_id: string; start_date: string; end_date: string }>(rows: T[]) {
    const map = new Map<string, T[]>()
    for (const row of rows) {
        const start = dateOnly(row.start_date)
        const end = dateOnly(row.end_date)
        if (start === '—' || end === '—') continue
        for (const dateStr of getDatesInRange(start, end)) {
            const key = `${dateStr}_${row.employee_id}`
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(row)
        }
    }
    return map
}

async function fetchAllEmployees(): Promise<EmployeeRow[]> {
    const rows: EmployeeRow[] = []
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select('id, user_id, employee_code, first_name_th, last_name_th, nickname, email, department, position, work_location, status, is_advisor')
            .order('employee_code', { ascending: true })
            .range(from, from + SUPABASE_PAGE_SIZE - 1)

        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as EmployeeRow[]))
        if (!data || data.length < SUPABASE_PAGE_SIZE) break
    }
    return rows
}

async function fetchAllCheckins(startIso: string, endIso: string): Promise<CheckinRow[]> {
    const rows: CheckinRow[] = []
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('checkins')
            .select('employee_id, type, source, checked_in_at, checked_out_at, notes, late_minutes, late_reason, auto_closed_at')
            .gte('checked_in_at', startIso)
            .lte('checked_in_at', endIso)
            .order('checked_in_at', { ascending: true })
            .range(from, from + SUPABASE_PAGE_SIZE - 1)

        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as CheckinRow[]))
        if (!data || data.length < SUPABASE_PAGE_SIZE) break
    }
    return rows
}

async function fetchAllCardScans(fromDate: string, toDate: string): Promise<CardScanRow[]> {
    const rows: CardScanRow[] = []
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('card_scans')
            .select('id, employee_id, employee_code, scan_time, created_at')
            .gte('scan_time', `${fromDate}T00:00:00`)
            .lte('scan_time', `${toDate}T23:59:59.999`)
            .order('scan_time', { ascending: true })
            .range(from, from + SUPABASE_PAGE_SIZE - 1)

        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as CardScanRow[]))
        if (!data || data.length < SUPABASE_PAGE_SIZE) break
    }
    return rows
}

async function fetchAllLeaves(fromDate: string, toDate: string): Promise<LeaveRow[]> {
    const rows: LeaveRow[] = []
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select('id, reference_code, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, approver_id, current_approver_id, submitted_at, approved_at, rejection_reason, is_half_day, half_day_period, cancellation_requested_at, cancellation_decided_by, cancellation_decision_reason, created_at, updated_at')
            .lte('start_date', toDate)
            .gte('end_date', fromDate)
            .order('start_date', { ascending: true })
            .range(from, from + SUPABASE_PAGE_SIZE - 1)

        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as LeaveRow[]))
        if (!data || data.length < SUPABASE_PAGE_SIZE) break
    }
    return rows
}

async function fetchAllWfhRequests(fromDate: string, toDate: string): Promise<WfhRow[]> {
    const rows: WfhRow[] = []
    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('wfh_requests')
            .select('id, reference_code, employee_id, start_date, end_date, total_days, reason, contact_during_wfh, status, approver_id, approved_at, approval_notes, rejection_reason, submitted_at, cancelled_at, cancellation_reason, created_at, updated_at')
            .lte('start_date', toDate)
            .gte('end_date', fromDate)
            .order('start_date', { ascending: true })
            .range(from, from + SUPABASE_PAGE_SIZE - 1)

        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as WfhRow[]))
        if (!data || data.length < SUPABASE_PAGE_SIZE) break
    }
    return rows
}

async function fetchHolidays(fromDate: string, toDate: string): Promise<HolidayRow[]> {
    const { data, error } = await supabaseAdmin
        .from('holidays')
        .select('date, name, type')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as HolidayRow[]
}

async function fetchAttendanceLogNotes(fromDate: string, toDate: string): Promise<AttendanceLogNoteRow[]> {
    const { data, error } = await supabaseAdmin
        .from('attendance_logs')
        .select('employee_id, date, hr_note, hr_note_updated_at, hr_note_updated_by')
        .gte('date', `${fromDate}T00:00:00`)
        .lte('date', `${toDate}T23:59:59.999`)
        .not('hr_note', 'is', null)

    if (error) {
        if (error.message.includes('hr_note')) {
            console.warn('[attendance-export] hr_note column missing; continuing without HR notes')
            return []
        }
        throw new Error(error.message)
    }
    return (data ?? []) as AttendanceLogNoteRow[]
}

export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const employeeId = searchParams.get('employeeId')?.trim() || ''
    const debug = searchParams.get('debug') === '1'

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' }, { status: 400 })
    }

    if (from > to) {
        return NextResponse.json({ error: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' }, { status: 400 })
    }

    try {
        const startOfDay = new Date(`${from}T00:00:00+07:00`)
        const endOfDay = new Date(`${to}T23:59:59.999+07:00`)

        const [allEmployees, checkins, cardScans, leaves, wfhRequests, holidays, attendanceLogNotes] = await Promise.all([
            fetchAllEmployees(),
            fetchAllCheckins(startOfDay.toISOString(), endOfDay.toISOString()),
            fetchAllCardScans(from, to),
            fetchAllLeaves(from, to),
            fetchAllWfhRequests(from, to),
            fetchHolidays(from, to),
            fetchAttendanceLogNotes(from, to),
        ])

        const employees = allEmployees.filter(emp => {
            if (emp.status !== 'active' || emp.is_advisor) return false
            if (employeeId && emp.id !== employeeId) return false
            return true
        })
        const employeeById = new Map(allEmployees.map(emp => [emp.id, emp]))
        const employeeByUserId = new Map(
            allEmployees
                .filter(emp => Boolean(emp.user_id))
                .map(emp => [emp.user_id as string, emp]),
        )
        const employeeIdByCode = new Map<string, string>()
        for (const emp of allEmployees) {
            if (emp.employee_code) employeeIdByCode.set(emp.employee_code, emp.id)
        }

        const leaveTypeIds = Array.from(new Set(leaves.map(l => l.leave_type_id).filter(Boolean))) as string[]
        const { data: leaveTypes, error: leaveTypeError } = leaveTypeIds.length
            ? await supabaseAdmin.from('leave_types').select('id, name_th').in('id', leaveTypeIds)
            : { data: [], error: null }
        if (leaveTypeError) throw new Error(leaveTypeError.message)
        const leaveTypeNames = new Map((leaveTypes ?? []).map(t => [String(t.id), String(t.name_th ?? 'ลา')]))

        const checkinMap = new Map<string, CheckinRow[]>()
        for (const raw of checkins) {
            const normalized = normalizeOutsideHeadOfficeCheckin(raw) as CheckinRow
            const datePart = bangkokDateKey(normalized.checked_in_at, 'utc')
            if (!datePart) continue
            const key = `${datePart}_${normalized.employee_id}`
            if (!checkinMap.has(key)) checkinMap.set(key, [])
            checkinMap.get(key)!.push(normalized)
        }

        const scanMap = new Map<string, CardScanRow[]>()
        for (const scan of cardScans) {
            const datePart = bangkokDateKey(scan.scan_time, 'bangkok') ?? scan.scan_time.split(/[T ]/)[0]
            const employeeId = scan.employee_id ?? (scan.employee_code ? employeeIdByCode.get(scan.employee_code) ?? null : null)
            if (!employeeId) continue
            const key = `${datePart}_${employeeId}`
            if (!scanMap.has(key)) scanMap.set(key, [])
            scanMap.get(key)!.push(scan)
        }

        const leaveMap = mapDateEmployeeRows(leaves)
        const wfhMap = mapDateEmployeeRows(wfhRequests)
        const holidayByDate = new Map(holidays.map(h => [h.date, h]))
        const attendanceNoteByDateEmp = new Map(
            attendanceLogNotes.map(row => [`${dateOnly(row.date)}_${row.employee_id}`, row]),
        )
        const dateRange = getDatesInRange(from, to)

        if (debug) {
            return NextResponse.json(
                {
                    from,
                    to,
                    employeeId: employeeId || null,
                    activeEmployees: employees.length,
                    sourceRows: {
                        checkins: checkins.length,
                        cardScans: cardScans.length,
                        leaves: leaves.length,
                        wfhRequests: wfhRequests.length,
                        holidays: holidays.length,
                        attendanceLogNotes: attendanceLogNotes.length,
                    },
                    days: dateRange.map(dateStr => ({
                        date: dateStr,
                        employeesWithCardScans: Array.from(scanMap.keys()).filter(key => key.startsWith(`${dateStr}_`)).length,
                        employeesWithCheckins: Array.from(checkinMap.keys()).filter(key => key.startsWith(`${dateStr}_`)).length,
                        employeesWithLeaves: Array.from(leaveMap.keys()).filter(key => key.startsWith(`${dateStr}_`)).length,
                        employeesWithWfh: Array.from(wfhMap.keys()).filter(key => key.startsWith(`${dateStr}_`)).length,
                        holiday: holidayByDate.get(dateStr) ?? null,
                    })),
                },
                {
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                        Pragma: 'no-cache',
                        Expires: '0',
                    },
                },
            )
        }

        const headers = [
            'วันที่ (ค.ศ.)',
            'วันที่ (ไทย)',
            'วัน',
            'ประเภทวัน',
            'ชื่อวันหยุด/กิจกรรม',
            'เป็นวันทำงาน',
            'ช่วงรายงาน',
            'รหัสพนักงาน',
            'ชื่อ-นามสกุล',
            'ชื่อเล่น',
            'อีเมล',
            'สถานะพนักงาน',
            'แผนก',
            'ตำแหน่ง',
            'สถานที่ทำงานหลัก',
            'สถานะสรุปรายวัน',
            'ผลตรวจเช็คอิน',
            'แหล่งข้อมูล',
            'ประเภทเช็คอินจริง',
            'เวลาเข้าแรก',
            'เวลาออกล่าสุด',
            'จำนวนแตะบัตร',
            'เวลาแตะบัตรแรก',
            'เวลาแตะบัตรล่าสุด',
            'เวลาแตะบัตรทั้งหมด',
            'จำนวนเช็คอินมือถือ',
            'เวลาเช็คอินมือถือแรก',
            'เวลาเช็คเอาท์มือถือล่าสุด',
            'ประเภทเช็คอินมือถือทั้งหมด',
            'เวลาเช็คอินมือถือทั้งหมด',
            'มาสาย (นาที)',
            'เหตุผลมาสาย',
            'ปิดงานอัตโนมัติ',
            'มีใบลาในวันนั้น',
            'สถานะใบลา',
            'ประเภทใบลา',
            'เลขที่ใบลา',
            'วันที่เริ่มลา',
            'วันที่สิ้นสุดลา',
            'จำนวนวันใบลา',
            'ลาครึ่งวัน',
            'เหตุผลลา',
            'ส่งใบลาเมื่อ',
            'อนุมัติใบลาเมื่อ',
            'ผู้อนุมัติหลักของใบลา',
            'ผู้อนุมัติปัจจุบัน',
            'เหตุผลปฏิเสธใบลา',
            'สถานะคำขอยกเลิกใบลา',
            'มี WFH ในวันนั้น',
            'ประเภท WFH',
            'สถานะ WFH',
            'เลขที่ WFH',
            'วันที่เริ่ม WFH',
            'วันที่สิ้นสุด WFH',
            'จำนวนวัน WFH',
            'เหตุผล WFH',
            'ช่องทางติดต่อระหว่าง WFH',
            'ส่ง WFH เมื่อ',
            'อนุมัติ WFH เมื่อ',
            'ผู้อนุมัติ WFH',
            'เหตุผลปฏิเสธ/ยกเลิก WFH',
            'หมายเหตุอนุมัติ WFH',
            'หมายเหตุ HR',
            'ผู้บันทึกหมายเหตุ HR',
            'แก้ไขหมายเหตุ HR เมื่อ',
            'หมายเหตุระบบ',
            'จุดที่ควรตรวจสอบ',
        ]

        const csvRows = [csvRow(headers)]
        const todayStr = todayBangkokKey()

        for (const dateStr of dateRange) {
            const dObj = getDateObject(dateStr)
            const day = dObj.getDay()
            const isWeekend = day === 0 || (day === 6 && !isWorkdaySaturday(dateStr))
            const holiday = holidayByDate.get(dateStr)
            const isCompanyWfh = holiday?.type === 'wfh'
            const isHoliday = Boolean(holiday && holiday.type !== 'wfh')
            const isWorkday = !isWeekend && !isHoliday
            const dayType = holiday
                ? (HOLIDAY_TYPE_LABELS[holiday.type ?? ''] ?? holiday.type ?? 'วันหยุด/กิจกรรม')
                : isWeekend
                    ? 'วันหยุดสุดสัปดาห์'
                    : 'วันทำงานปกติ'

            for (const emp of employees) {
                const key = `${dateStr}_${emp.id}`
                const dayCheckins = (checkinMap.get(key) ?? [])
                    .slice()
                    .sort((a, b) => compareTimestamp(a.checked_in_at, 'utc', b.checked_in_at, 'utc'))
                const mobileCheckins = dayCheckins.filter(c => c.source !== 'card')
                const dayScans = (scanMap.get(key) ?? [])
                    .slice()
                    .sort((a, b) => compareTimestamp(a.scan_time, 'bangkok', b.scan_time, 'bangkok'))
                const dayLeaves = leaveMap.get(key) ?? []
                const dayWfh = wfhMap.get(key) ?? []
                const hrNoteRecord = attendanceNoteByDateEmp.get(key) ?? null
                const hrNoteActor = hrNoteRecord?.hr_note_updated_by
                    ? employeeByUserId.get(hrNoteRecord.hr_note_updated_by) ?? employeeById.get(hrNoteRecord.hr_note_updated_by)
                    : null
                const hrNoteActorLabel = hrNoteRecord?.hr_note_updated_by
                    ? hrNoteActor
                        ? employeeFullName(hrNoteActor)
                        : hrNoteRecord.hr_note_updated_by
                    : '—'
                const approvedLeaves = dayLeaves.filter(l => l.status === 'approved' || l.status === 'cancellation_requested')
                const activeWfh = dayWfh.filter(w => w.status === 'approved')
                const firstMobile = mobileCheckins[0] ?? null
                const firstCard = dayScans[0] ?? null
                const latestCard = dayScans.length > 1 ? dayScans[dayScans.length - 1] : null

                let firstSource: 'card' | 'mobile' | null = null
                if (firstCard && firstMobile) {
                    firstSource = compareTimestamp(firstCard.scan_time, 'bangkok', firstMobile.checked_in_at, 'utc') <= 0 ? 'card' : 'mobile'
                } else if (firstCard) {
                    firstSource = 'card'
                } else if (firstMobile) {
                    firstSource = 'mobile'
                }

                const latestMobileCheckout = mobileCheckins
                    .map(c => c.checked_out_at)
                    .filter(Boolean)
                    .sort((a, b) => compareTimestamp(a!, 'utc', b!, 'utc'))
                    .at(-1) ?? null

                let clockIn = '—'
                if (firstSource === 'card' && firstCard) clockIn = formatBangkokTime(firstCard.scan_time, 'bangkok')
                if (firstSource === 'mobile' && firstMobile) clockIn = formatBangkokTime(firstMobile.checked_in_at, 'utc')

                let clockOut = '—'
                if (latestCard && latestMobileCheckout) {
                    clockOut = compareTimestamp(latestCard.scan_time, 'bangkok', latestMobileCheckout, 'utc') >= 0
                        ? formatBangkokTime(latestCard.scan_time, 'bangkok')
                        : formatBangkokTime(latestMobileCheckout, 'utc')
                } else if (latestCard) {
                    clockOut = formatBangkokTime(latestCard.scan_time, 'bangkok')
                } else if (latestMobileCheckout) {
                    clockOut = formatBangkokTime(latestMobileCheckout, 'utc')
                }

                const hasCard = dayScans.length > 0
                const hasMobile = mobileCheckins.length > 0
                const hasAnyCheckin = hasCard || hasMobile
                const appliesGrace = shouldApplyHipOutageGrace({
                    dateKey: dateStr,
                    isWorkday,
                    hasAttendance: hasAnyCheckin,
                    hasApprovedLeave: approvedLeaves.length > 0,
                    hasApprovedWfh: activeWfh.length > 0,
                    isCompanyWfh,
                })
                const graceDate = isHipOutageGraceDate(dateStr)

                let checkinMatchStatus = hasCard && hasMobile
                    ? 'ตรงกัน (มีทั้งแตะบัตรและมือถือ)'
                    : hasCard
                        ? 'เฉพาะบัตร'
                        : hasMobile
                            ? 'เฉพาะมือถือ'
                            : 'ไม่มีข้อมูลเช็คอิน'
                let sourceLabel = hasCard && hasMobile
                    ? 'สแกนบัตร + มือถือ'
                    : hasCard
                        ? 'สแกนบัตร'
                        : hasMobile
                            ? 'มือถือ'
                            : '—'

                const mobileTypes = mobileCheckins.map(c => c.type ? getCheckinTypeLabel(c.type) : 'ไม่ระบุ')
                let actualType = firstSource === 'card'
                    ? 'ออฟฟิศ'
                    : firstMobile?.type
                        ? getCheckinTypeLabel(firstMobile.type)
                        : hasMobile
                            ? 'มือถือไม่ระบุประเภท'
                            : '—'
                const rawMaxLateMinutes = Math.max(0, ...dayCheckins.map(c => Number(c.late_minutes ?? 0)))
                const lateExcused = graceDate && rawMaxLateMinutes > 0
                const maxLateMinutes = lateExcused ? 0 : rawMaxLateMinutes
                const lateReasons = lateExcused
                    ? 'ยกเว้นช่วง HIP ขัดข้อง'
                    : uniqJoin(dayCheckins.map(c => c.late_reason))
                const autoClosed = dayCheckins.some(c => Boolean(c.auto_closed_at)) ? 'ใช่' : 'ไม่ใช่'
                const leaveTypeLabels = dayLeaves.map(l => leaveTypeNames.get(l.leave_type_id ?? '') ?? l.leave_type_id ?? 'ลา')
                const approvedLeaveType = approvedLeaves.length > 0
                    ? uniqJoin(approvedLeaves.map(l => leaveTypeNames.get(l.leave_type_id ?? '') ?? l.leave_type_id ?? 'ลา'))
                    : '—'

                const issues: string[] = []
                const notes: string[] = []

                if (appliesGrace) {
                    clockIn = HIP_OUTAGE_GRACE_CHECKIN_TIME
                    checkinMatchStatus = 'เครดิตระบบช่วง HIP ขัดข้อง (ไม่มีข้อมูลเช็คอินจริง)'
                    sourceLabel = 'ระบบยกประโยชน์ช่วง HIP ขัดข้อง'
                    actualType = 'ออฟฟิศ (เครดิตระบบ)'
                    notes.push(HIP_OUTAGE_GRACE_NOTE)
                }
                if (lateExcused) {
                    notes.push(`ช่วง HIP ขัดข้อง: พบเวลาจริงสาย ${rawMaxLateMinutes} นาที แต่ไม่คิดเป็นมาสาย`)
                }

                if (hasAnyCheckin && approvedLeaves.length > 0) issues.push('มีเช็คอินในวันที่มีใบลาอนุมัติ')
                if (hasCard && activeWfh.length > 0) issues.push('มีแตะบัตรในวันที่มี WFH อนุมัติ')
                if (hasMobile && !hasCard) {
                    if (graceDate) notes.push('ช่วง HIP ขัดข้อง: มีเฉพาะเช็คอินมือถือ')
                    else issues.push('มีเฉพาะเช็คอินมือถือ')
                }
                if (hasCard && !hasMobile) issues.push('มีเฉพาะแตะบัตร')
                if (dayLeaves.length > 1) issues.push('มีใบลาหลายรายการในวันเดียวกัน')
                if (dayWfh.length > 1) issues.push('มีคำขอ WFH หลายรายการในวันเดียวกัน')
                if (dayLeaves.some(l => l.status === 'pending')) issues.push('มีใบลารออนุมัติในวันนี้')
                if (dayWfh.some(w => w.status === 'pending')) issues.push('มี WFH รออนุมัติในวันนี้')
                if (maxLateMinutes > 0) issues.push(`มาสาย ${maxLateMinutes} นาที`)

                let dailyStatus = 'ยังไม่เช็คอิน'
                if (hasAnyCheckin) {
                    dailyStatus = actualType === 'WFH'
                        ? 'เข้างาน WFH'
                        : actualType === 'นอก Head Office'
                            ? 'เข้างานนอก Head Office'
                            : actualType === 'ภาคสนาม'
                                ? 'เข้างานภาคสนาม'
                                : 'เข้าออฟฟิศ'
                } else if (approvedLeaves.length > 0) {
                    dailyStatus = approvedLeaves.length === 1 && approvedLeaves[0].is_half_day
                        ? `ลา ${approvedLeaveType} (${halfDayLabel(approvedLeaves[0])})`
                        : `ลา ${approvedLeaveType}`
                    notes.push('ไม่ต้องเช็คอินเพราะมีใบลาอนุมัติ')
                } else if (activeWfh.length > 0) {
                    dailyStatus = 'WFH อนุมัติแล้ว แต่ยังไม่เช็คอิน'
                    issues.push('มี WFH อนุมัติแต่ไม่มีเช็คอิน WFH')
                } else if (isCompanyWfh) {
                    dailyStatus = 'วัน WFH บริษัท แต่ยังไม่เช็คอิน'
                    notes.push('บริษัทกำหนดให้เป็น WFH')
                } else if (!isWorkday) {
                    dailyStatus = 'วันหยุด'
                    notes.push(dayType)
                } else if (appliesGrace) {
                    dailyStatus = `เข้าออฟฟิศ (เครดิตระบบ ${HIP_OUTAGE_GRACE_CHECKIN_TIME})`
                } else if (dateStr < todayStr) {
                    dailyStatus = 'ขาดเช็คอิน'
                    issues.push('วันทำงานที่ผ่านมาแล้วแต่ไม่มีเช็คอิน/ใบลา/WFH')
                }

                const primaryLeave = dayLeaves[0] ?? null
                const primaryWfh = dayWfh[0] ?? null
                const approver = primaryLeave?.approver_id ? employeeById.get(primaryLeave.approver_id) : null
                const currentApprover = primaryLeave?.current_approver_id ? employeeById.get(primaryLeave.current_approver_id) : null
                const wfhApprover = primaryWfh?.approver_id ? employeeById.get(primaryWfh.approver_id) : null

                const row = [
                    dateStr,
                    formatThaiDate(dateStr),
                    formatThaiWeekday(dateStr),
                    dayType,
                    holiday?.name ?? '—',
                    isWorkday ? 'ใช่' : 'ไม่ใช่',
                    `${from} ถึง ${to}`,
                    emp.employee_code ?? '—',
                    employeeFullName(emp),
                    emp.nickname ?? '—',
                    emp.email ?? '—',
                    emp.status ?? '—',
                    emp.department ?? '—',
                    emp.position ?? '—',
                    workLocationLabel(emp.work_location),
                    dailyStatus,
                    checkinMatchStatus,
                    sourceLabel,
                    actualType,
                    clockIn,
                    clockOut,
                    dayScans.length,
                    firstCard ? formatBangkokTime(firstCard.scan_time, 'bangkok') : '—',
                    latestCard ? formatBangkokTime(latestCard.scan_time, 'bangkok') : '—',
                    dayScans.map(s => formatBangkokTime(s.scan_time, 'bangkok')).join(' | ') || '—',
                    mobileCheckins.length,
                    firstMobile ? formatBangkokTime(firstMobile.checked_in_at, 'utc') : '—',
                    latestMobileCheckout ? formatBangkokTime(latestMobileCheckout, 'utc') : '—',
                    uniqJoin(mobileTypes),
                    mobileCheckins.map(c => `${formatBangkokTime(c.checked_in_at, 'utc')} (${c.type ? getCheckinTypeLabel(c.type) : 'ไม่ระบุ'})`).join(' | ') || '—',
                    maxLateMinutes || 0,
                    lateReasons,
                    autoClosed,
                    dayLeaves.length > 0 ? 'มี' : 'ไม่มี',
                    uniqJoin(dayLeaves.map(l => `${l.reference_code ?? l.id}: ${statusLabel(l.status)}`)),
                    uniqJoin(leaveTypeLabels),
                    uniqJoin(dayLeaves.map(l => l.reference_code ?? l.id)),
                    uniqJoin(dayLeaves.map(l => dateOnly(l.start_date))),
                    uniqJoin(dayLeaves.map(l => dateOnly(l.end_date))),
                    uniqJoin(dayLeaves.map(l => String(l.total_days ?? '—'))),
                    uniqJoin(dayLeaves.map(halfDayLabel)),
                    uniqJoin(dayLeaves.map(l => l.reason)),
                    uniqJoin(dayLeaves.map(l => timestampLabel(l.submitted_at ?? l.created_at, 'utc'))),
                    uniqJoin(dayLeaves.map(l => timestampLabel(l.approved_at, 'utc'))),
                    approver ? employeeFullName(approver) : '—',
                    currentApprover ? employeeFullName(currentApprover) : '—',
                    uniqJoin(dayLeaves.map(l => l.rejection_reason)),
                    uniqJoin(dayLeaves.map(l => l.cancellation_requested_at
                        ? `ขอยกเลิกเมื่อ ${timestampLabel(l.cancellation_requested_at, 'utc')}${l.cancellation_decision_reason ? ` · ผล: ${l.cancellation_decision_reason}` : ''}`
                        : l.status === 'cancelled'
                            ? 'ยกเลิกแล้ว'
                            : null)),
                    dayWfh.length > 0 || isCompanyWfh ? 'มี' : 'ไม่มี',
                    isCompanyWfh ? 'WFH บริษัท' : (activeWfh.length > 0 ? 'WFH รายบุคคล' : dayWfh.length > 0 ? 'คำขอ WFH รายบุคคล' : '—'),
                    isCompanyWfh ? 'บริษัทกำหนด' : uniqJoin(dayWfh.map(w => `${w.reference_code ?? w.id}: ${statusLabel(w.status)}`)),
                    uniqJoin(dayWfh.map(w => w.reference_code ?? w.id)),
                    uniqJoin(dayWfh.map(w => dateOnly(w.start_date))),
                    uniqJoin(dayWfh.map(w => dateOnly(w.end_date))),
                    uniqJoin(dayWfh.map(w => String(w.total_days ?? '—'))),
                    isCompanyWfh ? holiday?.name ?? 'บริษัทกำหนด WFH' : uniqJoin(dayWfh.map(w => w.reason)),
                    uniqJoin(dayWfh.map(w => w.contact_during_wfh)),
                    uniqJoin(dayWfh.map(w => timestampLabel(w.submitted_at ?? w.created_at, 'utc'))),
                    uniqJoin(dayWfh.map(w => timestampLabel(w.approved_at, 'utc'))),
                    wfhApprover ? employeeFullName(wfhApprover) : '—',
                    uniqJoin(dayWfh.map(w => w.rejection_reason ?? w.cancellation_reason)),
                    uniqJoin(dayWfh.map(w => w.approval_notes)),
                    hrNoteRecord?.hr_note ?? '—',
                    hrNoteActorLabel,
                    timestampLabel(hrNoteRecord?.hr_note_updated_at, 'utc'),
                    uniqJoin([
                        ...notes,
                        ...approvedLeaves.map(l => requestSummary(l, leaveTypeNames.get(l.leave_type_id ?? '') ?? l.leave_type_id ?? 'ลา')),
                        ...activeWfh.map(w => requestSummary(w, 'WFH')),
                    ]),
                    uniqJoin(issues),
                ]

                csvRows.push(csvRow(row))
            }
        }

        const csvContent = '\uFEFF' + csvRows.join('\n')
        const selectedEmployee = employeeId ? employees[0] : null
        const employeeSuffix = selectedEmployee?.employee_code ? `_${selectedEmployee.employee_code}` : ''
        const filename = `attendance_summary_report${employeeSuffix}_${from}_to_${to}.csv`

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                Pragma: 'no-cache',
                Expires: '0',
            },
        })

    } catch (err: unknown) {
        console.error('Attendance export error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' }, { status: 500 })
    }
}
