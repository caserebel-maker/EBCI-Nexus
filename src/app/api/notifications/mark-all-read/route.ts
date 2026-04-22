import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/mark-all-read
 *
 * Flips all unread rows for the signed-in user via the
 * `mark_all_notifications_read(p_user_id)` RPC. Returns the number of
 * rows marked so the client can reconcile its optimistic count.
 */
export async function POST() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = await resolveSessionUserId(session)
    if (!userId) return NextResponse.json({ count: 0 })

    const { data, error } = await supabaseAdmin.rpc('mark_all_notifications_read', {
        p_user_id: userId,
    })
    if (error) {
        console.error('[notifications/mark-all-read] rpc error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const count = typeof data === 'number' ? data : Number(data ?? 0)
    return NextResponse.json({ count })
}
