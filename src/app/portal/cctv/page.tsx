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
                name: 'กล้อง 1 — ประตูทางเข้าหลัก',
                location: 'ประตูใหญ่ด้านหน้าอาคาร (Main Entrance)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://Pondebci:0818331367@192.168.0.43:554/stream1',
                sub_stream_url: 'rtsp://Pondebci:0818331367@192.168.0.43:554/stream2',
                webrtc_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/webrtc?src=cam1',
                hls_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/hls?src=cam1',
                snapshot_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/frame.jpeg?src=cam1',
                is_active: true,
                sort_order: 1,
                notes: 'กล้อง Dual-Lens หมุนรอบทิศทาง 360° ตรวจจับยานพาหนะและบุคคลหน้าประตู',
            },
            {
                id: 'cam-2',
                name: 'กล้อง 2 — ลานจอดรถหน้าอาคาร',
                location: 'ลานจอดรถและแนวรั้วด้านหน้า (Parking Area)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://admin:ebci1234@192.168.0.102:554/stream1',
                sub_stream_url: 'rtsp://admin:ebci1234@192.168.0.102:554/stream2',
                webrtc_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/webrtc?src=cam2',
                hls_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/hls?src=cam2',
                snapshot_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/frame.jpeg?src=cam2',
                is_active: true,
                sort_order: 2,
                notes: 'ตรวจจับความเคลื่อนไหวบริเวณลานจอดรถและทางเข้า-ออก',
            },
            {
                id: 'cam-3',
                name: 'กล้อง 3 — โถงกลางและทางเดิน',
                location: 'โถงชั้น 1 อาคารสำนักงาน (Main Office Hall)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://admin:ebci1234@192.168.0.103:554/stream1',
                sub_stream_url: 'rtsp://admin:ebci1234@192.168.0.103:554/stream2',
                webrtc_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/webrtc?src=cam3',
                hls_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/hls?src=cam3',
                snapshot_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/frame.jpeg?src=cam3',
                is_active: true,
                sort_order: 3,
                notes: 'ตรวจจับพื้นที่ส่วนกลางทางเดินขึ้นชั้น 2 และห้องรับรอง',
            },
            {
                id: 'cam-4',
                name: 'กล้อง 4 — ประตูหลังและคลังสินค้า',
                location: 'ประตูหลังอาคาร / คลังจัดเก็บ (Back Entrance & Storage)',
                model: 'Tapo C545D',
                stream_url: 'rtsp://admin:ebci1234@192.168.0.104:554/stream1',
                sub_stream_url: 'rtsp://admin:ebci1234@192.168.0.104:554/stream2',
                webrtc_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/webrtc?src=cam4',
                hls_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/hls?src=cam4',
                snapshot_url: 'https://breeds-gmbh-conservative-warming.trycloudflare.com/api/frame.jpeg?src=cam4',
                is_active: true,
                sort_order: 4,
                notes: 'ตรวจจับประตูหลังและโซนขนถ่ายสินค้า',
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
