import { NextRequest, NextResponse } from 'next/server'
import { GET as autoCheckout } from './auto-checkout/route'
import { GET as leaveReminders } from './leave-reminders/route'
import { GET as wfhCheckinNudge } from './wfh-checkin-nudge/route'
import { GET as monitorSync } from './monitor-sync/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for multiple tasks

async function runCronTask(name: string, req: NextRequest, handler: (req: NextRequest) => Promise<Response>) {
    try {
        console.log(`[cron-router] Triggering ${name}...`)
        const res = await handler(req)
        return await res.json().catch(() => ({ status: res.status }))
    } catch (e) {
        console.error(`[cron-router] ${name} error:`, e)
        return { error: String(e) }
    }
}

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
    console.log(`[cron-router] Executing Hobby-safe daily bundle at ${now.toISOString()}`)
    const results: Record<string, any> = {}

    // Vercel Hobby allows only one scheduled cron per day. Bundle the jobs so
    // critical notifications still work while staying inside the free-plan limit.
    results.monitorSync = await runCronTask('monitorSync', req, monitorSync)
    results.leaveReminders = await runCronTask('leaveReminders', req, leaveReminders)
    results.wfhCheckinNudge = await runCronTask('wfhCheckinNudge', req, wfhCheckinNudge)
    results.autoCheckout = await runCronTask('autoCheckout', req, autoCheckout)

    return NextResponse.json({
        success: true,
        mode: 'hobby_daily_bundle',
        timestamp: now.toISOString(),
        results
    })
}
