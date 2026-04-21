import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

// GET /api/organization/overview
// Aggregated headcount by department — intentionally does not expose any
// individual employee. Visible to every role (L1–L5).
//
// Response:
//   {
//     executives: [{ id, nickname, first_name_th, position, level }],
//     departments: [{ name, count, top_level }],
//     advisors: { count: number, label: 'ที่ปรึกษา' },
//     total_employees: number
//   }
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows, error } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, nickname, position, department, approval_level')
        .eq('status', 'active')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type Row = {
        id: string
        first_name_th: string | null
        nickname: string | null
        position: string | null
        department: string | null
        approval_level: number | null
    }
    const data = (rows ?? []) as Row[]

    const isAdvisor = (r: Row) =>
        r.position === 'ที่ปรึกษา' || r.department === 'ที่ปรึกษา'

    const advisors = data.filter(isAdvisor)
    const staff = data.filter(r => !isAdvisor(r))

    // Executives (L4+) are highlighted individually at the top of the chart
    const executives = staff
        .filter(r => (r.approval_level ?? 0) >= 4)
        .sort((a, b) => (b.approval_level ?? 0) - (a.approval_level ?? 0))
        .map(r => ({
            id: r.id,
            first_name_th: r.first_name_th,
            nickname: r.nickname,
            position: r.position,
            level: r.approval_level,
        }))

    // Department rollups: count + highest level present in that department
    const byDept = new Map<string, { count: number; top_level: number }>()
    for (const r of staff) {
        // Skip executives here so department rollups read as "ฝ่าย/แผนกย่อย"
        if ((r.approval_level ?? 0) >= 4) continue
        const key = r.department ?? 'ไม่ระบุแผนก'
        const prev = byDept.get(key) ?? { count: 0, top_level: 0 }
        prev.count += 1
        prev.top_level = Math.max(prev.top_level, r.approval_level ?? 0)
        byDept.set(key, prev)
    }
    const departments = Array.from(byDept.entries())
        .map(([name, v]) => ({ name, count: v.count, top_level: v.top_level }))
        .sort((a, b) => {
            // higher top_level first, then by headcount, then by name
            if (a.top_level !== b.top_level) return b.top_level - a.top_level
            if (a.count !== b.count) return b.count - a.count
            return a.name.localeCompare(b.name, 'th')
        })

    return NextResponse.json({
        executives,
        departments,
        advisors: { count: advisors.length, label: 'ที่ปรึกษา' },
        total_employees: staff.length,
    })
}
