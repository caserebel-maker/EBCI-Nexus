import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NotificationsClient } from './notifications-client'

export const dynamic = 'force-dynamic'

/**
 * Full notification history page.
 *
 * The page is a thin wrapper: all data fetching happens client-side
 * against `/api/notifications/list` so filter toggles + "load more"
 * pagination don't require router navigation. The server component
 * just gates on session.
 */
export default async function NotificationsPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    return <NotificationsClient />
}
