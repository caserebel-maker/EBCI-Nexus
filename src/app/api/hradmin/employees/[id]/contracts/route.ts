import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'employee-contracts'
const MAX_BYTES = 20 * 1024 * 1024  // mirrors bucket config
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
])
const VALID_TYPES = new Set([
    'probation', 'permanent', 'amendment', 'renewal', 'termination',
])

/**
 * GET /api/hradmin/employees/[id]/contracts
 *
 * Returns the contract list for an employee (newest first), filtering
 * out soft-deleted rows. The `id` URL segment may be either the text
 * employee_code (used in profile URLs) or the row UUID — we resolve it
 * the same way the profile page does.
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }

    const employeeRowId = await resolveEmployeeId((await context.params).id)
    if (!employeeRowId) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })

    const { data, error } = await supabaseAdmin
        .from('employee_contracts')
        .select('id, contract_type, signed_date, effective_start, effective_end, file_path, file_name, file_size, mime_type, page_count, notes, uploaded_at, uploaded_by')
        .eq('employee_id', employeeRowId)
        .is('deleted_at', null)
        .order('signed_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ contracts: data ?? [] })
}

/**
 * POST /api/hradmin/employees/[id]/contracts
 *
 * Multipart upload. Form fields:
 *   - file: File (PDF or image, ≤ 20MB)
 *   - contract_type: probation | permanent | amendment | renewal | termination
 *   - signed_date: ISO date (YYYY-MM-DD)
 *   - effective_start?: ISO date
 *   - effective_end?: ISO date
 *   - notes?: free-text
 *
 * Workflow: write file to Storage at /<employee_id>/<timestamp>_<type>.ext
 * then INSERT a metadata row. If the metadata insert fails we delete
 * the orphaned blob to keep the bucket tidy.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }

    const employeeRowId = await resolveEmployeeId((await context.params).id)
    if (!employeeRowId) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid multipart payload' }, { status: 400 })
    }

    const file = form.get('file')
    const contractType = String(form.get('contract_type') ?? '').trim()
    const signedDate = String(form.get('signed_date') ?? '').trim()
    const effectiveStart = (form.get('effective_start') as string | null)?.trim() || null
    const effectiveEnd = (form.get('effective_end') as string | null)?.trim() || null
    const notes = (form.get('notes') as string | null)?.trim() || null

    // Validate
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'ต้องแนบไฟล์สัญญา' }, { status: 400 })
    }
    if (!VALID_TYPES.has(contractType)) {
        return NextResponse.json({ error: 'ประเภทสัญญาไม่ถูกต้อง' }, { status: 400 })
    }
    if (!signedDate || !/^\d{4}-\d{2}-\d{2}$/.test(signedDate)) {
        return NextResponse.json({ error: 'วันที่ลงนามไม่ถูกต้อง (YYYY-MM-DD)' }, { status: 400 })
    }
    if (file.size === 0) {
        return NextResponse.json({ error: 'ไฟล์ว่างเปล่า' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `ไฟล์ใหญ่เกิน 20MB (ปัจจุบัน ${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 400 })
    }
    if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({
            error: `ประเภทไฟล์ไม่รองรับ — ใช้ PDF หรือรูปภาพเท่านั้น (ที่ส่งมา: ${file.type || 'unknown'})`,
        }, { status: 400 })
    }

    // Build storage path. Timestamp guarantees uniqueness even if HR
    // uploads two contracts of the same type on the same day.
    const ext = inferExtension(file.type, file.name)
    const ts = Date.now()
    const filePath = `${employeeRowId}/${signedDate}_${contractType}_${ts}${ext}`

    // Upload to private bucket
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await supabaseAdmin
        .storage
        .from(BUCKET)
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
        })
    if (uploadErr) {
        console.error('[contracts/upload] storage error:', uploadErr)
        return NextResponse.json({ error: `อัปโหลดไฟล์ไม่สำเร็จ: ${uploadErr.message}` }, { status: 500 })
    }

    // Insert metadata row
    const { data: row, error: insertErr } = await supabaseAdmin
        .from('employee_contracts')
        .insert({
            employee_id: employeeRowId,
            contract_type: contractType,
            signed_date: signedDate,
            effective_start: effectiveStart,
            effective_end: effectiveEnd,
            file_path: filePath,
            file_name: file.name || `contract${ext}`,
            file_size: file.size,
            mime_type: file.type,
            notes,
            uploaded_by: auth.session.id,
        })
        .select('id, contract_type, signed_date, file_path, file_name, file_size, uploaded_at')
        .single()

    if (insertErr || !row) {
        // Clean up the orphaned blob — leaving it would let an attacker
        // run the bucket up by retrying with bad metadata.
        await supabaseAdmin.storage.from(BUCKET).remove([filePath]).catch(() => {})
        console.error('[contracts/upload] insert error:', insertErr)
        return NextResponse.json({ error: insertErr?.message ?? 'บันทึกข้อมูลสัญญาไม่สำเร็จ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, contract: row })
}

// ─── Helpers ───────────────────────────────────────────────────────────

async function resolveEmployeeId(idOrCode: string): Promise<string | null> {
    // Same lookup pattern as the profile page: try employee_code first,
    // fall back to UUID.
    const byCode = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_code', idOrCode)
        .maybeSingle()
    if (byCode.data?.id) return byCode.data.id as string

    const byId = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', idOrCode)
        .maybeSingle()
    return (byId.data?.id as string | null) ?? null
}

function inferExtension(mime: string, name: string): string {
    // Trust filename extension first (preserves .heic/.heif quirks),
    // fall back to mime mapping if filename is bare.
    const fromName = /\.(pdf|jpe?g|png|heic|heif|webp)$/i.exec(name)
    if (fromName) return `.${fromName[1].toLowerCase()}`
    switch (mime) {
        case 'application/pdf': return '.pdf'
        case 'image/jpeg':      return '.jpg'
        case 'image/png':       return '.png'
        case 'image/heic':      return '.heic'
        case 'image/heif':      return '.heif'
        case 'image/webp':      return '.webp'
        default:                return '.bin'
    }
}
