import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { BulkEmergencyView } from './bulk-emergency-view'

export const dynamic = 'force-dynamic'

/**
 * Bulk emergency-contact import page.
 *
 * HR-staff only. Renders a paste-CSV / paste-table form, calls the
 * preview API to dry-run the changes, then commits via the same API
 * with mode='apply'. Server here is a thin auth-gate shim — the
 * heavy lifting is done in the bulk API + the client component.
 */
export default async function BulkEmergencyContactPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')
    return <BulkEmergencyView />
}
