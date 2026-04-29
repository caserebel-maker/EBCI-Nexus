import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { CheckinView } from './checkin-view'
import { getTodayCheckin } from './actions'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
    const session = await getSession()
    if (!session) redirect('/login')

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
