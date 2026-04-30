import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { getLeaveTodayInfo } from '@/lib/leave-today'
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

    // §1.3 — when an approved leave covers today, the page hides the
    // CTA and shows a "วันนี้ลา ..." card. Half-day leaves still allow
    // check-in (the other half is normal work) — getLeaveTodayInfo
    // sets blocksCheckin=false for those, so we still render the
    // standard flow with a banner.
    const employeeId = await resolveSessionEmployeeId(session)
    const leaveToday = employeeId ? await getLeaveTodayInfo(employeeId) : null

    return (
        <CheckinView
            office={location ?? null}
            todayCheckin={todayCheckin}
            leaveToday={leaveToday}
        />
    )
}
