import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hradmin/leave/balances/export
 *
 * Exports the current filtered Tab 3 view as UTF-8 CSV with BOM so
 * Excel renders Thai correctly. Query params match the page:
 *   year, department, level, leave_type, q, filter
 *
 * One row per (employee, leave_type) — 1 employee typically = 4 rows.
 */
export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return new Response('Unauthorized', { status: 401 })
    if (!isHrStaff(auth)) return new Response('Forbidden', { status: 403 })

    const url = new URL(req.url)
    const year = parseInt(url.searchParams.get('year') ?? '', 10) || new Date().getFullYear()
    const departmentFilter = parseCsv(url.searchParams.get('department'))
    const levelFilter = parseCsv(url.searchParams.get('level'))
        .map(n => parseInt(n, 10))
        .filter(Number.isFinite)
    const leaveTypeFilter = parseCsv(url.searchParams.get('leave_type'))
    const q = (url.searchParams.get('q') ?? '').trim()
    const quickFilter = (url.searchParams.get('filter') ?? '').trim()

    // Resolve employee pool matching filters
    let empQuery = supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, approval_level')
        .eq('status', 'active')
    if (departmentFilter.length > 0) empQuery = empQuery.in('department', departmentFilter)
    if (levelFilter.length > 0) empQuery = empQuery.in('approval_level', levelFilter)
    if (q) {
        const qLower = q.toLowerCase()
        empQuery = empQuery.or(
            `nickname.ilike.%${qLower}%,first_name_th.ilike.%${qLower}%,last_name_th.ilike.%${qLower}%,employee_code.ilike.%${qLower}%`,
        )
    }
    empQuery = empQuery
        .order('department', { ascending: true, nullsFirst: false })
        .order('nickname', { ascending: true, nullsFirst: false })
        .limit(5000)

    const { data: empRows, error: empErr } = await empQuery
    if (empErr) return new Response('Query failed', { status: 500 })
    const employees = empRows ?? []

    if (employees.length === 0) {
        return csvResponse(headerRow(), stamp(year))
    }

    const empIds = employees.map(e => e.id as string)

    let bQuery = supabaseAdmin
        .from('leave_balances')
        .select('employee_id, leave_type_id, total_days, used_days, pending_days, remaining_days, is_manually_adjusted, last_adjusted_by, last_adjusted_at, notes')
        .eq('year', year)
        .in('employee_id', empIds)
    if (leaveTypeFilter.length > 0) bQuery = bQuery.in('leave_type_id', leaveTypeFilter)

    const [bRes, typesRes] = await Promise.all([
        bQuery,
        supabaseAdmin.from('leave_types').select('id, name_th').eq('is_active', true),
    ])

    let balances = (bRes.data ?? []) as Array<Record<string, unknown>>
    // Apply quick filters (same logic as page.tsx so the CSV matches the UI)
    if (quickFilter === 'adjusted') {
        balances = balances.filter(b => Boolean(b.is_manually_adjusted))
    } else if (quickFilter === 'used_high') {
        balances = balances.filter(b => {
            const total = Number(b.total_days ?? 0)
            const used = Number(b.used_days ?? 0) + Number(b.pending_days ?? 0)
            return total > 0 && used / total > 0.5
        })
    } else if (quickFilter === 'unused') {
        balances = balances.filter(b => Number(b.total_days ?? 0) > 0 && Number(b.used_days ?? 0) === 0)
    }

    const typeMap = new Map(((typesRes.data ?? []) as Array<{ id: string; name_th: string }>).map(t => [t.id, t.name_th]))
    const empMap = new Map(employees.map(e => [e.id as string, e]))

    // Resolve adjuster names. `last_adjusted_by` references public."User".id
    // (auth UUID), so we look up employees by user_id rather than employees.id —
    // see balances/route.ts where the write side now stores session.id (= User.id)
    // to satisfy the FK.
    const adjusterUserIds = Array.from(new Set(
        balances.map(b => (b.last_adjusted_by as string | null)).filter((v): v is string => Boolean(v)),
    ))
    const adjusterMap = new Map<string, string>()
    if (adjusterUserIds.length > 0) {
        const { data: adj } = await supabaseAdmin
            .from('employees')
            .select('user_id, nickname, first_name_th, last_name_th')
            .in('user_id', adjusterUserIds)
        for (const a of (adj ?? []) as Array<{ user_id: string; nickname: string | null; first_name_th: string | null; last_name_th: string | null }>) {
            const full = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
            adjusterMap.set(a.user_id, a.nickname ? `${full} (${a.nickname})` : full || a.user_id)
        }
    }

    const lines = [headerRow()]
    for (const b of balances) {
        const emp = empMap.get(b.employee_id as string)
        if (!emp) continue
        const typeName = typeMap.get(b.leave_type_id as string) ?? String(b.leave_type_id)
        const total = Number(b.total_days ?? 0)
        const used = Number(b.used_days ?? 0)
        const pending = Number(b.pending_days ?? 0)
        const remaining = Math.max(0, total - used - pending)
        lines.push(csvRow([
            (emp.employee_code as string | null) ?? '',
            `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
                + (emp.nickname ? ` (${emp.nickname})` : ''),
            (emp.department as string | null) ?? '',
            emp.approval_level ? `L${emp.approval_level}` : '',
            String(year),
            typeName,
            String(total),
            String(used),
            String(pending),
            String(remaining),
            b.is_manually_adjusted ? 'TRUE' : 'FALSE',
            (b.last_adjusted_by as string | null) ? (adjusterMap.get(b.last_adjusted_by as string) ?? '') : '',
            (b.last_adjusted_at as string | null) ?? '',
            // Notes: replace newlines with " | " so the CSV cell is single-line.
            String(b.notes ?? '').replace(/\r?\n/g, ' | '),
        ]))
    }

    return csvResponse(lines.join('\n'), stamp(year))
}

// ─── helpers ───────────────────────────────────────────────────────────────

function parseCsv(raw: string | null): string[] {
    if (!raw) return []
    return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function headerRow(): string {
    return csvRow([
        'Employee Code', 'Name', 'Department', 'Level', 'Year',
        'Leave Type', 'Total', 'Used', 'Pending', 'Remaining',
        'Is Adjusted', 'Last Adjusted By', 'Last Adjusted At', 'Notes',
    ])
}

function csvRow(cells: string[]): string {
    return cells.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')
}

function stamp(year: number): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${year}-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function csvResponse(body: string, stampStr: string): Response {
    return new Response('\uFEFF' + body, {
        status: 200,
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="leave-balances-${stampStr}.csv"`,
        },
    })
}
