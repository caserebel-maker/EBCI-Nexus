'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AttendanceStats {
    totalEmployees: number
    officeCount: number
    wfhCount: number
    offsiteCount: number
    notCheckedInCount: number
}

export interface AttendanceRecord {
    employeeId: string
    employeeName: string
    nickname: string | null
    department: string | null
    position: string | null
    photoUrl: string | null
    workLocation: string | null
    checkin: {
        id: string
        type: string
        latitude: number | null
        longitude: number | null
        accuracy_meters: number | null
        distance_from_office: number | null
        checked_in_at: string
        checked_out_at: string | null
    } | null
}

type AttendanceCheckin = NonNullable<AttendanceRecord['checkin']>

export async function getAttendanceForDate(dateStr: string) {
    // dateStr: 'YYYY-MM-DD'
    const startOfDay = new Date(dateStr + 'T00:00:00+07:00')
    const endOfDay = new Date(dateStr + 'T23:59:59.999+07:00')

    // 1. Get all active employees
    const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, status, work_location')
        .eq('status', 'active')
        .neq('is_advisor', true)
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
        // Take latest checkin if multiple
        const existing = checkinByEmpId.get(c.employee_id)
        if (!existing || new Date(c.checked_in_at) > new Date(existing.checked_in_at)) {
            checkinByEmpId.set(c.employee_id, c)
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

    const records: AttendanceRecord[] = (employees ?? []).map(emp => ({
        employeeId: emp.id,
        employeeName: `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim() || 'ไม่มีชื่อ',
        nickname: emp.nickname ?? null,
        department: emp.department ?? null,
        position: emp.position ?? null,
        photoUrl: emp.photo_url ?? null,
        workLocation: emp.work_location ?? null,
        checkin: checkinByEmpId.get(emp.id) ?? null,
    }))

    // 4. Compute stats
    let officeCount = 0
    let wfhCount = 0
    let offsiteCount = 0
    let notCheckedInCount = 0

    for (const r of records) {
        if (!r.checkin) {
            notCheckedInCount++
        } else if (r.checkin.type === 'office') {
            officeCount++
        } else if (r.checkin.type === 'wfh') {
            wfhCount++
        } else {
            offsiteCount++
        }
    }

    const stats: AttendanceStats = {
        totalEmployees: records.length,
        officeCount,
        wfhCount,
        offsiteCount,
        notCheckedInCount,
    }

    return {
        success: true,
        stats,
        records,
        fetchedAt: new Date().toISOString(),
    }
}
