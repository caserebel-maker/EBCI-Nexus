import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export interface CctvCamera {
    id: string
    name: string
    location: string
    model: string
    stream_url: string | null
    sub_stream_url: string | null
    snapshot_url: string | null
    webrtc_url: string | null
    hls_url: string | null
    is_active: boolean
    sort_order: number
    notes: string | null
    created_at?: string
    updated_at?: string
}

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('cctv_cameras')
            .select('*')
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('[cctv/cameras] GET error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ cameras: data || [] })
    } catch (err: unknown) {
        console.error('[cctv/cameras] GET unexpected error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Gated: HR Admin or Manager can modify CCTV configuration
    const isAllowed = session.role === 'hr_admin' || session.role === 'manager'
    if (!isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing camera ID' }, { status: 400 })
        }

        updates.updated_at = new Date().toISOString()

        const { data, error } = await supabaseAdmin
            .from('cctv_cameras')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[cctv/cameras] PATCH error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, camera: data })
    } catch (err: unknown) {
        console.error('[cctv/cameras] PATCH unexpected error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
