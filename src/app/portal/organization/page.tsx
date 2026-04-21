import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Network } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { getCurrentPermissions } from '@/lib/permissions-server'
import { type OrgEmployee } from './view-department'
import { TabsShell } from './tabs-shell'

export const dynamic = 'force-dynamic'

export default async function OrganizationPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    const session = await getSession()

    let currentEmployeeId: string | null = session?.employeeId ?? null
    if (!currentEmployeeId && session?.name?.includes('@')) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('email', session.name)
            .maybeSingle()
        currentEmployeeId = data?.id ?? null
    }

    const permissions = await getCurrentPermissions()

    const { data: rows, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, position, department, secondary_department, photo_url, manager_id, approval_level, is_approver, approval_scopes, approval_limit_thb')
        .eq('status', 'active')
        .order('approval_level', { ascending: false, nullsFirst: false })
        .order('department', { ascending: true })
        .order('employee_code', { ascending: true })

    if (error) {
        console.error('Org chart fetch error:', error)
    }

    const canSeeLimit = permissions.can_view_approval_limits
    const employees: OrgEmployee[] = (rows ?? []).map(e => {
        const position = (e.position as string) ?? null
        const department = (e.department as string) ?? null
        return {
            id: e.id as string,
            employeeCode: e.employee_code as string,
            firstName: (e.first_name_th as string) ?? '',
            lastName: (e.last_name_th as string) ?? '',
            nickname: (e.nickname as string) ?? null,
            position,
            department,
            secondaryDepartment: (e.secondary_department as string) ?? null,
            photoUrl: (e.photo_url as string) ?? null,
            managerId: (e.manager_id as string) ?? null,
            approvalLevel: (e.approval_level as number) ?? null,
            isApprover: Boolean(e.is_approver),
            approvalScopes: (e.approval_scopes as string[] | null) ?? [],
            // Filter sensitive limit by permission (spec §8.2)
            approvalLimitThb: canSeeLimit ? ((e.approval_limit_thb as number | null) ?? null) : null,
            // Advisors = parallel group; detect by position/department text.
            isAdvisor: position === 'ที่ปรึกษา' || department === 'ที่ปรึกษา',
        }
    })

    return (
        <div className="pb-24 lg:pb-6 space-y-4 lg:space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Network className="h-6 w-6 text-white" />
                    ผังองค์กร
                </h1>
                <p className="text-white/80 text-sm">
                    โครงสร้าง · อำนาจอนุมัติ · สายอนุมัติของคุณ
                </p>
            </div>
            <TabsShell
                employees={employees}
                currentEmployeeId={currentEmployeeId}
                permissions={permissions}
            />
        </div>
    )
}
