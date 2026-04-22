import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireHrAdmin } from '@/lib/policy-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/leave/policies/preview
 * Body: {
 *   min_level?: number | null
 *   max_level?: number | null
 *   min_years_service?: number | null
 *   max_years_service?: number | null
 *   position_pattern?: string | null
 *   year?: number  (defaults to current year — used for years-of-service math)
 * }
 *
 * Returns the active employees that match the conditions, with
 * computed years_service so HR can spot-check the list.
 */
export async function POST(req: NextRequest) {
    const block = await requireHrAdmin(); if (block) return block

    const body = await req.json().catch(() => ({}))
    const minLevel = num(body.min_level)
    const maxLevel = num(body.max_level)
    const minYears = num(body.min_years_service)
    const maxYears = num(body.max_years_service)
    const rawPattern = str(body.position_pattern)
    const year = num(body.year) ?? new Date().getFullYear()

    const { data: emps, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, position, department, approval_level, start_date, photo_url')
        .eq('status', 'active')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Pattern validation — if HR typed garbage, surface the error rather than silently drop rows
    let regex: RegExp | null = null
    if (rawPattern) {
        try { regex = new RegExp(rawPattern) }
        catch (err) {
            return NextResponse.json({
                error: 'รูปแบบ regex ไม่ถูกต้อง: ' + (err instanceof Error ? err.message : String(err)),
            }, { status: 400 })
        }
    }

    // Years of service computed against Dec 31 of the target year (matches the
    // DB function's AGE(make_date(year,12,31), start_date)).
    const yearEnd = new Date(Date.UTC(year, 11, 31))

    const matched = (emps ?? [])
        .map(e => {
            let yearsService = 0
            if (e.start_date) {
                const start = new Date(String(e.start_date))
                const diffMs = yearEnd.getTime() - start.getTime()
                yearsService = Math.max(0, diffMs / (365.2425 * 86400000))
            }
            return {
                id: e.id as string,
                employee_code: e.employee_code as string,
                nickname: (e.nickname as string | null) ?? null,
                first_name_th: (e.first_name_th as string | null) ?? null,
                last_name_th: (e.last_name_th as string | null) ?? null,
                position: (e.position as string | null) ?? null,
                department: (e.department as string | null) ?? null,
                approval_level: (e.approval_level as number | null) ?? null,
                start_date: (e.start_date as string | null) ?? null,
                photo_url: (e.photo_url as string | null) ?? null,
                years_service: Math.round(yearsService * 10) / 10,
            }
        })
        .filter(e => {
            const lvl = e.approval_level
            if (minLevel != null && (lvl == null || lvl < minLevel)) return false
            if (maxLevel != null && (lvl == null || lvl > maxLevel)) return false
            if (minYears != null && e.years_service < minYears) return false
            if (maxYears != null && e.years_service > maxYears) return false
            if (regex && !(e.position && regex.test(e.position))) return false
            return true
        })
        .sort((a, b) => {
            if ((b.approval_level ?? 0) !== (a.approval_level ?? 0)) {
                return (b.approval_level ?? 0) - (a.approval_level ?? 0)
            }
            return a.employee_code.localeCompare(b.employee_code)
        })

    return NextResponse.json({
        employees: matched,
        matched_count: matched.length,
        total_active: emps?.length ?? 0,
        year,
    })
}

// ── helpers ─────────────────────────────────────────────────────────────────
function num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}
function str(v: unknown): string | null {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    return s.length ? s : null
}
