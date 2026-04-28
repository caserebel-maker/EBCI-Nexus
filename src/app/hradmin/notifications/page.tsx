import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { NotificationsClient } from '@/app/portal/notifications/notifications-client'

export const dynamic = 'force-dynamic'

/**
 * HR-Admin variant of the notifications history page.
 *
 * Reuses the exact same client component as `/portal/notifications`
 * — same data fetch, same filters, same pagination — but lives under
 * the /hradmin layout so an HR Admin clicking "ดูทั้งหมด" from the
 * topbar bell stays in admin mode instead of getting flipped into
 * the employee shell. Without this mirror, the only full-history
 * route was /portal/* which forces the shell into preview mode.
 *
 * Permission gate matches /hradmin/* — any HR staff can land here.
 * Mods, payroll managers, and super-admins all see their own
 * personal notifications regardless of role.
 */
export default async function HradminNotificationsPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/notifications')

    return <NotificationsClient />
}
