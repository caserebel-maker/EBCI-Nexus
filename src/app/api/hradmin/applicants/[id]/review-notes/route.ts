import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/hradmin/applicants/[id]/review-notes
 *
 * Body: { notes: string }
 *
 * Replaces `job_applications.review_notes` with the supplied text.
 *
 * The status-change route appends to this same column (one entry per
 * transition). HR's free-form review notes own the column the rest of
 * the time — letting the textarea autosave without an audit-trail join.
 *
 * Audit lines from status changes are preserved by appending HR's
 * notes ABOVE any "---" separator the status route writes. We don't
 * try to merge — HR sees the full trail and edits in place.
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'เฉพาะ HR เท่านั้น' }, { status: 403 })
    }

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    // Cap at 8 KB so an accidental paste doesn't blow up the column.
    const raw = String(body?.notes ?? '')
    const notes = raw.length > 8000 ? raw.slice(0, 8000) : raw

    const actorId = await resolveSessionEmployeeId(auth.session)
    const nowIso = new Date().toISOString()

    const { error } = await supabaseAdmin
        .from('job_applications')
        .update({
            review_notes: notes || null,
            review_notes_updated_at: nowIso,
            review_notes_updated_by: actorId,
            updated_at: nowIso,
        })
        .eq('id', id)
    if (error) {
        // Fallback for older schemas without the timestamp/actor columns —
        // retry with just the text. Keeps the autosave working even on
        // databases that haven't picked up the new metadata fields.
        const fallback = await supabaseAdmin
            .from('job_applications')
            .update({ review_notes: notes || null, updated_at: nowIso })
            .eq('id', id)
        if (fallback.error) {
            console.error('[review-notes.patch] error:', fallback.error)
            return NextResponse.json({ error: fallback.error.message }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true, length: notes.length, saved_at: nowIso })
}
