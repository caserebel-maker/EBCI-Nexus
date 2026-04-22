import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/unread-count
 *
 * Lightweight count used by the bell badge — polled every ~30 s by
 * the client. Intentionally does not fetch rows, only COUNT.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = await resolveSessionUserId(session)
    if (!userId) return NextResponse.json({ count: 0 })

    const nowIso = new Date().toISOString()
    const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)
        .eq('is_read', false)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    if (error) {
        console.error('[notifications/unread-count] error:', error)
        return NextResponse.json({ count: 0 })
    }
    return NextResponse.json({ count: count ?? 0 })
}
