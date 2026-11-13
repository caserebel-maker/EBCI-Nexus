import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const GATEWAY_SECRET = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026'

export async function GET() {
    try {
        const { data } = await supabaseAdmin
            .from('cctv_cameras')
            .select('webrtc_url, updated_at')
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle()

        let tunnelUrl: string | null = null
        if (data?.webrtc_url) {
            const match = data.webrtc_url.match(/^(https:\/\/[^/]+)/)
            if (match) {
                tunnelUrl = match[1]
            }
        }

        const updatedAtMs = data?.updated_at ? new Date(data.updated_at).getTime() : 0
        const isOnline = Date.now() - updatedAtMs < 600_000 // online if seen within 10 minutes

        return NextResponse.json({
            tunnel_url: tunnelUrl,
            is_online: isOnline,
            last_seen: data?.updated_at || null,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        })
    } catch (err: unknown) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('x-gateway-secret')
        const body = await req.json().catch(() => ({}))

        if (authHeader !== GATEWAY_SECRET && body?.secret !== GATEWAY_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rawUrl = body?.tunnel_url
        if (!rawUrl || typeof rawUrl !== 'string') {
            return NextResponse.json({ error: 'Missing tunnel_url' }, { status: 400 })
        }

        const cleanUrl = rawUrl.trim().replace(/\/+$/, '')
        const now = new Date().toISOString()

        // Check current URL in database
        const { data: cam1 } = await supabaseAdmin
            .from('cctv_cameras')
            .select('webrtc_url')
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle()

        const currentDbUrl = cam1?.webrtc_url ? cam1.webrtc_url.match(/^(https:\/\/[^/]+)/)?.[1] : null

        if (currentDbUrl === cleanUrl && !body?.force) {
            await supabaseAdmin.from('cctv_cameras').update({ updated_at: now }).eq('sort_order', 1)
            return NextResponse.json({
                success: true,
                tunnel_url: cleanUrl,
                status: 'heartbeat_updated',
                updated_at: now,
            })
        }

        // Synchronize all cameras in Supabase with the active tunnel URL
        const updates = [
            {
                sort_order: 1,
                webrtc_url: `${cleanUrl}/api/webrtc?src=cam1`,
                hls_url: `${cleanUrl}/api/hls?src=cam1`,
                snapshot_url: `${cleanUrl}/api/frame.jpeg?src=cam1`,
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.19:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.19:554/stream2',
                updated_at: now,
            },
            {
                sort_order: 2,
                webrtc_url: `${cleanUrl}/api/webrtc?src=cam2`,
                hls_url: `${cleanUrl}/api/hls?src=cam2`,
                snapshot_url: `${cleanUrl}/api/frame.jpeg?src=cam2`,
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.80:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.80:554/stream2',
                updated_at: now,
            },
            {
                sort_order: 3,
                webrtc_url: `${cleanUrl}/api/webrtc?src=cam3`,
                hls_url: `${cleanUrl}/api/hls?src=cam3`,
                snapshot_url: `${cleanUrl}/api/frame.jpeg?src=cam3`,
                stream_url: 'rtsp://Pondebci:0818331367@192.168.10.108:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.10.108:554/stream2',
                updated_at: now,
            },
        ]

        await Promise.all(
            updates.map(u =>
                supabaseAdmin
                    .from('cctv_cameras')
                    .update({
                        webrtc_url: u.webrtc_url,
                        hls_url: u.hls_url,
                        snapshot_url: u.snapshot_url,
                        stream_url: u.stream_url,
                        sub_stream_url: u.sub_stream_url,
                        updated_at: u.updated_at,
                    })
                    .eq('sort_order', u.sort_order)
            )
        )

        return NextResponse.json({
            success: true,
            tunnel_url: cleanUrl,
            status: 'synced_to_db',
            updated_at: now,
        })
    } catch (err: unknown) {
        console.error('[cctv/tunnel] POST error:', err)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
