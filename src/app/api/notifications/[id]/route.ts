import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/notifications/[id]
 *
 * Hard-deletes a notification row. Scoped by recipient_user_id so
 * users can only remove their own.
 */
export async function DELETE(
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
        .delete()
        .eq('id', id)
        .eq('recipient_user_id', userId)

    if (error) {
        console.error('[notifications/delete] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}
