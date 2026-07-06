import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
    const session = await getSession()
    if (!session || !session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const employeeId = session.employeeId
        const now = new Date()

        // Throttled update: only update DB if last_active_at was > 45 seconds ago
        // to prevent database write spam on page transitions/rapid clicks.
        const { data: emp } = await supabaseAdmin
            .from('employees')
            .select('last_active_at')
            .eq('id', employeeId)
            .single()

        if (emp) {
            const lastActive = emp.last_active_at ? new Date(emp.last_active_at) : null
            if (!lastActive || (now.getTime() - lastActive.getTime() > 45 * 1000)) {
                await supabaseAdmin
                    .from('employees')
                    .update({ last_active_at: now.toISOString() })
                    .eq('id', employeeId)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[heartbeat] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
