import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchWhoIsOutToday } from '@/lib/who-is-out'

export const dynamic = 'force-dynamic'

/**
 * GET /api/team/who-is-out
 *
 * Returns every employee out of the office today (BKK), with status
 * type + half-day flag + (when applicable) WFH contact / field
 * destination.
 *
 * Auth: any signed-in employee. Privacy preserved at the lib layer
 * (see who-is-out.ts) — no leave reasons, attachments, or medical
 * details flow through.
 */
export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const entries = await fetchWhoIsOutToday()
    return NextResponse.json({
        entries,
        total: entries.length,
        computed_at: new Date().toISOString(),
    })
}
