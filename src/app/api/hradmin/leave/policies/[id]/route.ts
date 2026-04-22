import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireHrAdmin, sanitizePolicyPayload } from '@/lib/policy-helpers'

export const dynamic = 'force-dynamic'

/** PUT /api/hradmin/leave/policies/[id] */
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const block = await requireHrAdmin(); if (block) return block
    const { id } = await context.params

    const body = await req.json().catch(() => ({}))
    const clean = sanitizePolicyPayload(body)

    if (!clean.leave_type_id) {
        return NextResponse.json({ error: 'ต้องระบุประเภทการลา' }, { status: 400 })
    }
    if (clean.days_per_year === null || clean.days_per_year < 0) {
        return NextResponse.json({ error: 'จำนวนวันต้องเป็น 0 หรือมากกว่า' }, { status: 400 })
    }
    if (clean.min_level && clean.max_level && clean.min_level > clean.max_level) {
        return NextResponse.json({ error: 'Level ต่ำสุดต้องไม่มากกว่าสูงสุด' }, { status: 400 })
    }
    if (clean.min_years_service && clean.max_years_service && clean.min_years_service > clean.max_years_service) {
        return NextResponse.json({ error: 'อายุงานต่ำสุดต้องไม่มากกว่าสูงสุด' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
        .from('leave_policies')
        .update({ ...clean, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ policy: data })
}

/** DELETE /api/hradmin/leave/policies/[id] */
export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const block = await requireHrAdmin(); if (block) return block
    const { id } = await context.params

    const { error } = await supabaseAdmin
        .from('leave_policies')
        .delete()
        .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
