import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { OverviewView } from './overview-view'
import { RequestsView } from './requests-view'
import { BalancesView } from './balances-view'

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
    // Tab 3 filter params
    level?: string       // comma-separated approval_level (1..5)
    filter?: string      // quick filter keyword: used_high | unused | adjusted
}

const PAGE_SIZE = 20
const BALANCES_PAGE_SIZE = 25

const ALLOWED_TABS = new Set<TabKey>(['overview', 'requests', 'balances', 'calendar'])
const IMPLEMENTED_TABS = new Set<TabKey>(['overview', 'requests', 'balances'])

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
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/hradmin/dashboard')

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
                .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, email')
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
    const leaveTypes = (leaveTypesRes.data ?? []) as RawLeaveType[]
    const departments = Array.from(
        new Set(((deptsRes.data ?? []) as Array<{ department: string | null }>)
            .map(e => e.department)
            .filter((d): d is string => Boolean(d))),
    ).sort()

    const items = requests.map(r => {
        const emp = empMap.get(r.employee_id)
        const approver = r.approver_id ? empMap.get(r.approver_id) : null
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
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, photo_url, approval_level', { count: 'exact' })
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
