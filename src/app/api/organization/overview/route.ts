import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

// GET /api/organization/overview
// Aggregated headcount for Tab 1 "ภาพรวมองค์กร" — deliberately does not
// expose any individual name or photo. Visible to every role (L1–L5).
//
// Response:
//   {
//     president: { count: number },
//     md:        { count: number },
//     departments: [{ name, count }],   // sorted by count desc
//     advisors:  { count: number },
//     total:     number                 // total active staff (excl. advisors)
//   }
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows, error } = await supabaseAdmin
        .from('employees')
        .select('id, position, department, approval_level')
        .eq('status', 'active')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type Row = {
        id: string
        position: string | null
        department: string | null
        approval_level: number | null
    }
    const data = (rows ?? []) as Row[]

    const isAdvisor = (r: Row) =>
        r.position === 'ที่ปรึกษา' || r.department === 'ที่ปรึกษา'

    const advisors = data.filter(isAdvisor)
    const staff = data.filter(r => !isAdvisor(r))

    const presidentCount = staff.filter(r => (r.approval_level ?? 0) === 5).length
    const mdCount = staff.filter(r => (r.approval_level ?? 0) === 4).length

    // Departments rollup (excluding president/MD rows — they're shown at the top)
    const byDept = new Map<string, number>()
    for (const r of staff) {
        if ((r.approval_level ?? 0) >= 4) continue
        const key = r.department ?? 'ไม่ระบุแผนก'
        byDept.set(key, (byDept.get(key) ?? 0) + 1)
    }
    const departments = Array.from(byDept.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count
            return a.name.localeCompare(b.name, 'th')
        })

    return NextResponse.json({
        president: { count: presidentCount },
        md: { count: mdCount },
        departments,
        advisors: { count: advisors.length },
        total: staff.length,
    })
}
