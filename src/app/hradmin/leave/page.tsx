import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { OverviewView } from './overview-view'

export const dynamic = 'force-dynamic'

interface SearchParams {
    year?: string
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
}

interface RawEmployee {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    photo_url: string | null
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
 * HR Leave Management — Overview dashboard (Tab 1 of 4).
 *
 * HR-admin only. Pulls all leave_requests for the selected year +
 * the prior year (for the YoY delta on card 1), joins employees +
 * leave_types client-side in one round-trip.
 *
 * The "Year Selector" uses query string (?year=2026) so bookmarks +
 * back-nav work naturally. Default is the current Gregorian year.
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
    const nowYear = new Date().getFullYear()
    const requested = parseInt(sp.year ?? '', 10)
    const year = Number.isFinite(requested) && requested >= 2020 && requested <= 2100
        ? requested
        : nowYear
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

    const curRequests: RawLeaveRequest[] = (curRequestsRes.data ?? []) as RawLeaveRequest[]
    const prevYearCount = prevRequestsCountRes.count ?? 0
    const employees: RawEmployee[] = (employeesRes.data ?? []) as RawEmployee[]
    const leaveTypes: RawLeaveType[] = (leaveTypesRes.data ?? []) as RawLeaveType[]
    const balances: RawBalance[] = (balancesRes.data ?? []) as RawBalance[]

    // Derived aggregates — computed server-side so the client renders
    // instantly. The client still has the raw arrays for chart re-runs.
    const total = curRequests.length
    const pending = curRequests.filter(r => r.status === 'pending').length
    const approved = curRequests.filter(r => r.status === 'approved').length
    const rejected = curRequests.filter(r => r.status === 'rejected').length
    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0
    const yoyDelta = prevYearCount > 0
        ? Math.round(((total - prevYearCount) / prevYearCount) * 100)
        : null // null = "no prior-year data to compare"

    // Utilization rate — average of (used / total) across all balance rows
    // that have a non-zero total (exclude unlimited types with total=0).
    const utilizationSamples = balances.filter(b => Number(b.total_days) > 0)
    const utilizationRate = utilizationSamples.length > 0
        ? Math.round(
            utilizationSamples.reduce((sum, b) => {
                const used = Number(b.used_days) + Number(b.pending_days)
                const total = Number(b.total_days)
                return sum + (used / total)
            }, 0) / utilizationSamples.length * 100,
        )
        : 0

    // Average vacation-days-used per employee across the annual type.
    // The annual leave_type is resolved by name_th === 'พักร้อน' or the
    // canonical name_en 'annual'; fall back to display_order=1.
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

    // Monthly trend: [{ month: 1..12, [leave_type_id]: count, ... }]
    const monthly: Array<Record<string, number | string>> = []
    for (let m = 1; m <= 12; m++) {
        const row: Record<string, number | string> = { month: m }
        for (const t of leaveTypes) row[t.id] = 0
        monthly.push(row)
    }
    for (const r of curRequests) {
        if (r.status !== 'approved' && r.status !== 'pending') continue
        const m = new Date(r.start_date).getMonth() // 0..11
        const row = monthly[m]
        if (row && typeof row[r.leave_type_id] === 'number') {
            row[r.leave_type_id] = (row[r.leave_type_id] as number) + 1
        }
    }

    // Pie: approved-only distribution by leave_type_id
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

    // Department bars: sum total_days per department on approved requests
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

    // Recent activity: 10 latest requests (any status), joined with employee + type
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
                total,
                pending,
                approved,
                rejected,
                approvedPct,
                pendingPct,
                yoyDelta,
                utilizationRate,
                avgAnnualUsed,
            }}
            monthly={monthly}
            pie={pie}
            departments={departments}
            recent={recent}
            leaveTypes={leaveTypes}
        />
    )
}
