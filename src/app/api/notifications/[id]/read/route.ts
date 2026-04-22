import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/[id]/read
 *
 * Marks a single notification as read. The `recipient_user_id` guard
 * prevents marking someone else's row (and keeps the endpoint idempotent
 * — a second call just no-ops).
 */
export async function POST(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = await resolveSessionUserId(session)
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('recipient_user_id', userId)

    if (error) {
        console.error('[notifications/read] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}
