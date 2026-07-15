import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { getLeaveTodayInfo } from '@/lib/leave-today'
import { getCardScanTodayInfo } from '@/lib/card-scan-today'
import { checkWfhEligibility } from '@/lib/wfh-eligibility'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { CheckinView } from './checkin-view'
import { getTodayCheckin, getTodayFieldTrip } from './actions'
import { isOutsideHeadOfficeEmployee } from '@/lib/outside-head-office'

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
    const activeFieldTrip = await getTodayFieldTrip()

    // §1.3 — when an approved leave covers today, the page hides the
    // CTA and shows a "วันนี้ลา ..." card. Half-day leaves still allow
    // check-in (the other half is normal work) — getLeaveTodayInfo
    // sets blocksCheckin=false for those, so we still render the
    // standard flow with a banner.
    //
    // §3.1 (Phase 1) — when a card scan exists today (HIP card reader
    // → CSV import), suppress the in-app CTA so the user doesn't double
    // check in.
    //
    // §3.1 (Layer 3) — gate the WFH check-in button on actual eligibility
    // (company-wide announcement, approved personal request, or a same-day
    // request still pending approval). Stops employees from self-checking-in
    // WFH at random while keeping emergency mornings workable.
    const employeeId = await resolveSessionEmployeeId(session)
    const [leaveToday, cardScanToday, wfhEligibility, employeeForCheckin] = employeeId
        ? await Promise.all([
            getLeaveTodayInfo(employeeId),
            getCardScanTodayInfo(employeeId),
            checkWfhEligibility(employeeId, bangkokTodayIso()),
            supabaseAdmin
                .from('employees')
                .select('employee_code, work_location')
                .eq('id', employeeId)
                .maybeSingle()
                .then(({ data }) => data),
        ])
        : [null, null, { allowed: false, source: null } as const, null]

    return (
        <CheckinView
            office={location ?? null}
            todayCheckin={todayCheckin}
            leaveToday={leaveToday}
            cardScanToday={cardScanToday}
            wfhEligibility={wfhEligibility}
            outsideHeadOfficeEligible={isOutsideHeadOfficeEmployee(employeeForCheckin)}
            activeFieldTrip={activeFieldTrip}
        />
    )
}
