import { NextRequest, NextResponse } from 'next/server'
import { GET as autoCheckout } from './auto-checkout/route'
import { GET as leaveReminders } from './leave-reminders/route'
import { GET as wfhCheckinNudge } from './wfh-checkin-nudge/route'
import { GET as monitorSync } from './monitor-sync/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for multiple tasks

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    // Auth Validation (Bearer token or key in search query)
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const utcHour = now.getUTCHours()
    const utcMin = now.getUTCMinutes()

    console.log(`[cron-router] Executing at UTC ${utcHour}:${utcMin}`)
    const results: Record<string, any> = {}

    // 1. Sync Monitor (Always runs every 30 minutes)
    try {
        const res = await monitorSync(req)
        results.monitorSync = await res.json().catch(() => null)
    } catch (e) {
        results.monitorSync = { error: String(e) }
        console.error('[cron-router] monitorSync error:', e)
    }

    // 2. Leave Reminders (Runs daily at 02:00 UTC / 09:00 Bangkok)
    // Checking window [0, 15] to account for any minor trigger latency
    if (utcHour === 2 && utcMin >= 0 && utcMin < 15) {
        try {
            console.log('[cron-router] Triggering leaveReminders...')
            const res = await leaveReminders(req)
            results.leaveReminders = await res.json().catch(() => null)
        } catch (e) {
            results.leaveReminders = { error: String(e) }
            console.error('[cron-router] leaveReminders error:', e)
        }
    }

    // 3. WFH Checkin Nudge (Runs daily at 03:00 UTC / 10:00 Bangkok)
    // Checking window [0, 15]
    if (utcHour === 3 && utcMin >= 0 && utcMin < 15) {
        try {
            console.log('[cron-router] Triggering wfhCheckinNudge...')
            const res = await wfhCheckinNudge(req)
            results.wfhCheckinNudge = await res.json().catch(() => null)
        } catch (e) {
            results.wfhCheckinNudge = { error: String(e) }
            console.error('[cron-router] wfhCheckinNudge error:', e)
        }
    }

    // 4. Auto Checkout (Runs daily at 11:30 UTC / 18:30 Bangkok)
    // Checking window [25, 40]
    if (utcHour === 11 && utcMin >= 25 && utcMin < 40) {
        try {
            console.log('[cron-router] Triggering autoCheckout...')
            const res = await autoCheckout(req)
            results.autoCheckout = await res.json().catch(() => null)
        } catch (e) {
            results.autoCheckout = { error: String(e) }
            console.error('[cron-router] autoCheckout error:', e)
        }
    }

    return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        results
    })
}
