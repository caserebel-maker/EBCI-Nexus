import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CheckinView } from './checkin-view'
import { getTodayCheckin } from './actions'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    // Get office location
    const { data: location } = await supabaseAdmin
        .from('check_in_locations')
        .select('name, latitude, longitude, radius_meters')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    const todayCheckin = await getTodayCheckin()

    return (
        <CheckinView
            office={location ?? null}
            todayCheckin={todayCheckin}
        />
    )
}
