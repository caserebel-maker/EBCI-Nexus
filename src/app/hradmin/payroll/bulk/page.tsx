import { redirect } from 'next/navigation'
import { getAuth, canManagePayroll } from '@/lib/route-auth'
import { BulkUploadView } from './bulk-upload-view'

export const dynamic = 'force-dynamic'

/**
 * /hradmin/payroll/bulk
 *
 * Server-side gate: only users with the can_manage_payroll flag can
 * even render this page. Anyone else is bounced to /hradmin (where
 * they can do their normal work) — we don't want non-payroll HR
 * staff (มด in particular) to see the bulk-upload UI at all.
 */
export default async function PayrollBulkUploadPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canManagePayroll(auth)) redirect('/hradmin')

    return <BulkUploadView />
}
