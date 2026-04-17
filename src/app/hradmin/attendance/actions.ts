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

export async function getAttendanceForDate(dateStr: string) {
    // dateStr: 'YYYY-MM-DD'
    const startOfDay = new Date(dateStr + 'T00:00:00')
    const endOfDay = new Date(dateStr + 'T23:59:59.999')

    // 1. Get all active employees
    const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, status')
        .eq('status', 'active')
        .order('first_name_th', { ascending: true })

    if (empError) {
        console.error('employees fetch error:', empError)
        return { error: empError.message }
    }

    // 2. Get checkins for this day
    const { data: checkins, error: chkError } = await supabaseAdmin
        .from('checkins')
        .select('*')
        .gte('checked_in_at', startOfDay.toISOString())
        .lte('checked_in_at', endOfDay.toISOString())

    if (chkError) {
        console.error('checkins fetch error:', chkError)
        return { error: chkError.message }
    }

    // 3. Map employees to their checkin (if any)
    const checkinByEmpId = new Map<string, any>()
    for (const c of checkins ?? []) {
        // Take latest checkin if multiple
        const existing = checkinByEmpId.get(c.employee_id)
        if (!existing || new Date(c.checked_in_at) > new Date(existing.checked_in_at)) {
            checkinByEmpId.set(c.employee_id, c)
        }
    }

    const records: AttendanceRecord[] = (employees ?? []).map((emp: any) => ({
        employeeId: emp.id,
        employeeName: `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim() || 'ไม่มีชื่อ',
        nickname: emp.nickname ?? null,
        department: emp.department ?? null,
        position: emp.position ?? null,
        photoUrl: emp.photo_url ?? null,
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
