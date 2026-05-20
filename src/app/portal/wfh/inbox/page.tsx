import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { listInboxForApprover } from '@/lib/wfh'
import type { WfhRequest } from '@/lib/wfh-shared'
import { WfhInboxView } from './inbox-view'

export const dynamic = 'force-dynamic'

interface SearchParams {
    ref?: string | string[]
}

export default async function WfhInboxPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const session = await getSession()
    if (!session) redirect('/login')
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) redirect('/portal/dashboard')

    const sp = await searchParams
    const requestedRef = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref
    const focusRef = requestedRef?.trim() || null

    const items = await listInboxForApprover(employeeId)

    // Resolve applicant names in one round-trip so the inbox doesn't
    // render "abcd-1234..." for everyone.
    const empIds = Array.from(new Set(items.map(i => i.employee_id)))
    const empMap = new Map<string, { name: string; nickname: string | null; department: string | null }>()
    if (empIds.length > 0) {
        const { data: emps } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, department')
            .in('id', empIds)
        for (const e of (emps ?? []) as Array<{ id: string; first_name_th: string | null; last_name_th: string | null; nickname: string | null; department: string | null }>) {
            empMap.set(e.id, {
                name: `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim(),
                nickname: e.nickname,
                department: e.department,
            })
        }
    }

    const enriched: Array<WfhRequest & { applicant_name: string; applicant_nickname: string | null; applicant_department: string | null }> = items.map(i => {
        const emp = empMap.get(i.employee_id)
        return {
            ...i,
            applicant_name: emp?.name ?? i.employee_id,
            applicant_nickname: emp?.nickname ?? null,
            applicant_department: emp?.department ?? null,
        }
    })
    if (focusRef) {
        enriched.sort((a, b) => {
            const aMatch = a.reference_code === focusRef ? 0 : 1
            const bMatch = b.reference_code === focusRef ? 0 : 1
            return aMatch - bMatch
        })
    }

    return <WfhInboxView items={enriched} focusRef={focusRef} />
}
