import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManagePayroll } from '@/lib/route-auth'
import { notifyEmployeeOfNewSlip } from '@/lib/payroll-notify'
import { persistSlip } from '@/lib/salary-slip-persist'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
])

/**
 * GET /api/hradmin/employees/[id]/salary-slips
 *
 * List active (non-deleted) slips for an employee, newest first.
 * Gated on can_manage_payroll — HR-Manager-without-payroll users
 * (e.g. มด) get a 403 even though they can see the rest of the
 * profile. The portal-side endpoint at /api/portal/payroll covers
 * the case where the employee themselves wants to see their own.
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePayroll(auth)) {
        return NextResponse.json({ error: 'Forbidden — payroll permission required' }, { status: 403 })
    }

    const employeeRowId = await resolveEmployeeId((await context.params).id)
    if (!employeeRowId) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })

    const { data, error } = await supabaseAdmin
        .from('salary_slips')
        .select('id, year, month, file_path, file_name, file_size, mime_type, notes, uploaded_at, uploaded_by')
        .eq('employee_id', employeeRowId)
        .is('deleted_at', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ slips: data ?? [] })
}

/**
 * POST /api/hradmin/employees/[id]/salary-slips
 *
 * Single-slip upload. Multipart form fields:
 *   - file: PDF or image, ≤ 10MB
 *   - year: 2000-2100
 *   - month: 1-12
 *   - notes?: free text
 *
 * If a non-deleted slip already exists for that (employee, year,
 * month) we soft-delete it first so the unique partial index lets
 * the new row in. The previous slip's blob stays in storage —
 * legal retention rule.
 *
 * On success, fires the in-app notification + email to the
 * employee best-effort (not awaited blockingly).
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePayroll(auth)) {
        return NextResponse.json({ error: 'Forbidden — payroll permission required' }, { status: 403 })
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
    const year = Number(form.get('year'))
    const month = Number(form.get('month'))
    const notes = (form.get('notes') as string | null)?.trim() || null

    // Validate
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'ต้องแนบไฟล์สลิป' }, { status: 400 })
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'ปีไม่ถูกต้อง' }, { status: 400 })
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: 'เดือนต้องอยู่ระหว่าง 1-12' }, { status: 400 })
    }
    if (file.size === 0) {
        return NextResponse.json({ error: 'ไฟล์ว่างเปล่า' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({
            error: `ไฟล์ใหญ่เกิน 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        }, { status: 400 })
    }
    if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({
            error: `ประเภทไฟล์ไม่รองรับ — ใช้ PDF หรือรูปภาพเท่านั้น (${file.type || 'unknown'})`,
        }, { status: 400 })
    }

    const result = await persistSlip({
        employeeRowId,
        year,
        month,
        file,
        notes,
        uploadedBy: auth.session.id,
    })
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Notify the employee — best-effort, never blocks the response.
    notifyEmployeeOfNewSlip({
        employeeId: employeeRowId,
        year,
        month,
    }).catch(err => console.error('[salary-slips/upload] notify error:', err))

    return NextResponse.json({ success: true, slip: result.row })
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function resolveEmployeeId(idOrCode: string): Promise<string | null> {
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
