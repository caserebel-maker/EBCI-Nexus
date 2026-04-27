import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portal/payroll
 *
 * Returns the signed-in employee's own salary slips (newest first).
 * No can_manage_payroll check needed — this endpoint scopes to
 * `employee_id = my own row`, so a malicious employee can't read
 * anyone else's slips by hitting it.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        // Not linked to an employee row → no slips. Safe empty list.
        return NextResponse.json({ slips: [] })
    }

    const { data, error } = await supabaseAdmin
        .from('salary_slips')
        .select('id, year, month, file_name, file_size, mime_type, uploaded_at, notes')
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ slips: data ?? [] })
}
