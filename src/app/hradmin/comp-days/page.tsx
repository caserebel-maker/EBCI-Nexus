import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CompDaysAdminView } from './comp-days-admin-view'

export const dynamic = 'force-dynamic'

export default async function HrCompDaysPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/dashboard')

    // Pre-load the active employee directory once so the grant form's
    // <select> doesn't need a separate fetch round-trip on mount.
    const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department')
        .eq('status', 'active')
        .order('department', { ascending: true, nullsFirst: false })
        .order('nickname', { ascending: true, nullsFirst: false })
        .limit(2000)

    return (
        <CompDaysAdminView
            employees={(emps ?? []).map(e => ({
                id: e.id as string,
                employee_code: (e.employee_code as string | null) ?? '',
                first_name_th: (e.first_name_th as string | null) ?? '',
                last_name_th: (e.last_name_th as string | null) ?? '',
                nickname: (e.nickname as string | null) ?? null,
                department: (e.department as string | null) ?? null,
            }))}
        />
    )
}
