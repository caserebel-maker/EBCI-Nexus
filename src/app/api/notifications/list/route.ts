import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/list
 * Query: limit=20 · offset=0 · unread_only=false
 *
 * Returns the signed-in user's notifications, newest first, plus the
 * current unread count for the badge.
 */
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = await resolveSessionUserId(session)
    if (!userId) return NextResponse.json({ items: [], unread_count: 0, total: 0 })

    const { searchParams } = new URL(req.url)
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') ?? 20)))
    const offset = Math.max(0, Number(searchParams.get('offset') ?? 0))
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const nowIso = new Date().toISOString()

    // Base query builder — expired rows excluded so the list never shows
    // transient notifications whose time has passed.
    let query = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('recipient_user_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    if (unreadOnly) query = query.eq('is_read', false)

    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
        console.error('[notifications/list] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Separate unread count — always return the full unread total, not
    // just the count within the current filter.
    const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)
        .eq('is_read', false)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    return NextResponse.json({
        items: data ?? [],
        unread_count: unreadCount ?? 0,
        total: count ?? 0,
    })
}
