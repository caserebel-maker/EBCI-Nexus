'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface RawCardRow {
    rowNumber: number
    employeeCode: string
    date: string       // YYYY-MM-DD
    time: string       // HH:MM or HH:MM:SS
    action: string     // 'in' | 'out'
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

export async function validateCardRows(rows: RawCardRow[]): Promise<ValidationResult | { error: string }> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะ HR Admin เท่านั้น' }
    }

    if (!rows.length) {
        return { error: 'ไม่มีข้อมูลในไฟล์ CSV' }
    }

    // Batch lookup all employees by employee_code
    const uniqueCodes = Array.from(new Set(rows.map(r => r.employeeCode.trim()).filter(Boolean)))
    const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th')
        .in('employee_code', uniqueCodes)

    const empByCode = new Map<string, { id: string; name: string }>()
    for (const e of employees ?? []) {
        empByCode.set(e.employee_code, {
            id: e.id,
            name: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim(),
        })
    }

    // Check existing card-based checkins to flag duplicates
    const dateStrs = Array.from(new Set(rows.map(r => r.date).filter(isValidDate)))
    const existingKeys = new Set<string>()
    if (dateStrs.length && employees?.length) {
        const minDate = dateStrs.reduce((a, b) => (a < b ? a : b))
        const maxDate = dateStrs.reduce((a, b) => (a > b ? a : b))
        const { data: existing } = await supabaseAdmin
            .from('checkins')
            .select('employee_id, checked_in_at')
            .eq('source', 'card')
            .gte('checked_in_at', `${minDate}T00:00:00`)
            .lte('checked_in_at', `${maxDate}T23:59:59.999`)
        for (const c of existing ?? []) {
            const d = (c.checked_in_at as string).slice(0, 10)
            existingKeys.add(`${c.employee_id}|${d}`)
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
        else if (!normalizedAction) error = `ประเภท Action ไม่ถูกต้อง (${r.action})`
        else if (emp && existingKeys.has(`${emp.id}|${r.date}`)) error = 'มีข้อมูลของวันนี้อยู่แล้ว (ข้าม)'

        if (error && error.startsWith('มีข้อมูล')) duplicateCount++
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
    error?: string
}

export async function importCheckins(rows: ValidatedRow[]): Promise<ImportResult> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { inserted: 0, skipped: 0, error: 'ไม่มีสิทธิ์เข้าถึง' }
    }

    const valid = rows.filter(r => r.isValid && r.employeeId && r.normalizedAction)
    if (!valid.length) {
        return { inserted: 0, skipped: rows.length, error: 'ไม่มีข้อมูลที่ผ่านการตรวจสอบ' }
    }

    type Grouped = {
        employeeId: string
        date: string
        inAt: string | null
        outAt: string | null
    }
    const grouped = new Map<string, Grouped>()

    for (const r of valid) {
        const key = `${r.employeeId}|${r.date}`
        const timeStr = r.time.length === 5 ? `${r.time}:00` : r.time
        const timestamp = `${r.date}T${timeStr}+07:00`

        const existing = grouped.get(key) ?? {
            employeeId: r.employeeId!,
            date: r.date,
            inAt: null,
            outAt: null,
        }

        if (r.normalizedAction === 'in') {
            if (!existing.inAt || timestamp < existing.inAt) existing.inAt = timestamp
        } else {
            if (!existing.outAt || timestamp > existing.outAt) existing.outAt = timestamp
        }
        grouped.set(key, existing)
    }

    const records = Array.from(grouped.values())
        .filter(g => g.inAt)
        .map(g => ({
            employee_id: g.employeeId,
            type: 'office',
            checked_in_at: g.inAt,
            checked_out_at: g.outAt,
            accuracy_meters: 0,
            distance_from_office: 0,
            source: 'card',
        }))

    if (!records.length) {
        return { inserted: 0, skipped: rows.length, error: 'ไม่มีรายการ Check-In ที่จับคู่ได้' }
    }

    const { error } = await supabaseAdmin.from('checkins').insert(records)
    if (error) {
        console.error('Card import insert error:', error)
        return { inserted: 0, skipped: rows.length, error: error.message }
    }

    revalidatePath('/hradmin/attendance')
    return {
        inserted: records.length,
        skipped: rows.length - valid.length,
    }
}
