import { redirect } from 'next/navigation'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'
import { BackupClient } from './backup-client'

export const dynamic = 'force-dynamic'

export default async function BackupSettingsPage() {
    // Same gate as /api/hradmin/backup/download — keep them aligned so
    // the page never shows up for someone who'd just hit a 403 on the
    // download.
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        redirect('/hradmin/dashboard')
    }

    return <BackupClient />
}
