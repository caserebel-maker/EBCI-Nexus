import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { OverviewView } from './overview-view'
import { RequestsView } from './requests-view'
import { BalancesView } from './balances-view'
import { CalendarView, type CalendarEvent, type CalendarHoliday } from './calendar-view'

export const dynamic = 'force-dynamic'

type TabKey = 'overview' | 'requests' | 'balances' | 'calendar'

interface SearchParams {
    tab?: string
    year?: string
    // Tab 2 filter params
    page?: string
    status?: string      // comma-separated: "pending,approved"
    leave_type?: string  // comma-separated leave_type_id list
    department?: string  // comma-separated department list
    q?: string           // employee search (nickname / code)
    from?: string        // start_date filter YYYY-MM-DD
    to?: string          // start_date filter YYYY-MM-DD
    request?: string     // leave_requests.id to open in the detail drawer
    // Tab 3 filter params
    level?: string       // comma-separated approval_level (1..5)
    filter?: string      // quick filter keyword: used_high | unused | adjusted
    // Tab 4 (calendar) filter params
    month?: string       // YYYY-MM, defaults to current month
}

const PAGE_SIZE = 20
const BALANCES_PAGE_SIZE = 25

const ALLOWED_TABS = new Set<TabKey>(['overview', 'requests', 'balances', 'calendar'])
const IMPLEMENTED_TABS = new Set<TabKey>(['overview', 'requests', 'balances', 'calendar'])

function normalizeTab(raw: string | undefined): TabKey {
    const t = (raw ?? 'overview') as TabKey
    if (!ALLOWED_TABS.has(t)) return 'overview'
    if (!IMPLEMENTED_TABS.has(t)) return 'overview'
    return t
}

interface RawLeaveRequest {
    id: string
    employee_id: string
    leave_type_id: string
    start_date: string
    end_date: string
    total_days: number
    reason: string | null
    status: string
    submitted_at: string | null
    created_at: string
    updated_at: string | null
    reference_code: string | null
    approver_id: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    cancellation_reason?: string | null
    cancellation_requested_at?: string | null
    attachment_url: string | null
    attachment_name: string | null
    is_half_day: boolean | null
    half_day_period: string | null
    contact_during_leave: string | null
}

interface RawEmployee {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    photo_url: string | null
    email: string | null
    supervisor_id?: string | null
}

interface RawLeaveType {
    id: string
    name_th: string
    color: string | null
    icon: string | null
    display_order: number | null
}

interface RawBalance {
    employee_id: string
    leave_type_id: string
    total_days: number
    used_days: number
    pending_days: number
    year: number
}

/**
 * HR Leave Management — dispatches to the right tab view.
 *
 *   • ?tab=overview  (default)  → Tab 1 aggregate dashboard
 *   • ?tab=requests             → Tab 2 filterable request table
 *
 * Tabs 3/4 (employees / calendar) are rendered as disabled stubs by
 * OverviewView so navigation hints stay visible; clicking them does
 * nothing yet.
 */
export default async function LeaveOverviewPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')

    const sp = await searchParams
    const tab = normalizeTab(sp.tab)

    const nowYear = new Date().getFullYear()
    const requestedYear = parseInt(sp.year ?? '', 10)
    const year = Number.isFinite(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100
        ? requestedYear
        : nowYear

    if (tab === 'requests') {
        return renderRequestsTab(sp, year)
    }
    if (tab === 'balances') {
        return renderBalancesTab(sp, year)
    }
    if (tab === 'calendar') {
        return renderCalendarTab(sp, year)
    }
    return renderOverviewTab(sp, year)
}

// ─── Tab 1: Overview ───────────────────────────────────────────────────────

async function renderOverviewTab(_sp: SearchParams, year: number) {
    const prevYear = year - 1
    const yStart = `${year}-01-01`
    const yEnd = `${year}-12-31`
    const pStart = `${prevYear}-01-01`
    const pEnd = `${prevYear}-12-31`

    const [
        curRequestsRes,
        prevRequestsCountRes,
        employeesRes,
        leaveTypesRes,
        balancesRes,
    ] = await Promise.all([
        supabaseAdmin
            .from('leave_requests')
            .select('id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, submitted_at, created_at, updated_at, reference_code')
            .gte('start_date', yStart)
            .lte('start_date', yEnd)
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('leave_requests')
            .select('id', { count: 'exact', head: true })
            .gte('start_date', pStart)
            .lte('start_date', pEnd),
        supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, department, position, photo_url')
            .eq('status', 'active'),
        supabaseAdmin
            .from('leave_types')
            .select('id, name_th, color, icon, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true, nullsFirst: false }),
        supabaseAdmin
            .from('leave_balances')
            .select('employee_id, leave_type_id, total_days, used_days, pending_days, year')
            .eq('year', year),
    ])

    const curRequests = (curRequestsRes.data ?? []) as RawLeaveRequest[]
    const prevYearCount = prevRequestsCountRes.count ?? 0
    const employees = (employeesRes.data ?? []) as RawEmployee[]
    const leaveTypes = (leaveTypesRes.data ?? []) as RawLeaveType[]
    const balances = (balancesRes.data ?? []) as RawBalance[]

    const total = curRequests.length
    const pending = curRequests.filter(r => r.status === 'pending').length
    const approved = curRequests.filter(r => r.status === 'approved').length
    const rejected = curRequests.filter(r => r.status === 'rejected').length
    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0
    const yoyDelta = prevYearCount > 0
        ? Math.round(((total - prevYearCount) / prevYearCount) * 100)
        : null

    const utilizationSamples = balances.filter(b => Number(b.total_days) > 0)
    const utilizationRate = utilizationSamples.length > 0
        ? Math.round(
            utilizationSamples.reduce((sum, b) => {
                const used = Number(b.used_days) + Number(b.pending_days)
                const tot = Number(b.total_days)
                return sum + (used / tot)
            }, 0) / utilizationSamples.length * 100,
        )
        : 0

    const annualType = leaveTypes.find(t =>
        (t.name_th ?? '').includes('พักร้อน')
        || (t as unknown as { name_en?: string }).name_en === 'annual',
    ) ?? leaveTypes[0]
    const annualBalances = annualType
        ? balances.filter(b => b.leave_type_id === annualType.id)
        : []
    const avgAnnualUsed = annualBalances.length > 0
        ? +(annualBalances.reduce((sum, b) => sum + Number(b.used_days), 0) / annualBalances.length).toFixed(1)
        : 0

    const monthly: Array<Record<string, number | string>> = []
    for (let m = 1; m <= 12; m++) {
        const row: Record<string, number | string> = { month: m }
        for (const t of leaveTypes) row[t.id] = 0
        monthly.push(row)
    }
    for (const r of curRequests) {
        if (r.status !== 'approved' && r.status !== 'pending') continue
        const m = new Date(r.start_date).getMonth()
        const row = monthly[m]
        if (row && typeof row[r.leave_type_id] === 'number') {
            row[r.leave_type_id] = (row[r.leave_type_id] as number) + 1
        }
    }

    const pieRaw = new Map<string, number>()
    for (const r of curRequests) {
        if (r.status !== 'approved') continue
        pieRaw.set(r.leave_type_id, (pieRaw.get(r.leave_type_id) ?? 0) + 1)
    }
    const pie = Array.from(pieRaw.entries()).map(([typeId, count]) => {
        const t = leaveTypes.find(x => x.id === typeId)
        return {
            leave_type_id: typeId,
            name_th: t?.name_th ?? 'ไม่ทราบ',
            color: t?.color ?? null,
            count,
        }
    }).sort((a, b) => b.count - a.count)

    const empMap = new Map(employees.map(e => [e.id, e]))
    const deptRaw = new Map<string, number>()
    for (const r of curRequests) {
        if (r.status !== 'approved') continue
        const emp = empMap.get(r.employee_id)
        const dept = emp?.department ?? 'ไม่ระบุแผนก'
        deptRaw.set(dept, (deptRaw.get(dept) ?? 0) + Number(r.total_days))
    }
    const departments = Array.from(deptRaw.entries())
        .map(([department, total_days]) => ({ department, total_days: Number(total_days.toFixed(1)) }))
        .sort((a, b) => b.total_days - a.total_days)
        .slice(0, 5)

    const recent = curRequests.slice(0, 10).map(r => {
        const emp = empMap.get(r.employee_id)
        const t = leaveTypes.find(x => x.id === r.leave_type_id)
        return {
            id: r.id,
            reference_code: r.reference_code,
            status: r.status,
            start_date: r.start_date,
            end_date: r.end_date,
            total_days: Number(r.total_days),
            submitted_at: r.submitted_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
            leave_type: t ? { id: t.id, name_th: t.name_th, color: t.color } : null,
            employee: emp ? {
                id: emp.id,
                first_name_th: emp.first_name_th,
                last_name_th: emp.last_name_th,
                nickname: emp.nickname,
                department: emp.department,
                photo_url: emp.photo_url,
            } : null,
        }
    })

    return (
        <OverviewView
            year={year}
            stats={{
                total, pending, approved, rejected,
                approvedPct, pendingPct,
                yoyDelta, utilizationRate, avgAnnualUsed,
            }}
            monthly={monthly}
            pie={pie}
            departments={departments}
            recent={recent}
            leaveTypes={leaveTypes}
        />
    )
}

// ─── Tab 2: Requests ───────────────────────────────────────────────────────

async function renderRequestsTab(sp: SearchParams, year: number) {
    // Filter params — all comma-separated arrays come in as string[] after split
    const statusFilter = parseCsv(sp.status)
    const leaveTypeFilter = parseCsv(sp.leave_type)
    const departmentFilter = parseCsv(sp.department)
    const q = (sp.q ?? '').trim()
    const from = normalizeDate(sp.from) ?? `${year}-01-01`
    const to = normalizeDate(sp.to) ?? `${year}-12-31`
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

    // Employee search narrows employee_id pool BEFORE the request query, so
    // it composes naturally with other filters and keeps pagination honest.
    let employeeIdPool: string[] | null = null
    if (q) {
        const qLower = q.toLowerCase()
        const { data: matches } = await supabaseAdmin
            .from('employees')
            .select('id, nickname, first_name_th, last_name_th, employee_code')
            .or(`nickname.ilike.%${qLower}%,first_name_th.ilike.%${qLower}%,last_name_th.ilike.%${qLower}%,employee_code.ilike.%${qLower}%`)
            .limit(500)
        employeeIdPool = (matches ?? []).map(m => m.id as string)
        if (employeeIdPool.length === 0) {
            // Early return — no employees match search.
            return renderEmpty({ page, year, from, to })
        }
    }

    // If department filter is set, narrow the same pool.
    if (departmentFilter.length > 0) {
        const { data: deptEmps } = await supabaseAdmin
            .from('employees')
            .select('id')
            .in('department', departmentFilter)
        const deptIds = (deptEmps ?? []).map(e => e.id as string)
        employeeIdPool = employeeIdPool
            ? employeeIdPool.filter(id => deptIds.includes(id))
            : deptIds
        if (employeeIdPool.length === 0) return renderEmpty({ page, year, from, to })
    }

    // Build main query
    let query = supabaseAdmin
        .from('leave_requests')
        .select(
            `id, employee_id, leave_type_id, start_date, end_date, total_days,
             reason, status, submitted_at, created_at, updated_at, reference_code,
             approver_id, approved_at, approval_notes, rejection_reason,
             cancellation_reason, cancellation_requested_at,
             attachment_url, attachment_name, is_half_day, half_day_period,
             contact_during_leave`,
            { count: 'exact' },
        )
        .gte('start_date', from)
        .lte('start_date', to)

    if (statusFilter.length > 0) query = query.in('status', statusFilter)
    if (leaveTypeFilter.length > 0) query = query.in('leave_type_id', leaveTypeFilter)
    if (employeeIdPool) query = query.in('employee_id', employeeIdPool)

    const fromRow = (page - 1) * PAGE_SIZE
    const toRow = fromRow + PAGE_SIZE - 1
    query = query
        .order('created_at', { ascending: false })
        .range(fromRow, toRow)

    const { data: rows, count } = await query
    const requests = (rows ?? []) as RawLeaveRequest[]
    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    // Join employees + leave_types — one trip each, scoped to referenced ids
    const empIds = Array.from(new Set(requests.map(r => r.employee_id)))
    const approverIds = Array.from(new Set(
        requests.map(r => r.approver_id).filter((x): x is string => Boolean(x)),
    ))
    const allEmpIds = Array.from(new Set([...empIds, ...approverIds]))

    const [empsRes, leaveTypesRes, deptsRes] = await Promise.all([
        allEmpIds.length
            ? supabaseAdmin
                .from('employees')
                .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, email, supervisor_id')
                .in('id', allEmpIds)
            : Promise.resolve({ data: [] as RawEmployee[] }),
        supabaseAdmin
            .from('leave_types')
            .select('id, name_th, color, icon, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true, nullsFirst: false }),
        // Full department list for the filter dropdown — small table, cheap.
        supabaseAdmin
            .from('employees')
            .select('department')
            .eq('status', 'active')
            .not('department', 'is', null),
    ])

    const empMap = new Map((empsRes.data ?? []).map(e => [e.id as string, e as RawEmployee]))
    
    // Fetch missing supervisors (backup approvers) dynamically in a batch
    const missingSupervisorIds = Array.from(new Set(
        Array.from(empMap.values())
            .map(e => e.supervisor_id)
            .filter((id): id is string => Boolean(id) && !empMap.has(id))
    ))
    if (missingSupervisorIds.length > 0) {
        const { data: supervisors } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, email, supervisor_id')
            .in('id', missingSupervisorIds)
        if (supervisors) {
            for (const s of supervisors) {
                empMap.set(s.id, s as RawEmployee)
            }
        }
    }

    const leaveTypes = (leaveTypesRes.data ?? []) as RawLeaveType[]
    const departments = Array.from(
        new Set(((deptsRes.data ?? []) as Array<{ department: string | null }>)
            .map(e => e.department)
            .filter((d): d is string => Boolean(d))),
    ).sort()

    const items = requests.map(r => {
        const emp = empMap.get(r.employee_id)
        const approver = r.approver_id ? empMap.get(r.approver_id) : null
        const backupApprover = emp?.supervisor_id ? empMap.get(emp.supervisor_id) : null
        const t = leaveTypes.find(x => x.id === r.leave_type_id)
        return {
            id: r.id,
            reference_code: r.reference_code,
            status: r.status,
            start_date: r.start_date,
            end_date: r.end_date,
            total_days: Number(r.total_days),
            reason: r.reason,
            submitted_at: r.submitted_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
            approved_at: r.approved_at,
            approval_notes: r.approval_notes,
            rejection_reason: r.rejection_reason,
            cancellation_reason: r.cancellation_reason,
            cancellation_requested_at: r.cancellation_requested_at,
            attachment_url: r.attachment_url,
            attachment_name: r.attachment_name,
            is_half_day: r.is_half_day,
            half_day_period: r.half_day_period,
            contact_during_leave: r.contact_during_leave,
            leave_type: t ? { id: t.id, name_th: t.name_th, color: t.color, icon: t.icon } : null,
            employee: emp ? {
                id: emp.id,
                first_name_th: emp.first_name_th,
                last_name_th: emp.last_name_th,
                nickname: emp.nickname,
                department: emp.department,
                position: emp.position,
                photo_url: emp.photo_url,
                email: emp.email,
            } : null,
            approver: approver ? {
                id: approver.id,
                nickname: approver.nickname,
                first_name_th: approver.first_name_th,
                last_name_th: approver.last_name_th,
                photo_url: approver.photo_url,
            } : null,
            backupApprover: backupApprover ? {
                id: backupApprover.id,
                nickname: backupApprover.nickname,
                first_name_th: backupApprover.first_name_th,
                last_name_th: backupApprover.last_name_th,
                photo_url: backupApprover.photo_url,
            } : null,
        }
    })

    return (
        <RequestsView
            year={year}
            filters={{
                status: statusFilter,
                leave_type: leaveTypeFilter,
                department: departmentFilter,
                q,
                from,
                to,
            }}
            pagination={{
                page,
                pageSize: PAGE_SIZE,
                total,
                totalPages,
            }}
            items={items}
            leaveTypes={leaveTypes}
            departments={departments}
        />
    )
}

function renderEmpty({ page, year, from, to }: { page: number; year: number; from: string; to: string }) {
    return (
        <RequestsView
            year={year}
            filters={{
                status: [], leave_type: [], department: [], q: '',
                from, to,
            }}
            pagination={{ page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 }}
            items={[]}
            leaveTypes={[]}
            departments={[]}
        />
    )
}

function parseCsv(raw: string | undefined): string[] {
    if (!raw) return []
    return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function normalizeDate(raw: string | undefined): string | null {
    if (!raw) return null
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

// ─── Tab 3: Balances ──────────────────────────────────────────────────────

async function renderBalancesTab(sp: SearchParams, year: number) {
    const departmentFilter = parseCsv(sp.department)
    const levelFilter = parseCsv(sp.level).map(n => parseInt(n, 10)).filter(Number.isFinite)
    const leaveTypeFilter = parseCsv(sp.leave_type)
    const q = (sp.q ?? '').trim()
    const quickFilter = (sp.filter ?? '').trim() // used_high | unused | adjusted | ''
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

    // Employee base query — paginate HERE so the pivot stays consistent per page.
    // We sort by department + nickname so department grouping reads naturally.
    let empQuery = supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, photo_url, approval_level, work_location', { count: 'exact' })
        .eq('status', 'active')

    if (departmentFilter.length > 0) empQuery = empQuery.in('department', departmentFilter)
    if (levelFilter.length > 0) empQuery = empQuery.in('approval_level', levelFilter)
    if (q) {
        const qLower = q.toLowerCase()
        empQuery = empQuery.or(
            `nickname.ilike.%${qLower}%,first_name_th.ilike.%${qLower}%,last_name_th.ilike.%${qLower}%,employee_code.ilike.%${qLower}%`,
        )
    }

    // Apply the quick-filter that requires a balance-table lookup BEFORE
    // paginating the employee list; otherwise the page-count math lies.
    if (quickFilter === 'adjusted' || quickFilter === 'used_high' || quickFilter === 'unused') {
        let balanceFilterQuery = supabaseAdmin
            .from('leave_balances')
            .select('employee_id, total_days, used_days, pending_days, is_manually_adjusted')
            .eq('year', year)
        if (leaveTypeFilter.length > 0) {
            balanceFilterQuery = balanceFilterQuery.in('leave_type_id', leaveTypeFilter)
        }
        const { data: bData } = await balanceFilterQuery
        const matched = new Set<string>()
        for (const b of (bData ?? []) as Array<Record<string, unknown>>) {
            const total = Number(b.total_days ?? 0)
            const used = Number(b.used_days ?? 0)
            const pending = Number(b.pending_days ?? 0)
            const consumed = used + pending
            if (quickFilter === 'adjusted' && b.is_manually_adjusted) matched.add(b.employee_id as string)
            else if (quickFilter === 'used_high' && total > 0 && consumed / total > 0.5) matched.add(b.employee_id as string)
            else if (quickFilter === 'unused' && total > 0 && used === 0) matched.add(b.employee_id as string)
        }
        const allow = Array.from(matched)
        if (allow.length === 0) {
            return (
                <BalancesView
                    year={year}
                    filters={{ department: departmentFilter, level: levelFilter.map(String), leave_type: leaveTypeFilter, q, quick: quickFilter }}
                    pagination={{ page, pageSize: BALANCES_PAGE_SIZE, total: 0, totalPages: 1 }}
                    employees={[]}
                    leaveTypes={[]}
                    balancesByEmployee={{}}
                    departments={[]}
                />
            )
        }
        empQuery = empQuery.in('id', allow)
    }

    const from = (page - 1) * BALANCES_PAGE_SIZE
    const to = from + BALANCES_PAGE_SIZE - 1
    empQuery = empQuery
        .order('department', { ascending: true, nullsFirst: false })
        .order('approval_level', { ascending: false, nullsFirst: false })
        .order('nickname', { ascending: true, nullsFirst: false })
        .range(from, to)

    const { data: empRows, count: empCount } = await empQuery
    const employees = (empRows ?? []) as Array<{
        id: string
        employee_code: string | null
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        department: string | null
        position: string | null
        photo_url: string | null
        approval_level: number | null
        work_location: string | null
    }>
    const totalEmployees = empCount ?? 0
    const totalPages = Math.max(1, Math.ceil(totalEmployees / BALANCES_PAGE_SIZE))

    const empIds = employees.map(e => e.id)

    // Pull balances + leave_types in parallel; also the full department
    // list for the filter dropdown.
    const [balancesRes, leaveTypesRes, deptsRes, adjustersRes] = await Promise.all([
        empIds.length
            ? supabaseAdmin
                .from('leave_balances')
                .select('id, employee_id, leave_type_id, total_days, used_days, pending_days, remaining_days, is_manually_adjusted, last_adjusted_by, last_adjusted_at, notes, year')
                .eq('year', year)
                .in('employee_id', empIds)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        supabaseAdmin
            .from('leave_types')
            .select('id, name_th, color, icon, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true, nullsFirst: false }),
        supabaseAdmin
            .from('employees')
            .select('department')
            .eq('status', 'active')
            .not('department', 'is', null),
        // Adjuster name cache — every balance row that was touched by HR
        // keeps the adjuster's employees.id so we need to look up names.
        empIds.length
            ? supabaseAdmin
                .from('leave_balances')
                .select('last_adjusted_by')
                .eq('year', year)
                .in('employee_id', empIds)
                .not('last_adjusted_by', 'is', null)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ])

    const balances = (balancesRes.data ?? []) as Array<{
        id: string
        employee_id: string
        leave_type_id: string
        total_days: number
        used_days: number
        pending_days: number
        remaining_days: number | null
        is_manually_adjusted: boolean | null
        last_adjusted_by: string | null
        last_adjusted_at: string | null
        notes: string | null
    }>
    const leaveTypes = (leaveTypesRes.data ?? []) as Array<{
        id: string
        name_th: string
        color: string | null
        icon: string | null
        display_order: number | null
    }>
    const departments = Array.from(
        new Set(((deptsRes.data ?? []) as Array<{ department: string | null }>)
            .map(r => r.department)
            .filter((d): d is string => Boolean(d))),
    ).sort()

    const adjusterIds = Array.from(new Set(
        (adjustersRes.data ?? [])
            .map(r => (r as { last_adjusted_by: string | null }).last_adjusted_by)
            .filter((v): v is string => Boolean(v)),
    ))
    const adjustersMap: Record<string, string> = {}
    if (adjusterIds.length > 0) {
        const { data: adjList } = await supabaseAdmin
            .from('employees')
            .select('id, nickname, first_name_th, last_name_th')
            .in('id', adjusterIds)
        for (const a of (adjList ?? []) as Array<{ id: string; nickname: string | null; first_name_th: string | null; last_name_th: string | null }>) {
            const full = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
            adjustersMap[a.id] = a.nickname ? `${full} (${a.nickname})` : full || a.id
        }
    }

    // Group balances by employee_id → { leave_type_id: balance }
    const balancesByEmployee: Record<string, Record<string, typeof balances[number] & { last_adjusted_by_name: string | null }>> = {}
    for (const b of balances) {
        if (!balancesByEmployee[b.employee_id]) balancesByEmployee[b.employee_id] = {}
        balancesByEmployee[b.employee_id][b.leave_type_id] = {
            ...b,
            last_adjusted_by_name: b.last_adjusted_by ? adjustersMap[b.last_adjusted_by] ?? null : null,
        }
    }

    return (
        <BalancesView
            year={year}
            filters={{
                department: departmentFilter,
                level: levelFilter.map(String),
                leave_type: leaveTypeFilter,
                q,
                quick: quickFilter,
            }}
            pagination={{
                page,
                pageSize: BALANCES_PAGE_SIZE,
                total: totalEmployees,
                totalPages,
            }}
            employees={employees}
            leaveTypes={leaveTypes}
            balancesByEmployee={balancesByEmployee}
            departments={departments}
        />
    )
}

// ─── Tab 4: Calendar ──────────────────────────────────────────────────────

function parseMonthParam(raw: string | undefined, fallbackYear: number): { year: number; month: number } {
    // Accept "YYYY-MM"; fall back to current month of the requested year (or
    // the calendar year when ?year= drives navigation).
    if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
        const [y, m] = raw.split('-').map(Number)
        return { year: y, month: m }
    }
    const now = new Date()
    const useNowMonth = fallbackYear === now.getFullYear()
    return {
        year: fallbackYear,
        month: useNowMonth ? now.getMonth() + 1 : 1,
    }
}

async function renderCalendarTab(sp: SearchParams, requestedYear: number) {
    const { year, month } = parseMonthParam(sp.month, requestedYear)

    // Month-bound dates: first → last of `month` (inclusive). Pad ±1 day to
    // capture leaves that crossed the boundary in either direction; the
    // grid only shows cells in this month so cross-month spans clip cleanly.
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const departmentFilter = parseCsv(sp.department)
    const leaveTypeFilter = parseCsv(sp.leave_type)
    // Status filter default per spec: ['approved','pending']. Explicit empty
    // (`?status=`) is preserved as empty so power users can opt out.
    const statusFilter = sp.status === undefined
        ? ['approved', 'pending']
        : parseCsv(sp.status)

    // Fetch in parallel: leave requests overlapping the month (any leg of the
    // span touches it), employees (full active list for filter dropdowns +
    // joins), leave_types, and the holidays table (best-effort: silently
    // empty if the table is missing on this DB).
    const [requestsRes, employeesRes, leaveTypesRes, holidaysRes] = await Promise.all([
        (async () => {
            // overlap: end_date >= monthStart AND start_date <= monthEnd
            let q = supabaseAdmin
                .from('leave_requests')
                .select('id, reference_code, employee_id, leave_type_id, start_date, end_date, total_days, is_half_day, half_day_period, status')
                .gte('end_date', monthStart)
                .lte('start_date', monthEnd)
            if (statusFilter.length > 0) q = q.in('status', statusFilter)
            if (leaveTypeFilter.length > 0) q = q.in('leave_type_id', leaveTypeFilter)
            return q
        })(),
        supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, department, photo_url')
            .eq('status', 'active'),
        supabaseAdmin
            .from('leave_types')
            .select('id, name_th, color, icon, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true, nullsFirst: false }),
        supabaseAdmin
            .from('holidays')
            .select('date, name')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .then(
                r => r,
                () => ({ data: [] as Array<{ date: string; name: string }>, error: null }),
            ),
    ])

    const requests = (requestsRes.data ?? []) as Array<{
        id: string
        reference_code: string | null
        employee_id: string
        leave_type_id: string
        start_date: string
        end_date: string
        is_half_day: boolean | null
        half_day_period: string | null
        status: string
    }>
    const employees = (employeesRes.data ?? []) as Array<{
        id: string
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        department: string | null
        photo_url: string | null
    }>
    const leaveTypes = (leaveTypesRes.data ?? []) as RawLeaveType[]
    const holidays = (holidaysRes.data ?? []) as CalendarHoliday[]

    const empMap = new Map(employees.map(e => [e.id, e]))
    const typeMap = new Map(leaveTypes.map(t => [t.id, t]))

    // Department filter is applied AFTER the request fetch so we can still
    // see other rows when toggling departments. The spec calls for chip
    // filtering, so this is cheap (≤ a few hundred requests/month).
    const filteredRequests = departmentFilter.length === 0
        ? requests
        : requests.filter(r => {
            const emp = empMap.get(r.employee_id)
            return emp && emp.department && departmentFilter.includes(emp.department)
        })

    // Expand each request into its individual dates within this month.
    const eventsByDate: Record<string, CalendarEvent[]> = {}
    for (const r of filteredRequests) {
        const emp = empMap.get(r.employee_id)
        const t = typeMap.get(r.leave_type_id)
        const start = new Date(r.start_date)
        const end = new Date(r.end_date)
        // Walk day-by-day from start to end. Clamp to the visible month so we
        // don't waste cells on cross-month spans we won't render.
        const cursor = new Date(start)
        while (cursor <= end) {
            const cYear = cursor.getFullYear()
            const cMonth = cursor.getMonth() + 1
            if (cYear === year && cMonth === month) {
                const key = `${cYear}-${String(cMonth).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
                if (!eventsByDate[key]) eventsByDate[key] = []
                eventsByDate[key].push({
                    request_id: r.id,
                    reference_code: r.reference_code,
                    status: r.status,
                    is_half_day: Boolean(r.is_half_day),
                    half_day_period: r.half_day_period,
                    start_date: r.start_date,
                    end_date: r.end_date,
                    employee_id: r.employee_id,
                    employee_first_name: emp?.first_name_th ?? null,
                    employee_last_name: emp?.last_name_th ?? null,
                    employee_nickname: emp?.nickname ?? null,
                    employee_department: emp?.department ?? null,
                    employee_photo_url: emp?.photo_url ?? null,
                    leave_type_id: r.leave_type_id,
                    leave_type_name: t?.name_th ?? 'ไม่ทราบ',
                    leave_type_color: t?.color ?? null,
                })
            }
            cursor.setDate(cursor.getDate() + 1)
        }
    }

    // Sort each day by status (approved first, then pending), then by name
    // for stability across renders.
    for (const arr of Object.values(eventsByDate)) {
        arr.sort((a, b) => {
            if (a.status !== b.status) {
                if (a.status === 'approved') return -1
                if (b.status === 'approved') return 1
            }
            return (a.employee_nickname ?? '').localeCompare(b.employee_nickname ?? '')
        })
    }

    const departments = Array.from(
        new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d))),
    ).sort()

    return (
        <CalendarView
            year={year}
            month={month}
            eventsByDate={eventsByDate}
            leaveTypes={leaveTypes}
            departments={departments}
            holidays={holidays}
            filters={{
                department: departmentFilter,
                leave_type: leaveTypeFilter,
                status: sp.status === undefined ? [] : statusFilter,
            }}
        />
    )
}
