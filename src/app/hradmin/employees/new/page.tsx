import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { NewEmployeeForm } from './new-employee-form'
import { DEPARTMENTS } from '@/config/departments'

export const dynamic = 'force-dynamic'

export default async function NewEmployeePage() {
    // Guard: hr_admin only
    const session = await getSession()
    if (session?.role !== 'hr_admin') redirect('/hradmin/employees')

    // Fetch distinct departments
    const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('department, first_name_th, last_name_th, id')
        .eq('status', 'active')
        .order('first_name_th', { ascending: true })

    const supervisors = (empData ?? []).map((e: any) => ({
        id: e.id,
        name: `${e.first_name_th} ${e.last_name_th}`,
    }))

    return (
        <div className="space-y-6">
            <NewEmployeeForm departments={[...DEPARTMENTS]} supervisors={supervisors} />
        </div>
    )
}
