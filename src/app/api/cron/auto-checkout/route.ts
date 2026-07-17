import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // some headroom for fan-out

/**
 * GET /api/cron/auto-checkout
 *
 * Daily cron (vercel.json: 11:30 UTC = 18:30 BKK) that closes
 * `checkins` rows the employee left open by force-setting
 * `checked_out_at = checked_in_at + 9h` and stamping `auto_closed_at`.
 *
 * Why 9h, not "now"? Setting checked_out_at = now() at 18:30 would
 * over-credit work time for someone who left at 17:00 but forgot to
 * tap. 9 hours from check-in is the company's standard workday
 * (08:00→17:00 with an hour lunch), so the auto-close lands on a
 * defensible time that HR can override if the employee proves they
 * stayed later. The `auto_closed_at` field is the breadcrumb that
 * tells HR "this was a system-imposed close, not a real punch".
 *
 * Why > 12h since check-in (not just "checked_out_at IS NULL")?
 * Mid-shift runs would close someone who's still actively working a
 * long day. 12h is well past any honest workday — anyone still
 * "checked in" 12h after their punch is by definition forgot to
 * close.
 *
 * Auth: same Bearer CRON_SECRET pattern as /api/cron/leave-reminders.
 *
 * Mod's 4 May audit Scenario 2 / 4: "ลืมแตะบัตรออก" + "WFH ลืม
 * check-out" → session เปิดถาวร, no auto-close, timesheet skewed.
 * This cron is the safety net.
 */

const STALE_HOURS = 12
const ASSUMED_WORKDAY_MS = 9 * 60 * 60 * 1000

interface OpenCheckin {
    id: string
    employee_id: string
    type: string
    checked_in_at: string
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const staleBeforeIso = new Date(now.getTime() - STALE_HOURS * 60 * 60 * 1000).toISOString()

    const { data: openRows, error } = await supabaseAdmin
        .from('checkins')
        .select('id, employee_id, type, checked_in_at')
        .is('checked_out_at', null)
        .lt('checked_in_at', staleBeforeIso)
        .limit(500)

    if (error) {
        console.error('[cron/auto-checkout] query error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (openRows ?? []) as OpenCheckin[]
    const summary = { scanned: rows.length, closed: 0, errors: 0 }

    for (const row of rows) {
        try {
            const checkInMs = new Date(row.checked_in_at).getTime()
            const computedCheckoutIso = new Date(checkInMs + ASSUMED_WORKDAY_MS).toISOString()

            const { error: updErr } = await supabaseAdmin
                .from('checkins')
                .update({
                    checked_out_at: computedCheckoutIso,
                    auto_closed_at: now.toISOString(),
                })
                .eq('id', row.id)
            if (updErr) {
                summary.errors++
                console.error('[cron/auto-checkout] update failed:', row.id, updErr)
                continue
            }

            // Auto-close any unreturned field trips associated with this checkin
            const { error: tripErr } = await supabaseAdmin
                .from('field_trips')
                .update({
                    returned_at: computedCheckoutIso,
                    auto_closed_at: now.toISOString(),
                })
                .eq('checkin_id', row.id)
                .is('returned_at', null)
            if (tripErr) {
                console.error('[cron/auto-checkout] field trips auto-close failed for checkin:', row.id, tripErr)
            }

            summary.closed++

            // Best-effort 🔔 — don't block the next row if this fails.
            await notifyEmployee(row.employee_id, row.id, row.type, row.checked_in_at, computedCheckoutIso)
                .catch(err => console.error('[cron/auto-checkout] notify failed:', row.id, err))
        } catch (err) {
            summary.errors++
            console.error('[cron/auto-checkout] row failed:', row.id, err)
        }
    }

    return NextResponse.json({ success: true, summary })
}

async function notifyEmployee(
    employeeId: string,
    checkinId: string,
    checkinType: string,
    checkedInAt: string,
    autoClosedToIso: string,
): Promise<void> {
    const userId = await getEmployeeUserId(employeeId)
    if (!userId) return

    // Format the displayed times in Bangkok wall-clock for the body.
    const inBkk = new Date(new Date(checkedInAt).getTime() + 7 * 60 * 60 * 1000)
    const outBkk = new Date(new Date(autoClosedToIso).getTime() + 7 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
        `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`

    const typeLabel = checkinType === 'wfh' ? 'WFH'
        : checkinType === 'field' ? 'ภาคสนาม'
        : 'ออฟฟิศ'

    await createNotification({
        recipient_user_id: userId,
        type: 'checkin_auto_closed',
        title: `ระบบปิดเช็คอิน${typeLabel}ให้แล้ว`,
        body: `เนื่องจากลืมเช็คเอาท์ — ระบบปิดให้ที่เวลา ${fmt(outBkk)} (เช็คอิน ${fmt(inBkk)} +9 ชม.) หากเวลาผิด แจ้ง HR เพื่อปรับ`,
        color: 'amber',
        icon: 'Clock',
        entity_type: 'checkin',
        entity_id: checkinId,
        action_url: '/portal/checkin',
    })
}
