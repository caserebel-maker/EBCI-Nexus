import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || !session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const employeeId = session.employeeId
        const now = new Date()

        const body = await req.json().catch(() => null)
        const path = typeof body?.path === 'string' ? body.path : null

        // Throttled update: only update DB if last_active_at was > 15 seconds ago
        // or if the current active path has changed.
        const { data: emp } = await supabaseAdmin
            .from('employees')
            .select('last_active_at, last_active_path')
            .eq('id', employeeId)
            .single()

        if (emp) {
            const lastActive = emp.last_active_at ? new Date(emp.last_active_at) : null
            const hasPathChanged = emp.last_active_path !== path

            if (!lastActive || hasPathChanged || (now.getTime() - lastActive.getTime() > 15 * 1000)) {
                await supabaseAdmin
                    .from('employees')
                    .update({ 
                        last_active_at: now.toISOString(),
                        last_active_path: path
                    })
                    .eq('id', employeeId)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[heartbeat] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
