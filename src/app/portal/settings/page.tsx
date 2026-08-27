import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function PortalSettingsPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    return <SettingsClient />
}
