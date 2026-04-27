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
    totalDays: number
}

export interface AttendanceReport {
    month: number
    year: number
    workdays: number
    rows: AttendanceRow[]
    typeBreakdown: { type: string; count: number; color: string }[]
}

function countWorkdays(year: number, month: number): number {
    // Simple workday count (Mon-Fri) for month
    const daysInMonth = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay()
        if (dow >= 1 && dow <= 5) count++
    }
    return count
}

export async function getAttendanceReport(year: number, month: number, department?: string): Promise<AttendanceReport | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return { error: 'ไม่มีสิทธิ์เข้าถึง' }

    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 1))

    const empQuery = supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, department')
        .eq('status', 'active')
    if (department) empQuery.eq('department', department)
    const { data: employees, error: empErr } = await empQuery
    if (empErr) return { error: empErr.message }

    const employeeIds = (employees ?? []).map(e => e.id)
    if (!employeeIds.length) {
        return { month, year, workdays: countWorkdays(year, month), rows: [], typeBreakdown: [] }
    }

    const { data: checkins, error: chkErr } = await supabaseAdmin
        .from('checkins')
        .select('employee_id, type, checked_in_at')
        .gte('checked_in_at', start.toISOString())
        .lt('checked_in_at', end.toISOString())
        .in('employee_id', employeeIds)
    if (chkErr) return { error: chkErr.message }

    // Count unique days per employee per type (not per checkin).
    // `checked_in_at` is stored as UTC wall-clock — slicing the raw
    // ISO directly produces the wrong calendar date for events between
    // 17:00-24:00 UTC (= 00:00-07:00 Bangkok next day). Convert to the
    // Bangkok-local YYYY-MM-DD before grouping.
    const perEmp = new Map<string, { office: Set<string>; wfh: Set<string>; offsite: Set<string> }>()
    for (const c of checkins ?? []) {
        const day = bangkokDateKey(c.checked_in_at as string, 'utc')
        if (!day) continue
        const bucket = perEmp.get(c.employee_id) ?? { office: new Set(), wfh: new Set(), offsite: new Set() }
        const t = c.type as string
        if (t === 'office') bucket.office.add(day)
        else if (t === 'wfh') bucket.wfh.add(day)
        else bucket.offsite.add(day)
        perEmp.set(c.employee_id, bucket)
    }

    let totalOffice = 0
    let totalWfh = 0
    let totalOffsite = 0

    const rows: AttendanceRow[] = (employees ?? []).map(e => {
        const b = perEmp.get(e.id) ?? { office: new Set(), wfh: new Set(), offsite: new Set() }
        const officeDays = b.office.size
        const wfhDays = b.wfh.size
        const offsiteDays = b.offsite.size
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
            totalDays: officeDays + wfhDays + offsiteDays,
        }
    })

    rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode))

    return {
        month,
        year,
        workdays: countWorkdays(year, month),
        rows,
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
