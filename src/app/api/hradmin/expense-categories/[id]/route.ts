import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * HR renames or turns a category on/off. Categories are never hard-deleted
 * so old claims keep their history (claims also store a name snapshot).
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { name?: string; is_active?: boolean }
    const update: Record<string, unknown> = {}
    if (typeof body.name === 'string') {
        const name = body.name.trim().slice(0, 100)
        if (!name) return NextResponse.json({ error: 'ชื่อประเภทว่างไม่ได้' }, { status: 400 })
        update.name = name
    }
    if (typeof body.is_active === 'boolean') update.is_active = body.is_active
    if (!Object.keys(update).length) return NextResponse.json({ error: 'ไม่มีข้อมูลให้แก้ไข' }, { status: 400 })

    const { error } = await supabaseAdmin.from('expense_claim_categories').update(update).eq('id', id)
    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'มีประเภทนี้อยู่แล้ว' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}
