'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { revalidatePath } from 'next/cache'
import {
    OUTSIDE_HEAD_OFFICE_CHECKIN_TYPE,
    normalizeOutsideHeadOfficeCheckin,
} from '@/lib/outside-head-office'

export interface AttendanceStats {
    totalEmployees: number
    officeCount: number
    wfhCount: number
    outsideHeadOfficeCount: number
    offsiteCount: number
    notCheckedInCount: number
}

export interface AttendanceRecord {
    employeeId: string
    employeeCode: string | null
    employeeName: string
    nickname: string | null
    department: string | null
    position: string | null
    photoUrl: string | null
    workLocation: string | null
    hrNote: string | null
    hrNoteUpdatedAt: string | null
    gpsReviewRequest: {
        id: string
        status: string
        employee_note: string | null
        gps_error: string | null
        created_at: string
    } | null
    checkin: {
        id: string
        type: string
        latitude: number | null
        longitude: number | null
        accuracy_meters: number | null
        distance_from_office: number | null
        checked_in_at: string
        checked_out_at: string | null
        notes?: string | null
    } | null
}

type AttendanceCheckin = NonNullable<AttendanceRecord['checkin']>

function isValidDateKey(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function getAttendanceForDate(dateStr: string) {
    // dateStr: 'YYYY-MM-DD'
    const startOfDay = new Date(dateStr + 'T00:00:00+07:00')
    const endOfDay = new Date(dateStr + 'T23:59:59.999+07:00')

    // 1. Get all active employees (including advisors)
    const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, photo_url, status, work_location')
        .eq('status', 'active')
        .order('first_name_th', { ascending: true })

    if (empError) {
        console.error('employees fetch error:', empError)
        return { error: empError.message }
    }

    // 2. Get mobile checkins and HIP card scans for this Bangkok day
    const [checkinsResult, cardScansResult] = await Promise.all([
        supabaseAdmin
            .from('checkins')
            .select('*')
            .gte('checked_in_at', startOfDay.toISOString())
            .lte('checked_in_at', endOfDay.toISOString()),
        supabaseAdmin
            .from('card_scans')
            .select('id, employee_id, scan_time')
            .gte('scan_time', `${dateStr}T00:00:00`)
            .lte('scan_time', `${dateStr}T23:59:59.999`)
            .order('scan_time', { ascending: true }),
    ])

    if (checkinsResult.error) {
        console.error('checkins fetch error:', checkinsResult.error)
        return { error: checkinsResult.error.message }
    }
    if (cardScansResult.error) {
        console.error('card_scans fetch error:', cardScansResult.error)
        return { error: cardScansResult.error.message }
    }

    // 3. Map employees to their checkin (if any)
    const checkinByEmpId = new Map<string, AttendanceCheckin>()
    for (const c of checkinsResult.data ?? []) {
        const normalizedCheckin = normalizeOutsideHeadOfficeCheckin(c)
        // Take latest checkin if multiple
        const existing = checkinByEmpId.get(normalizedCheckin.employee_id)
        if (!existing || new Date(normalizedCheckin.checked_in_at) > new Date(existing.checked_in_at)) {
            checkinByEmpId.set(normalizedCheckin.employee_id, normalizedCheckin)
        }
    }
    for (const scan of cardScansResult.data ?? []) {
        // A physical card scan proves the employee is in the office.
        // Keep the first scan as their displayed arrival time.
        const existing = checkinByEmpId.get(scan.employee_id)
        if (!existing || existing.type !== 'office') {
            checkinByEmpId.set(scan.employee_id, {
                id: `card-scan-${scan.id}`,
                type: 'office',
                latitude: null,
                longitude: null,
                accuracy_meters: null,
                distance_from_office: null,
                checked_in_at: `${scan.scan_time}+07:00`,
                checked_out_at: null,
            })
        }
    }

    const attendanceNotesByEmpId = new Map<string, { note: string | null; updatedAt: string | null }>()
    const gpsReviewByEmpId = new Map<string, {
        id: string
        status: string
        employee_note: string | null
        gps_error: string | null
        created_at: string
    }>()
    const [attendanceNotesResult, gpsReviewResult] = await Promise.all([
        supabaseAdmin
            .from('attendance_logs')
            .select('employee_id, hr_note, hr_note_updated_at')
            .gte('date', `${dateStr}T00:00:00`)
            .lte('date', `${dateStr}T23:59:59.999`),
        supabaseAdmin
            .from('attendance_gps_review_requests')
            .select('id, employee_id, status, employee_note, gps_error, created_at')
            .eq('requested_for_date', dateStr)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
    ])

    if (attendanceNotesResult.error) {
        console.warn('attendance_logs hr notes fetch warning:', attendanceNotesResult.error.message)
    } else {
        for (const row of attendanceNotesResult.data ?? []) {
            attendanceNotesByEmpId.set(row.employee_id as string, {
                note: (row.hr_note as string | null) ?? null,
                updatedAt: (row.hr_note_updated_at as string | null) ?? null,
            })
        }
    }
    if (gpsReviewResult.error) {
        console.warn('attendance_gps_review_requests fetch warning:', gpsReviewResult.error.message)
    } else {
        for (const row of gpsReviewResult.data ?? []) {
            if (!gpsReviewByEmpId.has(row.employee_id as string)) {
                gpsReviewByEmpId.set(row.employee_id as string, {
                    id: String(row.id),
                    status: String(row.status),
                    employee_note: (row.employee_note as string | null) ?? null,
                    gps_error: (row.gps_error as string | null) ?? null,
                    created_at: String(row.created_at),
                })
            }
        }
    }

    const records: AttendanceRecord[] = (employees ?? []).map(emp => ({
        employeeId: emp.id,
        employeeCode: emp.employee_code ?? null,
        employeeName: `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim() || 'ไม่มีชื่อ',
        nickname: emp.nickname ?? null,
        department: emp.department ?? null,
        position: emp.position ?? null,
        photoUrl: emp.photo_url ?? null,
        workLocation: emp.work_location ?? null,
        hrNote: attendanceNotesByEmpId.get(emp.id)?.note ?? null,
        hrNoteUpdatedAt: attendanceNotesByEmpId.get(emp.id)?.updatedAt ?? null,
        gpsReviewRequest: gpsReviewByEmpId.get(emp.id) ?? null,
        checkin: checkinByEmpId.get(emp.id) ?? null,
    }))

    // 4. Compute stats
    let officeCount = 0
    let wfhCount = 0
    let outsideHeadOfficeCount = 0
    let offsiteCount = 0
    let notCheckedInCount = 0

    for (const r of records) {
        if (!r.checkin) {
            notCheckedInCount++
        } else if (r.checkin.type === 'office') {
            officeCount++
        } else if (r.checkin.type === 'wfh') {
            wfhCount++
        } else if (r.checkin.type === OUTSIDE_HEAD_OFFICE_CHECKIN_TYPE) {
            outsideHeadOfficeCount++
        } else {
            offsiteCount++
        }
    }

    const stats: AttendanceStats = {
        totalEmployees: records.length,
        officeCount,
        wfhCount,
        outsideHeadOfficeCount,
        offsiteCount,
        notCheckedInCount,
    }

    // Fetch last sync time from card_scans
    const { data: lastScan } = await supabaseAdmin
        .from('card_scans')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return {
        success: true,
        stats,
        records,
        fetchedAt: new Date().toISOString(),
        lastSyncTime: lastScan?.created_at ?? null,
    }
}

export async function saveAttendanceHrNote(input: {
    date: string
    employeeId: string
    note: string
}) {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'ไม่มีสิทธิ์บันทึกหมายเหตุ' }
    }

    const date = String(input.date ?? '').trim()
    const employeeId = String(input.employeeId ?? '').trim()
    const note = String(input.note ?? '').trim()

    if (!isValidDateKey(date)) return { error: 'รูปแบบวันที่ไม่ถูกต้อง' }
    if (!employeeId) return { error: 'ไม่พบพนักงาน' }
    if (note.length > 500) return { error: 'หมายเหตุยาวเกิน 500 ตัวอักษร' }

    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59.999`
    const now = new Date().toISOString()

    const { data: existing, error: existingError } = await supabaseAdmin
        .from('attendance_logs')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('date', dayStart)
        .lte('date', dayEnd)
        .limit(1)
        .maybeSingle()

    if (existingError) return { error: existingError.message }

    const nextValues: Record<string, unknown> = {
        hr_note: note || null,
        hr_note_updated_at: now,
        hr_note_updated_by: auth.session.id,
        updated_at: now,
    }

    if (existing?.id) {
        const { error } = await supabaseAdmin
            .from('attendance_logs')
            .update(nextValues)
            .eq('id', existing.id)
        if (error) return { error: error.message }
    } else {
        const { error } = await supabaseAdmin
            .from('attendance_logs')
            .insert({
                id: `al_${date.replace(/-/g, '')}_${employeeId.slice(0, 8)}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                employee_id: employeeId,
                date: dayStart,
                ...nextValues,
                created_at: now,
            })
        if (error) return { error: error.message }
    }

    revalidatePath('/hradmin/attendance')
    revalidatePath('/hradmin/attendance/reconcile')
    return { success: true, note: note || null, updatedAt: now }
}
