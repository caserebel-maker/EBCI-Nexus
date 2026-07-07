import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokTodayIso } from '@/lib/leave-validations'

/**
 * "Who's out today" surface — powers the dashboard widget + the
 * /portal/who-is-out detail page. Single source of truth so both
 * surfaces are consistent.
 *
 * Mod's brief (4 May, two beta tester request):
 *   "ควรมีระบบให้พนักงานทุกคนรู้ว่าวันนี้ใครลากิจ ลาป่วย WFH
 *    เวลาจะติดต่องานไม่ต้องเดินลงไปหา"
 *
 * Decision points Mod confirmed:
 *   1. ลาทำหมัน → show ตรง ๆ (no aggregation)
 *   2. ภาคสนาม (field check-in) → count as "not in office"
 *
 * Privacy: surface STATUS only (ลาป่วย, ลากิจ, WFH, ภาคสนาม).
 * Never include `reason`, attachment URLs, or medical notes — those
 * stay between employee + approver.
 */

export type WhoIsOutKind = 'leave' | 'wfh' | 'field'
export type WhoIsOutWorkLocation = 'johnson' | 'saraburi' | string | null

export interface WhoIsOutEntry {
    employeeId: string
    firstNameTh: string
    lastNameTh: string | null
    nickname: string | null
    department: string | null
    position: string | null
    workLocation: WhoIsOutWorkLocation
    /** Sort key — leave/wfh come first (planned), field last (ad-hoc). */
    kind: WhoIsOutKind
    /** Display label used in the badge: "ลาป่วย" / "ลากิจ" / "WFH" /
     *  "ออกพื้นที่". For half-day leaves, "ลาป่วย (เช้า)" etc. */
    statusLabel: string
    /** When true, render a half-day chip alongside the badge. */
    isHalfDay: boolean
    halfDayPeriod: 'morning' | 'afternoon' | null
    /** WFH only — the contact-during-WFH field employee filled in
     *  (Line ID, mobile, etc). null when not provided or not applicable. */
    contact: string | null
    /** Field check-in only — the destination/reason note. Empty string
     *  is filtered out by the lib (note is required at submit time but
     *  legacy rows may have it blank). */
    fieldNote: string | null
    photoUrl: string | null
}

interface LeaveRow {
    employee_id: string
    leave_type_id: string
    is_half_day: boolean | null
    half_day_period: string | null
}
interface WfhRow {
    employee_id: string
    contact_during_wfh: string | null
}
interface FieldCheckinRow {
    employee_id: string
    notes: string | null
}
interface EmployeeRow {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    work_location: string | null
    photo_url: string | null
}

const PERMANENT_NON_HEAD_OFFICE_LOCATIONS = new Set(['johnson', 'saraburi'])

function isPermanentNonHeadOffice(emp: EmployeeRow | undefined): boolean {
    return !!emp?.work_location && PERMANENT_NON_HEAD_OFFICE_LOCATIONS.has(emp.work_location)
}

/**
 * Fetch every employee that's out of the office today (in Bangkok),
 * across all 3 sources. Empty array = everyone's at the office (or
 * status data is missing — but if leave/wfh tables genuinely have
 * zero rows for today, that's the truthful answer).
 */
export async function fetchWhoIsOutToday(): Promise<WhoIsOutEntry[]> {
    const today = bangkokTodayIso() // YYYY-MM-DD (Bangkok)

    // Bangkok 00:00 today, expressed as UTC (-7h). Used to bound the
    // checkins.checked_in_at filter (which is stored in UTC). Window
    // ends at +24h to cover the whole BKK calendar day.
    const todayBkkStartUtc = new Date(`${today}T00:00:00+07:00`).toISOString()
    const tomorrowBkkStartUtc = new Date(
        new Date(`${today}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString()

    // ── 3 parallel fetches ────────────────────────────────────────────
    const [leavesRes, wfhRes, fieldRes] = await Promise.all([
        supabaseAdmin
            .from('leave_requests')
            .select('employee_id, leave_type_id, is_half_day, half_day_period')
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today),
        supabaseAdmin
            .from('wfh_requests')
            .select('employee_id, contact_during_wfh')
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today),
        supabaseAdmin
            .from('checkins')
            .select('employee_id, notes')
            .eq('type', 'field')
            .gte('checked_in_at', todayBkkStartUtc)
            .lt('checked_in_at', tomorrowBkkStartUtc),
    ])

    const leaveRows = (leavesRes.data ?? []) as LeaveRow[]
    const wfhRows = (wfhRes.data ?? []) as WfhRow[]
    const fieldRows = (fieldRes.data ?? []) as FieldCheckinRow[]

    // Collect all employee IDs we care about + look up names in one round-trip
    const allEmpIds = Array.from(new Set([
        ...leaveRows.map(r => r.employee_id),
        ...wfhRows.map(r => r.employee_id),
        ...fieldRows.map(r => r.employee_id),
    ])).filter(Boolean)

    if (allEmpIds.length === 0) return []

    const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, nickname, department, position, work_location, photo_url')
        .in('id', allEmpIds)
        .eq('status', 'active')
    const empMap = new Map<string, EmployeeRow>(
        (empData ?? []).map(e => [e.id as string, e as EmployeeRow]),
    )

    // Leave-type lookup (for ลาป่วย / ลากิจ / etc display labels). Only
    // the IDs we actually need.
    const leaveTypeIds = Array.from(new Set(leaveRows.map(r => r.leave_type_id).filter(Boolean)))
    const leaveTypeMap = new Map<string, string>()
    if (leaveTypeIds.length > 0) {
        const { data: ltData } = await supabaseAdmin
            .from('leave_types')
            .select('id, name_th')
            .in('id', leaveTypeIds)
        for (const lt of (ltData ?? []) as Array<{ id: string; name_th: string | null }>) {
            leaveTypeMap.set(lt.id, lt.name_th ?? 'ลา')
        }
    }

    // ── Build entries ─────────────────────────────────────────────────
    const entries: WhoIsOutEntry[] = []

    // Field check-ins first into a Set for dedup — if someone is BOTH
    // on approved WFH and also tapped "ออกพื้นที่" today, prefer the
    // field signal (it's the more current state). Same for leave +
    // field (rare but possible if an employee revoked leave morning of).
    const fieldEmployeeIds = new Set(fieldRows.map(r => r.employee_id))
    const wfhEmployeeIds = new Set(wfhRows.map(r => r.employee_id))

    for (const r of leaveRows) {
        if (fieldEmployeeIds.has(r.employee_id)) continue
        if (wfhEmployeeIds.has(r.employee_id)) continue
        const emp = empMap.get(r.employee_id)
        if (!emp) continue
        const baseLabel = leaveTypeMap.get(r.leave_type_id) ?? 'ลา'
        const half = r.is_half_day === true
        const period = half ? (r.half_day_period as 'morning' | 'afternoon' | null) : null
        const halfSuffix = half
            ? (period === 'morning' ? ' (เช้า)' : period === 'afternoon' ? ' (บ่าย)' : ' (ครึ่งวัน)')
            : ''
        entries.push({
            employeeId: r.employee_id,
            firstNameTh: emp.first_name_th ?? '',
            lastNameTh: emp.last_name_th,
            nickname: emp.nickname,
            department: emp.department,
            position: emp.position,
            workLocation: emp.work_location,
            kind: 'leave',
            statusLabel: `${baseLabel}${halfSuffix}`,
            isHalfDay: half,
            halfDayPeriod: period,
            contact: null,
            fieldNote: null,
            photoUrl: emp.photo_url ?? null,
        })
    }

    for (const r of wfhRows) {
        if (fieldEmployeeIds.has(r.employee_id)) continue
        const emp = empMap.get(r.employee_id)
        if (!emp) continue
        if (isPermanentNonHeadOffice(emp)) continue
        entries.push({
            employeeId: r.employee_id,
            firstNameTh: emp.first_name_th ?? '',
            lastNameTh: emp.last_name_th,
            nickname: emp.nickname,
            department: emp.department,
            position: emp.position,
            workLocation: emp.work_location,
            kind: 'wfh',
            statusLabel: 'WFH',
            isHalfDay: false,
            halfDayPeriod: null,
            contact: r.contact_during_wfh?.trim() || null,
            fieldNote: null,
            photoUrl: emp.photo_url ?? null,
        })
    }

    // Field — dedup by employee (one tap is enough; multi-tap = same person)
    const seenField = new Set<string>()
    for (const r of fieldRows) {
        if (seenField.has(r.employee_id)) continue
        seenField.add(r.employee_id)
        const emp = empMap.get(r.employee_id)
        if (!emp) continue
        if (isPermanentNonHeadOffice(emp)) continue
        entries.push({
            employeeId: r.employee_id,
            firstNameTh: emp.first_name_th ?? '',
            lastNameTh: emp.last_name_th,
            nickname: emp.nickname,
            department: emp.department,
            position: emp.position,
            workLocation: emp.work_location,
            kind: 'field',
            statusLabel: 'ออกพื้นที่',
            isHalfDay: false,
            halfDayPeriod: null,
            contact: null,
            fieldNote: r.notes?.trim() || null,
            photoUrl: emp.photo_url ?? null,
        })
    }

    // Sort: WFH → leave → field (stability for the widget's compact
    // top-N preview), then alphabetical by nickname (Thai locale).
    const kindOrder: Record<WhoIsOutKind, number> = { wfh: 0, leave: 1, field: 2 }
    entries.sort((a, b) => {
        const k = kindOrder[a.kind] - kindOrder[b.kind]
        if (k !== 0) return k
        const aName = (a.nickname || a.firstNameTh || '').toLocaleLowerCase('th')
        const bName = (b.nickname || b.firstNameTh || '').toLocaleLowerCase('th')
        return aName.localeCompare(bName, 'th')
    })

    return entries
}
