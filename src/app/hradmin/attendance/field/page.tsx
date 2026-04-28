import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { FieldCheckinView, type FieldCheckin, type EmployeeFieldStat } from './field-view'

export const dynamic = 'force-dynamic'

/** Field check-in audit dashboard.
 *
 *  Pulls the last 30 days of checkins where type='field', joins employee
 *  names + the active office geofence, and computes a small anomaly
 *  signal per row before handing everything to the client view.
 *
 *  Permission gate matches /hradmin/attendance/* — any HR staff (manager
 *  + hr_admin or anyone with HR-flag permissions) can review this. We
 *  don't gate on can_manage_system because this is everyday review work,
 *  not super-admin territory. */
export default async function FieldCheckinAuditPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')

    const since = new Date()
    since.setDate(since.getDate() - 30)
    since.setHours(0, 0, 0, 0)

    // ── Load office geofence (used for the "inside office radius" flag) ──
    const { data: office } = await supabaseAdmin
        .from('check_in_locations')
        .select('latitude, longitude, radius_meters')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    // ── Pull field check-ins for the window ──
    const { data: rows, error } = await supabaseAdmin
        .from('checkins')
        .select('id, employee_id, type, latitude, longitude, accuracy_meters, distance_from_office, checked_in_at, notes')
        .eq('type', 'field')
        .gte('checked_in_at', since.toISOString())
        .order('checked_in_at', { ascending: false })

    if (error) {
        console.error('[hradmin/field] checkins fetch failed:', error)
    }

    const checkins = (rows ?? []) as Array<{
        id: string
        employee_id: string
        type: string
        latitude: number | null
        longitude: number | null
        accuracy_meters: number | null
        distance_from_office: number | null
        checked_in_at: string
        notes: string | null
    }>

    // ── Resolve employee names in one round-trip ──
    const employeeIds = Array.from(new Set(checkins.map(c => c.employee_id))).filter(Boolean)
    const empMap = new Map<string, { name: string; nickname: string | null; department: string | null; employee_code: string | null }>()
    if (employeeIds.length > 0) {
        const { data: emps } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, department, employee_code')
            .in('id', employeeIds)
        for (const e of emps ?? []) {
            empMap.set(e.id as string, {
                name: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim() || (e.employee_code ?? ''),
                nickname: e.nickname ?? null,
                department: e.department ?? null,
                employee_code: e.employee_code ?? null,
            })
        }
    }

    // ── Compute per-row anomalies + flatten ──
    const radius = office?.radius_meters ?? 100
    const items: FieldCheckin[] = checkins.map(c => {
        const flags: string[] = []
        // The "field click but GPS is actually at office" anomaly — most
        // common cheat. Distance is recorded by the action even for field
        // type, precisely so this heuristic can fire.
        if (c.distance_from_office !== null && c.distance_from_office < radius) {
            flags.push('in_office')
        }
        // "Lazy note" — passes the 5-char minimum but doesn't actually
        // describe anything ("ออก", "ประชุม", "ลูกค้า"). Trigger on ≤ 8
        // chars so the threshold sits just above the validation gate.
        if (c.notes && c.notes.trim().length <= 8) {
            flags.push('short_note')
        }
        const emp = empMap.get(c.employee_id)
        return {
            id: c.id,
            employeeId: c.employee_id,
            employeeName: emp?.name ?? '(ไม่ทราบชื่อ)',
            employeeNickname: emp?.nickname ?? null,
            employeeCode: emp?.employee_code ?? null,
            department: emp?.department ?? null,
            checkedInAt: c.checked_in_at,
            note: c.notes,
            latitude: c.latitude,
            longitude: c.longitude,
            accuracyMeters: c.accuracy_meters,
            distanceFromOffice: c.distance_from_office,
            flags,
        }
    })

    // ── Per-employee summary (count + % of weekdays in the window) ──
    // The window is 30 days — count weekdays (Mon-Fri) for the percentage
    // baseline. This is approximate (doesn't subtract holidays) but good
    // enough for spotting outliers.
    const weekdaysInWindow = countWeekdays(since, new Date())
    const perEmp = new Map<string, EmployeeFieldStat>()
    for (const item of items) {
        const day = item.checkedInAt.slice(0, 10)
        const existing = perEmp.get(item.employeeId)
        if (existing) {
            existing.totalCheckins += 1
            existing.uniqueDays.add(day)
            if (item.flags.includes('in_office')) existing.inOfficeFlags += 1
        } else {
            perEmp.set(item.employeeId, {
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                employeeNickname: item.employeeNickname,
                department: item.department,
                totalCheckins: 1,
                uniqueDays: new Set([day]),
                inOfficeFlags: item.flags.includes('in_office') ? 1 : 0,
            })
        }
    }
    const stats = Array.from(perEmp.values())
        .map(s => ({
            ...s,
            uniqueDayCount: s.uniqueDays.size,
            percentOfWeekdays: weekdaysInWindow > 0
                ? Math.round((s.uniqueDays.size / weekdaysInWindow) * 100)
                : 0,
        }))
        .sort((a, b) => b.uniqueDayCount - a.uniqueDayCount)

    return (
        <FieldCheckinView
            items={items}
            stats={stats}
            windowDays={30}
            weekdaysInWindow={weekdaysInWindow}
        />
    )
}

function countWeekdays(start: Date, end: Date): number {
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
        const dow = cur.getDay()
        if (dow >= 1 && dow <= 5) count++
        cur.setDate(cur.getDate() + 1)
    }
    return count
}
