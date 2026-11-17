import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** HR adds a claim category. */
export async function POST(request: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = (body.name ?? '').trim().slice(0, 100)
    if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อประเภท' }, { status: 400 })

    const { error } = await supabaseAdmin.from('expense_claim_categories').insert({ name })
    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'มีประเภทนี้อยู่แล้ว' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
}
