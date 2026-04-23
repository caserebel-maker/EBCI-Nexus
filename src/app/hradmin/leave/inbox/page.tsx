import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { InboxView } from '@/app/portal/leave/inbox/inbox-view'

export const dynamic = 'force-dynamic'

/**
 * HR Admin variant of the approver inbox.
 *
 * The feature is identical to /portal/leave/inbox — same API, same
 * client component — but living at /hradmin/* means the app shell
 * keeps the hr_admin sidebar + branding while the user approves
 * leave. The /portal variant stays available for managers who are
 * approvers but not hr_admin.
 *
 * Non-admin users are bounced to the /portal variant so bookmarks
 * still resolve to a working page.
 */
export default async function HrAdminLeaveInboxPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/portal/leave/inbox')
    return <InboxView />
}
