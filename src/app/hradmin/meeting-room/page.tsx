import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listAllBookingsForHr } from '@/app/portal/meeting-room/actions'
import { ROOM_NAME, BOOKING_HORIZON_DAYS } from '@/app/portal/meeting-room/constants'
import { MeetingRoomView } from '@/app/portal/meeting-room/meeting-room-view'

export const dynamic = 'force-dynamic'

// HR mirror of /portal/meeting-room. Lives at /hradmin/* so clicking it from
// the HR sidebar doesn't flip the shell into employee preview mode (same
// pattern as /hradmin/notifications). Reuses the portal view in audit mode:
// shows the full window (past + future, including cancelled rows) and hides
// the "my bookings" section that doesn't matter to HR.
export default async function HrMeetingRoomPage() {
    const cookieStore = await cookies()
    if (!cookieStore.get('nexus_session')?.value) redirect('/login')

    const session = await getSession()
    if (!session || session.role !== 'hr_admin') redirect('/portal/meeting-room')

    const all = await listAllBookingsForHr()

    return (
        <MeetingRoomView
            roomName={ROOM_NAME}
            horizonDays={BOOKING_HORIZON_DAYS}
            upcoming={all}
            mine={[]}
            currentEmployeeId={session.employeeId ?? null}
            isHrAdmin={true}
            hrAuditMode={true}
        />
    )
}
