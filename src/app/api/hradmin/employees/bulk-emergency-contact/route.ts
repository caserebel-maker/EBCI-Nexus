import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

/**
 * Bulk emergency-contact import.
 *
 *   POST /api/hradmin/employees/bulk-emergency-contact
 *
 * Body: {
 *   mode: 'preview' | 'apply'
 *   rows: Array<{
 *     employee_code: string   // OR employee_id
 *     employee_id?: string
 *     name: string
 *     phone: string
 *     relation?: string
 *   }>
 *   overwrite?: boolean       // if false, skip rows where contact already set
 * }
 *
 * Flow:
 *   • Resolve every row to an employees.id by employee_code (or accept
 *     employee_id directly). Unknown codes go into `skipped[]`.
 *   • In preview mode: just report matched / skipped / would-update.
 *   • In apply mode: write `emergency_contact_*` columns. Default
 *     overwrite=false skips rows that already have a contact name —
 *     prevents an accidental CSV from clobbering manually-entered data.
 */

interface InputRow {
    employee_code?: string
    employee_id?: string
    name?: string
    phone?: string
    relation?: string
}

export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'เฉพาะ HR เท่านั้น' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const mode = String(body?.mode ?? '')
    const overwrite = Boolean(body?.overwrite)
    const rows: InputRow[] = Array.isArray(body?.rows) ? body.rows : []

    if (!['preview', 'apply'].includes(mode)) {
        return NextResponse.json({ error: "mode ต้องเป็น 'preview' หรือ 'apply'" }, { status: 400 })
    }
    if (rows.length === 0) {
        return NextResponse.json({ error: 'ไม่มีข้อมูลใน rows' }, { status: 400 })
    }
    if (rows.length > 1000) {
        return NextResponse.json({ error: 'จำกัด 1,000 แถว/ครั้ง' }, { status: 400 })
    }

    // Resolve identifiers — bulk fetch by code, fall back to direct id.
    const codes = Array.from(new Set(
        rows.map(r => (r.employee_code ?? '').trim()).filter(Boolean),
    ))
    const ids = Array.from(new Set(
        rows.map(r => (r.employee_id ?? '').trim()).filter(Boolean),
    ))

    type EmpLookup = {
        id: string
        employee_code: string | null
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        emergency_contact_name: string | null
    }

    const lookup = new Map<string, EmpLookup>()  // key = employee_code or id
    if (codes.length > 0) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, emergency_contact_name')
            .in('employee_code', codes)
        for (const e of (data ?? []) as EmpLookup[]) {
            if (e.employee_code) lookup.set(e.employee_code, e)
        }
    }
    if (ids.length > 0) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, emergency_contact_name')
            .in('id', ids)
        for (const e of (data ?? []) as EmpLookup[]) {
            lookup.set(e.id, e)
        }
    }

    const plan: Array<{
        row: InputRow
        emp: EmpLookup | null
        action: 'apply' | 'skip-existing' | 'skip-unknown' | 'skip-invalid'
        reason?: string
    }> = []

    for (const r of rows) {
        const code = (r.employee_code ?? '').trim()
        const id = (r.employee_id ?? '').trim()
        const emp = code ? lookup.get(code) ?? null : id ? lookup.get(id) ?? null : null
        const name = (r.name ?? '').trim()
        const phone = (r.phone ?? '').trim()

        if (!emp) {
            plan.push({ row: r, emp: null, action: 'skip-unknown', reason: 'ไม่พบพนักงาน' })
            continue
        }
        if (!name || !phone) {
            plan.push({ row: r, emp, action: 'skip-invalid', reason: 'ขาด name หรือ phone' })
            continue
        }
        if (!overwrite && emp.emergency_contact_name) {
            plan.push({
                row: r, emp,
                action: 'skip-existing',
                reason: `มีอยู่แล้ว: ${emp.emergency_contact_name}`,
            })
            continue
        }
        plan.push({ row: r, emp, action: 'apply' })
    }

    const counts = {
        apply:          plan.filter(p => p.action === 'apply').length,
        skip_existing:  plan.filter(p => p.action === 'skip-existing').length,
        skip_unknown:   plan.filter(p => p.action === 'skip-unknown').length,
        skip_invalid:   plan.filter(p => p.action === 'skip-invalid').length,
    }

    if (mode === 'preview') {
        return NextResponse.json({
            success: true,
            counts,
            sample: plan.slice(0, 20).map(p => ({
                employee_code: p.emp?.employee_code ?? p.row.employee_code ?? null,
                employee_id:   p.emp?.id ?? null,
                name:          p.emp ? employeeName(p.emp) : null,
                action:        p.action,
                reason:        p.reason,
                new_contact:   p.action === 'apply'
                    ? { name: p.row.name, phone: p.row.phone, relation: p.row.relation ?? null }
                    : null,
            })),
        })
    }

    // ── apply ────────────────────────────────────────────────────────────
    const nowIso = new Date().toISOString()
    let applied = 0
    const failures: Array<{ employee_id: string; reason: string }> = []
    for (const p of plan) {
        if (p.action !== 'apply' || !p.emp) continue
        const { error } = await supabaseAdmin
            .from('employees')
            .update({
                emergency_contact_name:     p.row.name?.trim()     ?? null,
                emergency_contact_phone:    p.row.phone?.trim()    ?? null,
                emergency_contact_relation: p.row.relation?.trim() || null,
                updated_at: nowIso,
            })
            .eq('id', p.emp.id)
        if (error) {
            failures.push({ employee_id: p.emp.id, reason: error.message })
        } else {
            applied++
        }
    }

    return NextResponse.json({
        success: true,
        counts,
        applied,
        failures,
    })
}

function employeeName(e: { first_name_th: string | null; last_name_th: string | null; nickname: string | null }): string {
    const full = `${e.first_name_th ?? ''} ${e.last_name_th ?? ''}`.trim()
    return e.nickname ? `${full} (${e.nickname})` : full
}
