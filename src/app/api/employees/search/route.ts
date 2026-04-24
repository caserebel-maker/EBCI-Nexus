import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/employees/search?q=...&limit=10
 *
 * Lightweight typeahead for employee pickers. Session-gated (any
 * signed-in user) and never returns sensitive columns like email or
 * salary — just enough to render a picker row (name + code +
 * department).
 */
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') ?? 10)))
    if (q.length < 1) return NextResponse.json({ items: [] })

    const qLower = q.toLowerCase()
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, nickname, first_name_th, last_name_th, department, employee_code')
        .eq('status', 'active')
        .or(`nickname.ilike.%${qLower}%,first_name_th.ilike.%${qLower}%,last_name_th.ilike.%${qLower}%,employee_code.ilike.%${qLower}%`)
        .order('nickname', { ascending: true, nullsFirst: false })
        .limit(limit)
    if (error) {
        console.error('[employees/search] error:', error)
        return NextResponse.json({ error: error.message, items: [] }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] })
}
