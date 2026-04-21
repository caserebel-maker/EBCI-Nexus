import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOwnership } from '@/lib/careers-ownership'

const BUCKET = 'applicant-assets'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_KINDS = new Set([
    'photo', 'cv', 'transcript', 'id_card_copy', 'house_registration', 'other',
])
const ALLOWED_MIME = new Set([
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

/**
 * POST /api/careers/apply/[id]/upload
 * Content-Type: multipart/form-data
 * Fields: file, reference_code, kind
 *
 * kind ∈ { photo, cv, transcript, id_card_copy, house_registration, other }
 * Writes to applicant-assets/<kind>/<applicationId>/<filename>,
 * updates the matching column with a signed URL, and returns it.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params
    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

    const referenceCode = String(form.get('reference_code') ?? '').trim()
    const kind = String(form.get('kind') ?? '').trim()
    const file = form.get('file') as File | null

    const auth = await verifyOwnership(id, referenceCode)
    if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (auth.status !== 'draft') return NextResponse.json({ error: 'Application already submitted' }, { status: 409 })

    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
    if (!ALLOWED_KINDS.has(kind)) return NextResponse.json({ error: 'kind ไม่ถูกต้อง' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 10MB' }, { status: 413 })
    if (file.type && !ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: `ไฟล์ประเภทนี้ไม่รองรับ (${file.type})` }, { status: 415 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const safeBase = `${kind}-${Date.now()}`
    const path = `${kind}/${id}/${safeBase}.${ext}`

    const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined })
    if (upErr) {
        console.error('[careers/upload] storage error:', upErr)
        return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // Signed URL (7 days) — admin-side will refresh as needed
    const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7)
    const url = signed?.signedUrl ?? null

    // Update the right column for each kind (other_documents is jsonb append)
    const columnByKind: Record<string, string> = {
        photo: 'photo_url',
        cv: 'cv_url',
        transcript: 'transcript_url',
        id_card_copy: 'id_card_copy_url',
        house_registration: 'house_registration_url',
    }
    if (kind === 'other') {
        // Append to other_documents jsonb array
        const { data: existing } = await supabaseAdmin
            .from('job_applications')
            .select('other_documents')
            .eq('id', id)
            .single()
        const list = Array.isArray(existing?.other_documents) ? existing!.other_documents : []
        list.push({ name: file.name, path, url, kind: 'other', uploaded_at: new Date().toISOString() })
        await supabaseAdmin
            .from('job_applications')
            .update({ other_documents: list, last_saved_at: new Date().toISOString() })
            .eq('id', id)
    } else {
        const col = columnByKind[kind]
        if (col) {
            await supabaseAdmin
                .from('job_applications')
                .update({ [col]: url, last_saved_at: new Date().toISOString() })
                .eq('id', id)
        }
    }

    return NextResponse.json({ path, url, kind })
}
