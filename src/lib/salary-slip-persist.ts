import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'salary-slips'

/**
 * Shared helper that takes a validated File + period + uploader id
 * and writes it to storage + the salary_slips table. Used by both
 * the single-upload endpoint at
 *   /api/hradmin/employees/[id]/salary-slips
 * and the bulk endpoint at
 *   /api/hradmin/payroll/bulk-upload
 *
 * Lives in /lib (not co-located with a route) because Next 16
 * complains when one route handler imports another's exports.
 *
 * Replace-on-conflict behaviour: if a non-deleted slip already
 * exists for the same (employee, year, month), it gets soft-
 * deleted with reason "Replaced by re-upload" so the unique
 * partial index lets the new row in. The previous blob stays in
 * Storage to satisfy the 7-year retention.
 */
export interface PersistSlipArgs {
    employeeRowId: string
    year: number
    month: number
    file: File
    notes?: string | null
    uploadedBy: string
}

export interface PersistSlipResult {
    ok: true
    row: { id: string; year: number; month: number; file_path: string }
}
export interface PersistSlipFailure {
    ok: false
    error: string
    status: number
}

export async function persistSlip(args: PersistSlipArgs): Promise<PersistSlipResult | PersistSlipFailure> {
    // Replace-on-conflict — soft-delete any active slip for the same
    // period before inserting the new one.
    const { data: existing } = await supabaseAdmin
        .from('salary_slips')
        .select('id')
        .eq('employee_id', args.employeeRowId)
        .eq('year', args.year)
        .eq('month', args.month)
        .is('deleted_at', null)
        .maybeSingle()
    if (existing?.id) {
        await supabaseAdmin
            .from('salary_slips')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: args.uploadedBy,
                deleted_reason: 'Replaced by re-upload',
            })
            .eq('id', existing.id)
    }

    // Upload to private bucket
    const ext = inferExtension(args.file.type, args.file.name)
    const ts = Date.now()
    const filePath = `${args.employeeRowId}/${args.year}-${String(args.month).padStart(2, '0')}_${ts}${ext}`
    const buffer = Buffer.from(await args.file.arrayBuffer())
    const { error: uploadErr } = await supabaseAdmin
        .storage
        .from(BUCKET)
        .upload(filePath, buffer, {
            contentType: args.file.type,
            upsert: false,
        })
    if (uploadErr) {
        return { ok: false, error: `อัปโหลดไฟล์ไม่สำเร็จ: ${uploadErr.message}`, status: 500 }
    }

    const { data: row, error: insertErr } = await supabaseAdmin
        .from('salary_slips')
        .insert({
            employee_id: args.employeeRowId,
            year: args.year,
            month: args.month,
            file_path: filePath,
            file_name: args.file.name || `slip${ext}`,
            file_size: args.file.size,
            mime_type: args.file.type,
            notes: args.notes ?? null,
            uploaded_by: args.uploadedBy,
        })
        .select('id, year, month, file_path')
        .single()

    if (insertErr || !row) {
        await supabaseAdmin.storage.from(BUCKET).remove([filePath]).catch(() => {})
        return {
            ok: false,
            error: insertErr?.message ?? 'บันทึกข้อมูลสลิปไม่สำเร็จ',
            status: 500,
        }
    }

    return { ok: true, row }
}

function inferExtension(mime: string, name: string): string {
    const fromName = /\.(pdf|jpe?g|png|webp)$/i.exec(name)
    if (fromName) return `.${fromName[1].toLowerCase()}`
    switch (mime) {
        case 'application/pdf': return '.pdf'
        case 'image/jpeg':      return '.jpg'
        case 'image/png':       return '.png'
        case 'image/webp':      return '.webp'
        default:                return '.bin'
    }
}
