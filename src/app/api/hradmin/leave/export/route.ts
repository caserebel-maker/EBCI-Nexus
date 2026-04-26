import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hradmin/leave/export
 *
 * Exports the CURRENT filtered view (respecting the same querystring
 * as /hradmin/leave?tab=requests) as a UTF-8 CSV with BOM so Excel
 * opens the Thai text correctly.
 *
 * Supported params (all optional):
 *   from, to, status, leave_type, department, q
 *
 * No pagination — writes every matching row.
 */
export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return new Response('Unauthorized', { status: 401 })
    if (!isHrStaff(auth)) return new Response('Forbidden', { status: 403 })

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const statusFilter = parseCsv(url.searchParams.get('status'))
    const leaveTypeFilter = parseCsv(url.searchParams.get('leave_type'))
    const departmentFilter = parseCsv(url.searchParams.get('department'))
    const q = (url.searchParams.get('q') ?? '').trim()

    // Narrow employee pool the same way page.tsx does, so CSV matches UI.
    let employeeIdPool: string[] | null = null
    if (q) {
        const qLower = q.toLowerCase()
        const { data: matches } = await supabaseAdmin
            .from('employees')
            .select('id')
            .or(`nickname.ilike.%${qLower}%,first_name_th.ilike.%${qLower}%,last_name_th.ilike.%${qLower}%,employee_code.ilike.%${qLower}%`)
            .limit(5000)
        employeeIdPool = (matches ?? []).map(m => m.id as string)
    }
    if (departmentFilter.length > 0) {
        const { data: deptEmps } = await supabaseAdmin
            .from('employees')
            .select('id')
            .in('department', departmentFilter)
        const deptIds = (deptEmps ?? []).map(e => e.id as string)
        employeeIdPool = employeeIdPool
            ? employeeIdPool.filter(id => deptIds.includes(id))
            : deptIds
    }
    if (employeeIdPool && employeeIdPool.length === 0) {
        return csvResponse(headerRow(), filenameStamp())
    }

    let query = supabaseAdmin
        .from('leave_requests')
        .select(
            `id, employee_id, leave_type_id, start_date, end_date, total_days,
             reason, status, submitted_at, created_at, reference_code,
             approver_id, approved_at, approval_notes, rejection_reason`,
        )
    if (from) query = query.gte('start_date', from)
    if (to) query = query.lte('start_date', to)
    if (statusFilter.length > 0) query = query.in('status', statusFilter)
    if (leaveTypeFilter.length > 0) query = query.in('leave_type_id', leaveTypeFilter)
    if (employeeIdPool) query = query.in('employee_id', employeeIdPool)
    query = query.order('created_at', { ascending: false }).limit(10_000)

    const { data: rows, error } = await query
    if (error) {
        console.error('[hradmin/leave/export] query error:', error)
        return new Response('Query failed', { status: 500 })
    }
    const requests = rows ?? []

    const empIds = Array.from(new Set(requests.map(r => r.employee_id as string)))
    const approverIds = Array.from(new Set(
        requests.map(r => r.approver_id as string | null).filter((x): x is string => Boolean(x)),
    ))
    const allIds = Array.from(new Set([...empIds, ...approverIds]))

    const [empsRes, typesRes] = await Promise.all([
        allIds.length
            ? supabaseAdmin.from('employees')
                .select('id, first_name_th, last_name_th, nickname, department, employee_code')
                .in('id', allIds)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        supabaseAdmin.from('leave_types').select('id, name_th'),
    ])
    const empMap = new Map((empsRes.data ?? []).map(e => [e.id as string, e]))
    const typeMap = new Map((typesRes.data ?? []).map(t => [t.id as string, t as { name_th: string }]))

    const lines = [headerRow()]
    for (const r of requests) {
        const emp = empMap.get(r.employee_id as string)
        const approver = r.approver_id ? empMap.get(r.approver_id as string) : null
        const type = typeMap.get(r.leave_type_id as string)
        const employeeName = emp
            ? `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
              + (emp.nickname ? ` (${emp.nickname})` : '')
            : ''
        const approverName = approver
            ? `${approver.first_name_th ?? ''} ${approver.last_name_th ?? ''}`.trim()
            : ''
        lines.push(csvRow([
            r.reference_code ?? '',
            employeeName,
            (emp?.department as string | null) ?? '',
            type?.name_th ?? String(r.leave_type_id),
            r.start_date as string,
            r.end_date as string,
            String(Number(r.total_days ?? 0)),
            r.status as string,
            r.submitted_at as string | null ?? r.created_at as string,
            approverName,
            (r.approval_notes as string | null) ?? '',
            (r.rejection_reason as string | null) ?? '',
        ]))
    }

    return csvResponse(lines.join('\n'), filenameStamp())
}

function parseCsv(raw: string | null): string[] {
    if (!raw) return []
    return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function headerRow(): string {
    return csvRow([
        'Reference', 'Employee', 'Department', 'Leave Type',
        'Start Date', 'End Date', 'Total Days', 'Status',
        'Submitted At', 'Approver', 'Approval Notes', 'Rejection Reason',
    ])
}

function csvRow(cells: string[]): string {
    return cells.map(escapeCell).join(',')
}

function escapeCell(v: string): string {
    // Quote every cell to handle commas + newlines + Thai characters safely.
    // Embedded quotes are doubled per RFC 4180.
    const s = (v ?? '').toString()
    return `"${s.replace(/"/g, '""')}"`
}

function filenameStamp(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function csvResponse(body: string, stamp: string): Response {
    // UTF-8 BOM first → Excel on Thai/Windows displays Unicode correctly.
    const BOM = '\uFEFF'
    return new Response(BOM + body, {
        status: 200,
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="leave-requests-${stamp}.csv"`,
        },
    })
}
