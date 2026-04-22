import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireHrAdmin, sanitizePolicyPayload } from '@/lib/policy-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hradmin/leave/policies
 * Returns every policy + its leave_type join so the list UI doesn't
 * need a second round-trip.
 */
export async function GET() {
    const block = await requireHrAdmin(); if (block) return block

    const { data, error } = await supabaseAdmin
        .from('leave_policies')
        .select(`
            id, leave_type_id, min_level, max_level, min_years_service,
            max_years_service, position_pattern, days_per_year, description,
            priority, is_active, created_at, updated_at,
            leave_type:leave_types(id, name_th, icon, color, display_order)
        `)
        .order('leave_type_id', { ascending: true })
        .order('priority', { ascending: false })
        .order('days_per_year', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ policies: data ?? [] })
}

/** POST /api/hradmin/leave/policies — create a new policy */
export async function POST(req: NextRequest) {
    const block = await requireHrAdmin(); if (block) return block

    const body = await req.json().catch(() => ({}))
    const clean = sanitizePolicyPayload(body)

    if (!clean.leave_type_id) {
        return NextResponse.json({ error: 'ต้องระบุประเภทการลา' }, { status: 400 })
    }
    if (clean.days_per_year === null || clean.days_per_year < 0) {
        return NextResponse.json({ error: 'จำนวนวันต้องเป็น 0 หรือมากกว่า' }, { status: 400 })
    }
    if (clean.min_level && clean.max_level && clean.min_level > clean.max_level) {
        return NextResponse.json({ error: 'Level ต่ำสุดต้องไม่มากกว่า Level สูงสุด' }, { status: 400 })
    }
    if (clean.min_years_service && clean.max_years_service && clean.min_years_service > clean.max_years_service) {
        return NextResponse.json({ error: 'อายุงานต่ำสุดต้องไม่มากกว่าสูงสุด' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const { data, error } = await supabaseAdmin
        .from('leave_policies')
        .insert({ ...clean, created_at: nowIso, updated_at: nowIso })
        .select('*')
        .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ policy: data })
}
