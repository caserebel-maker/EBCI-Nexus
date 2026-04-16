import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NewEmployeeForm } from './new-employee-form'
import { DEPARTMENTS } from '@/config/departments'

export const dynamic = 'force-dynamic'

export default async function NewEmployeePage() {
    // Guard: hr_admin only
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let isHrAdmin = false
    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            isHrAdmin = session.role === 'hr_admin'
        } catch { /* ignore */ }
    }
    if (!isHrAdmin) redirect('/dashboard/employees')

    // Fetch distinct departments
    const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('department, first_name_th, last_name_th, id')
        .eq('status', 'active')
        .order('first_name_th', { ascending: true })

    // Merge DB departments with canonical list (dedup + sort)
    const dbDepts = (empData ?? []).map((e: any) => e.department as string).filter(Boolean)
    const departments = Array.from(new Set([...DEPARTMENTS, ...dbDepts]))
        .sort((a, b) => a.localeCompare(b, 'th'))

    const supervisors = (empData ?? []).map((e: any) => ({
        id: e.id,
        name: `${e.first_name_th} ${e.last_name_th}`,
    }))

    return (
        <div className="space-y-6">
            <NewEmployeeForm departments={departments} supervisors={supervisors} />
        </div>
    )
}
