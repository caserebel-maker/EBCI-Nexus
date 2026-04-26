import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const year = req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear())

    const { data, error } = await supabaseAdmin
        .from('holidays')
        .select('*')
        .eq('year', parseInt(year))
        .order('date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { date, name, type } = body

    if (!date || !name || !type)
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })

    const year = parseInt(date.substring(0, 4))

    const { data, error } = await supabaseAdmin
        .from('holidays')
        .insert({ date, name, type, year })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
}
