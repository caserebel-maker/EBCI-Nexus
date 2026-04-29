import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { buildApprovalAudit } from './audit-data'
import { ApprovalAuditView } from './audit-view'

export const dynamic = 'force-dynamic'

// HR-only routing health page. Runs the same resolveLeaveApprover() logic
// the live submit route uses, but in-memory across every active employee
// — so HR can spot mis-routed staff before users hit "ส่งใบลา" and see
// the wrong inbox light up.
export default async function ApprovalAuditPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/portal')

    const rows = await buildApprovalAudit()

    return <ApprovalAuditView rows={rows} />
}
