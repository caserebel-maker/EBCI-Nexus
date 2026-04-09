import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
    const date = req.nextUrl.searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id,
            leave_type,
            employees!employee_id (
                id,
                first_name_th,
                last_name_th,
                department,
                position,
                employee_code
            )
        `)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
}
