'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { reconcileDate } from '../reconcile/actions'

// CSV rows are parsed client-side; the server only validates + imports.
// Accepted shapes (case-insensitive headers):
//   Employee Code + Date + Time [+ Action]         — split datetime
//   Employee Code + Scan Time   [+ Scan Type]      — combined datetime
export interface RawCardRow {
    rowNumber: number
    employeeCode: string
    date: string       // YYYY-MM-DD
    time: string       // HH:MM or HH:MM:SS
    action: string     // 'in' | 'out' | ''
}

export interface ValidatedRow extends RawCardRow {
    employeeId: string | null
    employeeName: string | null
    normalizedAction: 'in' | 'out' | null
    isValid: boolean
    error: string | null
}

export interface ValidationResult {
    rows: ValidatedRow[]
    employeesFound: number
    errorCount: number
    duplicateCount: number
}

function normalizeAction(raw: string): 'in' | 'out' | null {
    const s = raw.trim().toLowerCase()
    if (!s) return null
    if (['in', 'check-in', 'checkin', 'เข้า', 'เข้างาน', '1'].includes(s)) return 'in'
    if (['out', 'check-out', 'checkout', 'ออก', 'ออกงาน', '0'].includes(s)) return 'out'
    return null
}

function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00').getTime())
}

function isValidTime(s: string): boolean {
    return /^\d{2}:\d{2}(:\d{2})?$/.test(s)
}

function combineDateTime(date: string, time: string): string {
    const t = time.length === 5 ? `${time}:00` : time
    // Stored as timestamp without tz — we keep Bangkok local in the string
    return `${date} ${t}`
}

export async function validateCardRows(
    rows: RawCardRow[],
): Promise<ValidationResult | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะ HR Admin เท่านั้น' }
    }

    if (!rows.length) return { error: 'ไม่มีข้อมูลในไฟล์' }

    const uniqueCodes = Array.from(
        new Set(rows.map(r => r.employeeCode.trim()).filter(Boolean)),
    )
    const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname')
        .in('employee_code', uniqueCodes)

    const empByCode = new Map<string, { id: string; name: string }>()
    for (const e of employees ?? []) {
        const nick = e.nickname ? ` (${e.nickname})` : ''
        empByCode.set(e.employee_code, {
            id: e.id,
            name: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}${nick}`.trim(),
        })
    }

    // Flag rows that already exist in card_scans (exact employee + timestamp).
    const existingKeys = new Set<string>()
    const dateStrs = Array.from(new Set(rows.map(r => r.date).filter(isValidDate)))
    if (dateStrs.length && employees?.length) {
        const minDate = dateStrs.reduce((a, b) => (a < b ? a : b))
        const maxDate = dateStrs.reduce((a, b) => (a > b ? a : b))
        const { data: existing } = await supabaseAdmin
            .from('card_scans')
            .select('employee_id, scan_time')
            .gte('scan_time', `${minDate}T00:00:00`)
            .lte('scan_time', `${maxDate}T23:59:59.999`)
        for (const c of existing ?? []) {
            const key = `${c.employee_id}|${String(c.scan_time).slice(0, 19)}`
            existingKeys.add(key)
        }
    }

    let errorCount = 0
    let duplicateCount = 0

    const validated: ValidatedRow[] = rows.map(r => {
        const code = r.employeeCode.trim()
        const emp = empByCode.get(code)
        const normalizedAction = normalizeAction(r.action)

        let error: string | null = null
        if (!code) error = 'รหัสพนักงานว่าง'
        else if (!emp) error = `ไม่พบพนักงานรหัส ${code}`
        else if (!isValidDate(r.date)) error = `วันที่ไม่ถูกต้อง (${r.date})`
        else if (!isValidTime(r.time)) error = `เวลาไม่ถูกต้อง (${r.time})`
        else {
            const key = `${emp.id}|${combineDateTime(r.date, r.time).replace(' ', 'T')}`
            if (existingKeys.has(key)) error = 'มีข้อมูลซ้ำในฐาน (ข้าม)'
        }

        if (error && error.startsWith('มีข้อมูลซ้ำ')) duplicateCount++
        else if (error) errorCount++

        return {
            ...r,
            employeeId: emp?.id ?? null,
            employeeName: emp?.name ?? null,
            normalizedAction,
            isValid: !error,
            error,
        }
    })

    return {
        rows: validated,
        employeesFound: empByCode.size,
        errorCount,
        duplicateCount,
    }
}

export interface ImportResult {
    inserted: number
    skipped: number
    reconciled?: number  // employees reconciled across affected dates
    affectedDates?: string[]
    error?: string
}

// Insert valid rows into card_scans then kick off reconciliation for every
// date touched by the import. Mobile check-ins are stored separately in
// `checkins`; reconcileDate matches them up and writes to attendance_logs.
export async function importCardScans(
    rows: ValidatedRow[],
    sourceFile?: string,
): Promise<ImportResult> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { inserted: 0, skipped: 0, error: 'ไม่มีสิทธิ์เข้าถึง' }
    }

    const valid = rows.filter(r => r.isValid && r.employeeId)
    if (!valid.length) {
        return { inserted: 0, skipped: rows.length, error: 'ไม่มีข้อมูลที่ผ่านการตรวจสอบ' }
    }

    const inserts = valid.map(r => ({
        employee_code: r.employeeCode.trim(),
        employee_id: r.employeeId!,
        scan_time: combineDateTime(r.date, r.time),
        scan_type: r.normalizedAction ?? null,
        imported_at: new Date().toISOString(),
        imported_by: session.id,
        source_file: sourceFile ?? null,
    }))

    const { error } = await supabaseAdmin.from('card_scans').insert(inserts)
    if (error) {
        console.error('Card scan import error:', error)
        return { inserted: 0, skipped: rows.length, error: error.message }
    }

    // Auto-reconcile every affected date so the dashboard is fresh
    const affectedDates = Array.from(new Set(valid.map(r => r.date)))
    let reconciledTotal = 0
    for (const d of affectedDates) {
        const r = await reconcileDate(d)
        if (!('error' in r)) reconciledTotal += r.processed
    }

    revalidatePath('/hradmin/attendance')
    revalidatePath('/hradmin/attendance/reconcile')

    return {
        inserted: inserts.length,
        skipped: rows.length - valid.length,
        reconciled: reconciledTotal,
        affectedDates,
    }
}
