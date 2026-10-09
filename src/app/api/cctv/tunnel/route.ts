import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const GATEWAY_SECRET = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026'

// Memory cache for serverless instance
let cachedTunnelUrl: string | null = null
let lastHeartbeat: number = 0

export async function GET() {
    try {
        let tunnelUrl = cachedTunnelUrl

        // If not in memory, fetch from Supabase cctv_cameras cam-1
        if (!tunnelUrl) {
            const { data } = await supabaseAdmin
                .from('cctv_cameras')
                .select('webrtc_url, updated_at')
                .eq('id', 'cam-1')
                .maybeSingle()

            if (data?.webrtc_url) {
                const match = data.webrtc_url.match(/^(https:\/\/[^/]+)/)
                if (match) {
                    tunnelUrl = match[1]
                    cachedTunnelUrl = tunnelUrl
                }
            }
        }

        const isOnline = Date.now() - lastHeartbeat < 120_000 // online if seen within 2 minutes

        return NextResponse.json({
            tunnel_url: tunnelUrl || null,
            is_online: isOnline,
            last_seen: lastHeartbeat ? new Date(lastHeartbeat).toISOString() : null,
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
        cachedTunnelUrl = cleanUrl
        lastHeartbeat = Date.now()

        // Synchronize all cameras in Supabase with the active tunnel URL
        const now = new Date().toISOString()
        const updates = [
            {
                id: 'cam-1',
                webrtc_url: `${cleanUrl}/api/webrtc?src=cam1`,
                hls_url: `${cleanUrl}/api/hls?src=cam1`,
                snapshot_url: `${cleanUrl}/api/frame.jpeg?src=cam1`,
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.28:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.28:554/stream2',
                updated_at: now,
            },
            {
                id: 'cam-2',
                webrtc_url: `${cleanUrl}/api/webrtc?src=cam2`,
                hls_url: `${cleanUrl}/api/hls?src=cam2`,
                snapshot_url: `${cleanUrl}/api/frame.jpeg?src=cam2`,
                stream_url: 'rtsp://Pondebci:0818331367@192.168.10.109:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.10.109:554/stream2',
                updated_at: now,
            },
            {
                id: 'cam-3',
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
                    .eq('id', u.id)
            )
        )

        return NextResponse.json({
            success: true,
            tunnel_url: cleanUrl,
            updated_at: now,
        })
    } catch (err: unknown) {
        console.error('[cctv/tunnel] POST error:', err)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
