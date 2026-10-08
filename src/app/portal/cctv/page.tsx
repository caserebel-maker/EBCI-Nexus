import { redirect } from 'next/navigation'
import { getAuth, canViewCctv, isMd } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CctvView } from './cctv-view'
import type { CctvCamera } from '@/app/api/cctv/cameras/route'

export const dynamic = 'force-dynamic'

export default async function CctvPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canViewCctv(auth)) redirect('/portal/dashboard')

    const { data: rawCameras } = await supabaseAdmin
        .from('cctv_cameras')
        .select('*')
        .order('sort_order', { ascending: true })

    const cameras: CctvCamera[] = (rawCameras && rawCameras.length > 0)
        ? rawCameras
        : [
            {
                id: 'cam-1',
                name: 'กล้อง 1 — ด้านหน้าอาคาร (Front)',
                location: 'หลังคาหน้าอาคาร (Roof / Front)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.28:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.28:554/stream2',
                webrtc_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/webrtc?src=cam1',
                hls_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/hls?src=cam1',
                snapshot_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/frame.jpeg?src=cam1',
                is_active: true,
                sort_order: 1,
                notes: 'MAC: EC-B9-31-8D-9D-1D | Tapo C545D (FW 1.1.7)',
            },
            {
                id: 'cam-2',
                name: 'กล้อง 2 — ด้านข้างอาคาร (Side)',
                location: 'หลังคาด้านข้าง (Roof / Side)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.89:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.89:554/stream2',
                webrtc_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/webrtc?src=cam2',
                hls_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/hls?src=cam2',
                snapshot_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/frame.jpeg?src=cam2',
                is_active: true,
                sort_order: 2,
                notes: 'MAC: EC-B9-31-8D-9E-0B | Tapo C545D (FW 1.1.2)',
            },
            {
                id: 'cam-3',
                name: 'กล้อง 3 — ประตูด้านหลัง',
                location: 'ประตูด้านหลัง (Back Entrance)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://Pondebci:0818331367@192.168.10.121:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.10.121:554/stream2',
                webrtc_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/webrtc?src=cam3',
                hls_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/hls?src=cam3',
                snapshot_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/frame.jpeg?src=cam3',
                is_active: true,
                sort_order: 3,
                notes: 'Tapo C545D (IP: 192.168.10.121)',
            },
            {
                id: 'cam-4',
                name: 'กล้อง 4 — ประตูหน้าด้านใน',
                location: 'ประตูหน้าด้านใน (Front Inner Entrance)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.104:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.104:554/stream2',
                webrtc_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/webrtc?src=cam4',
                hls_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/hls?src=cam4',
                snapshot_url: 'https://painted-princeton-basename-mall.trycloudflare.com/api/frame.jpeg?src=cam4',
                is_active: true,
                sort_order: 4,
                notes: 'ตรวจจับประตูหน้าด้านใน (รอเชื่อมต่อ)',
            },
        ]

    const canManage = auth.session.role === 'hr_admin' || auth.permissions.can_manage_system || isMd(auth)

    return (
        <CctvView
            initialCameras={cameras}
            canManage={canManage}
            userRole={auth.session.role}
        />
    )
}
