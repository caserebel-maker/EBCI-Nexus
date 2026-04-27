import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PortalPayrollView, type PortalSlip } from './portal-payroll-view'

export const dynamic = 'force-dynamic'

/**
 * /portal/payroll
 *
 * Employee self-service: lists every active slip the signed-in
 * person has been issued, newest first. No payroll permission
 * needed — access is scoped to the signed-in employee's own
 * employee_id, so there's no way to see anyone else's slips.
 */
export default async function PortalPayrollPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employeeId = await resolveSessionEmployeeId(session)
    let slips: PortalSlip[] = []
    if (employeeId) {
        const { data } = await supabaseAdmin
            .from('salary_slips')
            .select('id, year, month, file_name, file_size, mime_type, uploaded_at, notes')
            .eq('employee_id', employeeId)
            .is('deleted_at', null)
            .order('year', { ascending: false })
            .order('month', { ascending: false })
        slips = (data ?? []) as PortalSlip[]
    }

    return <PortalPayrollView slips={slips} hasEmployeeRow={!!employeeId} />
}
