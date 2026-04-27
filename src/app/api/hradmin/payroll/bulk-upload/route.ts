import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManagePayroll } from '@/lib/route-auth'
import { persistSlip } from '@/lib/salary-slip-persist'
import { notifyEmployeeOfNewSlip } from '@/lib/payroll-notify'

export const dynamic = 'force-dynamic'

const MAX_FILES = 100        // company has 53 active employees; 100 is plenty
const MAX_TOTAL_BYTES = 100 * 1024 * 1024  // 100MB total per request

/**
 * POST /api/hradmin/payroll/bulk-upload
 *
 * Multipart form with N file fields named "file" plus a single
 * "year" + "month" pair (the period everyone shares). Filename
 * pattern (case-insensitive, anywhere in the name):
 *
 *   <employee_code>
 *
 * Examples that all match employee_code "060-01":
 *   060-01.pdf
 *   Slip_060-01_2026-04.pdf
 *   payroll-060-01-march.pdf
 *
 * Workflow (single round-trip):
 *   1. Validate auth + month/year + file types/sizes.
 *   2. Build a code→employee_id lookup once.
 *   3. For each file: extract code, match employee, save via the
 *      shared persistSlip() helper from the single-upload route.
 *   4. Notify each successfully-saved employee.
 *   5. Return per-file outcome so the UI can show "47 ok · 3 ไม่
 *      เจอรหัส · 1 ไฟล์ใหญ่เกิน".
 *
 * The ?dryRun=1 query param skips the actual upload + notify so
 * the UI can show a preview before HR commits.
 */
export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePayroll(auth)) {
        return NextResponse.json({ error: 'Forbidden — payroll permission required' }, { status: 403 })
    }

    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid multipart payload' }, { status: 400 })
    }

    const year = Number(form.get('year'))
    const month = Number(form.get('month'))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'ปีไม่ถูกต้อง' }, { status: 400 })
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: 'เดือนต้องอยู่ระหว่าง 1-12' }, { status: 400 })
    }

    const files = form.getAll('file').filter((f): f is File => f instanceof File)
    if (files.length === 0) {
        return NextResponse.json({ error: 'ไม่มีไฟล์แนบ' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
        return NextResponse.json({
            error: `อัปโหลดได้สูงสุด ${MAX_FILES} ไฟล์ต่อครั้ง (ส่งมา ${files.length})`,
        }, { status: 400 })
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
    if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({
            error: `ขนาดรวมเกิน ${MAX_TOTAL_BYTES / 1024 / 1024}MB (${(totalBytes / 1024 / 1024).toFixed(1)}MB)`,
        }, { status: 400 })
    }

    // ── Code → employee_id lookup ──────────────────────────────────
    const { data: rosterRaw } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, status')
        .neq('status', null as never)
    const roster = (rosterRaw ?? []) as Array<{
        id: string; employee_code: string;
        first_name_th: string; last_name_th: string; status: string
    }>
    const codeMap = new Map<string, typeof roster[number]>()
    for (const row of roster) {
        if (row.employee_code) codeMap.set(row.employee_code, row)
    }

    // Sort codes longest-first so "060-001" is checked before "060-01"
    // when the regex would otherwise match the substring.
    const codesByLength = [...codeMap.keys()].sort((a, b) => b.length - a.length)

    // ── Per-file outcome ────────────────────────────────────────────
    type Outcome = {
        filename: string
        size: number
        status: 'ok' | 'matched' | 'no_match' | 'invalid_type' | 'too_large' | 'error'
        employee_id?: string
        employee_code?: string
        employee_name?: string
        error?: string
    }
    const outcomes: Outcome[] = []
    const ALLOWED_MIME = new Set([
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    ])
    const MAX_PER_FILE = 10 * 1024 * 1024

    for (const file of files) {
        const baseOutcome: Outcome = {
            filename: file.name,
            size: file.size,
            status: 'no_match',
        }

        // Validate file
        if (!ALLOWED_MIME.has(file.type)) {
            outcomes.push({ ...baseOutcome, status: 'invalid_type', error: file.type || 'unknown' })
            continue
        }
        if (file.size > MAX_PER_FILE) {
            outcomes.push({ ...baseOutcome, status: 'too_large' })
            continue
        }
        if (file.size === 0) {
            outcomes.push({ ...baseOutcome, status: 'error', error: 'empty file' })
            continue
        }

        // Match employee by code in filename
        const lower = file.name
        const matchedCode = codesByLength.find((code) => lower.includes(code))
        if (!matchedCode) {
            outcomes.push({ ...baseOutcome, status: 'no_match' })
            continue
        }
        const emp = codeMap.get(matchedCode)!
        const matchOutcome: Outcome = {
            ...baseOutcome,
            status: 'matched',
            employee_id: emp.id,
            employee_code: emp.employee_code,
            employee_name: `${emp.first_name_th} ${emp.last_name_th}`.trim(),
        }

        if (dryRun) {
            outcomes.push(matchOutcome)
            continue
        }

        // Persist
        const result = await persistSlip({
            employeeRowId: emp.id,
            year,
            month,
            file,
            uploadedBy: auth.session.id,
        })
        if (!result.ok) {
            outcomes.push({ ...matchOutcome, status: 'error', error: result.error })
            continue
        }
        outcomes.push({ ...matchOutcome, status: 'ok' })

        // Notify — fire-and-forget; never block the response on email
        notifyEmployeeOfNewSlip({
            employeeId: emp.id,
            year,
            month,
        }).catch(err => console.error('[bulk-upload/notify]', emp.employee_code, err))
    }

    // Summary counts for the UI banner
    const summary = {
        total:        outcomes.length,
        ok:           outcomes.filter(o => o.status === 'ok').length,
        matched:      outcomes.filter(o => o.status === 'matched').length,  // dryRun only
        no_match:     outcomes.filter(o => o.status === 'no_match').length,
        invalid_type: outcomes.filter(o => o.status === 'invalid_type').length,
        too_large:    outcomes.filter(o => o.status === 'too_large').length,
        error:        outcomes.filter(o => o.status === 'error').length,
    }

    return NextResponse.json({
        success: true,
        dryRun,
        year,
        month,
        summary,
        outcomes,
    })
}
