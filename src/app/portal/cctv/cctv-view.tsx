'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Cctv, Grid2X2, Maximize2, Minimize2, Settings, RefreshCw, Camera,
    Volume2, VolumeX, Radio, Eye, Info, ExternalLink, Copy, Check,
    HelpCircle, X, ShieldCheck, Layers, Video, Play, AlertCircle, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CctvCamera } from '@/app/api/cctv/cameras/route'

interface Props {
    initialCameras: CctvCamera[]
    canManage: boolean
    userRole: string
}

type StreamMode = 'webrtc' | 'hls' | 'snapshot' | 'rtsp'

export function CctvView({ initialCameras, canManage }: Props) {
    const [cameras, setCameras] = useState<CctvCamera[]>(initialCameras)
    const [focusedCamId, setFocusedCamId] = useState<string | null>(null)
    const [streamMode, setStreamMode] = useState<StreamMode>('webrtc')
    const [currentTime, setCurrentTime] = useState<string>('')
    const [showGuide, setShowGuide] = useState(false)
    const [editingCam, setEditingCam] = useState<CctvCamera | null>(null)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({
        'cam-1': true,
        'cam-2': true,
        'cam-3': true,
        'cam-4': true,
    })

    // Real-time clock for CCTV On-Screen Display (OSD)
    useEffect(() => {
        const updateClock = () => {
            const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
            const y = now.getUTCFullYear()
            const m = String(now.getUTCMonth() + 1).padStart(2, '0')
            const d = String(now.getUTCDate()).padStart(2, '0')
            const hh = String(now.getUTCHours()).padStart(2, '0')
            const mm = String(now.getUTCMinutes()).padStart(2, '0')
            const ss = String(now.getUTCSeconds()).padStart(2, '0')
            setCurrentTime(`${y}-${m}-${d} ${hh}:${mm}:${ss}`)
        }
        updateClock()
        const timer = setInterval(updateClock, 1000)
        return () => clearInterval(timer)
    }, [])

    const showToast = useCallback((msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 3500)
    }, [])

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIndex(idx)
        showToast('คัดลอก URL เรียบร้อย')
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const toggleMute = (camId: string) => {
        setMutedStates(prev => ({ ...prev, [camId]: !prev[camId] }))
    }

    // Save camera configuration updates
    const handleSaveCamera = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCam) return
        setSaving(true)
        try {
            const res = await fetch('/api/cctv/cameras', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingCam),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update camera')

            setCameras(prev => prev.map(c => c.id === editingCam.id ? data.camera : c))
            showToast(`บันทึกการตั้งค่า ${editingCam.name} สำเร็จ`)
            setEditingCam(null)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก')
        } finally {
            setSaving(false)
        }
    }

    const activeCameras = cameras.filter(c => c.is_active)
    const displayedCameras = focusedCamId
        ? cameras.filter(c => c.id === focusedCamId)
        : activeCameras

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-14 text-white">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-lg shadow-blue-500/10">
                        <Cctv size={26} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                                กล้องวงจรปิด (CCTV)
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE · 4 จุด
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                            TP-Link Tapo C545D Dual-Lens 4K/2K · ศูนย์สังเกตการณ์ความปลอดภัยสำนักงาน EBCI
                        </p>
                    </div>
                </div>

                {/* Top Action Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View mode toggle (Grid vs Focus) */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center">
                        <button
                            type="button"
                            onClick={() => setFocusedCamId(null)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                                !focusedCamId
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                    : "text-white/60 hover:text-white"
                            )}
                            title="มุมมองรวม 4 กล้อง (Grid 2x2)"
                        >
                            <Grid2X2 size={14} />
                            <span>ตาราง 4 ช่อง</span>
                        </button>
                        {focusedCamId && (
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-blue-600 text-white shadow-md"
                            >
                                <Eye size={14} />
                                <span>กล้องเดี่ยว</span>
                            </button>
                        )}
                    </div>

                    {/* Stream Protocol Switcher */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center text-xs">
                        <button
                            type="button"
                            onClick={() => setStreamMode('snapshot')}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg font-medium transition-all",
                                streamMode === 'snapshot' ? "bg-white/20 text-white font-bold" : "text-white/50 hover:text-white"
                            )}
                            title="รีเฟรชภาพนิ่งอัตโนมัติ (ประหยัดแบนด์วิธ ไม่ต้องตั้งค่าเซิร์ฟเวอร์)"
                        >
                            📸 Snapshot
                        </button>
                        <button
                            type="button"
                            onClick={() => setStreamMode('webrtc')}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg font-medium transition-all",
                                streamMode === 'webrtc' ? "bg-white/20 text-white font-bold" : "text-white/50 hover:text-white"
                            )}
                            title="WebRTC (ความหน่วงต่ำ < 0.5s ผ่าน go2rtc/MediaMTX)"
                        >
                            ⚡ WebRTC
                        </button>
                        <button
                            type="button"
                            onClick={() => setStreamMode('hls')}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg font-medium transition-all",
                                streamMode === 'hls' ? "bg-white/20 text-white font-bold" : "text-white/50 hover:text-white"
                            )}
                            title="HLS สตรีมมาตรฐาน (.m3u8)"
                        >
                            📺 HLS
                        </button>
                    </div>

                    {/* Connection Guide Button */}
                    <button
                        type="button"
                        onClick={() => setShowGuide(true)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                        <HelpCircle size={15} className="text-amber-300" />
                        <span>คู่มือเชื่อมต่อ</span>
                    </button>
                </div>
            </div>

            {/* Quick Status Bar */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-white/70">
                    <div className="flex items-center gap-1.5">
                        <Radio size={14} className="text-emerald-400 animate-pulse" />
                        <span className="font-semibold text-white">สถานะระบบ:</span>
                        <span className="text-emerald-300">ทำงานปกติ (Online)</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <div className="hidden md:flex items-center gap-1.5">
                        <Layers size={14} className="text-blue-300" />
                        <span>รุ่นกล้อง:</span>
                        <span className="text-white font-medium">TP-Link Tapo C545D (4 ตัว)</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-white/50">โหมดแสดงผล:</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30 font-mono">
                        {streamMode.toUpperCase()}
                    </span>
                    {canManage && (
                        <span className="text-amber-200/80 text-[11px] ml-2">
                            (คลิกไอคอน ⚙️ ที่มุมขวากล้องเพื่อแก้ไขค่า IP/URL)
                        </span>
                    )}
                </div>
            </div>

            {/* Camera Feeds Grid */}
            <div className={cn(
                "grid gap-4 transition-all duration-300",
                focusedCamId
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2"
            )}>
                {displayedCameras.map((cam, idx) => (
                    <CameraCard
                        key={cam.id}
                        camera={cam}
                        index={idx}
                        currentTime={currentTime}
                        streamMode={streamMode}
                        isFocused={focusedCamId === cam.id}
                        isMuted={mutedStates[cam.id] ?? true}
                        canManage={canManage}
                        onToggleFocus={() => setFocusedCamId(focusedCamId === cam.id ? null : cam.id)}
                        onToggleMute={() => toggleMute(cam.id)}
                        onEdit={() => setEditingCam(cam)}
                        onShowToast={showToast}
                    />
                ))}
            </div>

            {/* Settings Modal (for Editing Camera URLs) */}
            {editingCam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-[#1e0f12] border border-white/20 shadow-2xl p-6 text-left space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-white">
                                <Settings size={20} className="text-blue-400" />
                                <h3 className="font-bold text-base">ตั้งค่ากล้อง: {editingCam.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingCam(null)}
                                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCamera} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-white/60 font-medium mb-1">ชื่อกล้อง</label>
                                <input
                                    type="text"
                                    value={editingCam.name}
                                    onChange={e => setEditingCam({ ...editingCam, name: e.target.value })}
                                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-blue-400 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-white/60 font-medium mb-1">ตำแหน่งติดตั้ง (Location)</label>
                                <input
                                    type="text"
                                    value={editingCam.location}
                                    onChange={e => setEditingCam({ ...editingCam, location: e.target.value })}
                                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 text-white focus:outline-none focus:border-blue-400 text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-white/60 font-medium mb-1">RTSP Stream 1 (Main HD)</label>
                                    <input
                                        type="text"
                                        placeholder="rtsp://admin:pass@IP:554/stream1"
                                        value={editingCam.stream_url || ''}
                                        onChange={e => setEditingCam({ ...editingCam, stream_url: e.target.value })}
                                        className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/60 font-medium mb-1">RTSP Stream 2 (Sub 360p)</label>
                                    <input
                                        type="text"
                                        placeholder="rtsp://admin:pass@IP:554/stream2"
                                        value={editingCam.sub_stream_url || ''}
                                        onChange={e => setEditingCam({ ...editingCam, sub_stream_url: e.target.value })}
                                        className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/60 font-medium mb-1">WebRTC (WHEP) Stream URL</label>
                                <input
                                    type="text"
                                    placeholder="http://<local-ip>:1984/api/webrtc?src=cam1"
                                    value={editingCam.webrtc_url || ''}
                                    onChange={e => setEditingCam({ ...editingCam, webrtc_url: e.target.value })}
                                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                                />
                                <span className="text-[11px] text-white/40">URL ที่แปลงผ่าน go2rtc หรือ MediaMTX ภายในเครือข่ายออฟฟิศ</span>
                            </div>

                            <div>
                                <label className="block text-white/60 font-medium mb-1">HLS Stream URL (.m3u8)</label>
                                <input
                                    type="text"
                                    placeholder="http://<local-ip>:1984/api/hls?src=cam1"
                                    value={editingCam.hls_url || ''}
                                    onChange={e => setEditingCam({ ...editingCam, hls_url: e.target.value })}
                                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-blue-400 font-mono text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-white/60 font-medium mb-1">หมายเหตุ / สเปกกล้อง</label>
                                <input
                                    type="text"
                                    value={editingCam.notes || ''}
                                    onChange={e => setEditingCam({ ...editingCam, notes: e.target.value })}
                                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-blue-400 text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setEditingCam(null)}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-medium transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Setup Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#1d0e11] border border-white/20 shadow-2xl p-6 sm:p-8 text-left space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                                    <HelpCircle size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">คู่มือเชื่อมต่อกล้อง Tapo C545D เข้า Nexus</h3>
                                    <p className="text-xs text-white/50">แนวทางการติดตั้งและสตรีมภาพโดยไม่กินแบนด์วิธ Vercel</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs sm:text-sm text-white/80 leading-relaxed">
                            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/25 p-4 space-y-2 text-amber-200">
                                <div className="flex items-center gap-2 font-bold text-amber-100">
                                    <Info size={16} />
                                    <span>หลักการสำคัญเรื่อง Web Streaming & Vercel</span>
                                </div>
                                <p className="text-xs text-amber-200/90 leading-relaxed">
                                    เว็บบราวเซอร์ทั่วไปไม่รองรับโปรโตคอล RTSP โดยตรง และ <strong>ห้ามส่ง Video Stream วิ่งผ่าน Vercel Serverless Function</strong> เพราะ Vercel มี Timeout (10–60 วิ) และคิดค่า Bandwidth (100 GB/mo limit) การเปิดกล้องสด 4 ตัวผ่าน Vercel จะทำให้โควต้าเต็มในเวลาไม่กี่วัน
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">1</span>
                                    เปิดใช้งาน Camera Account ในแอพ Tapo
                                </h4>
                                <p className="text-xs text-white/60 pl-8">
                                    1. เปิดแอพ Tapo ในมือถือ &gt; เลือกกล้อง C545D แต่ละตัว<br />
                                    2. ไปที่ <strong>Device Settings (ฟันเฟือง) &gt; Advanced Settings &gt; Camera Account</strong><br />
                                    3. ตั้ง Username และ Password สำหรับ RTSP (เช่น `admin` / `ebci1234`)
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">2</span>
                                    รูปแบบ RTSP URL ของ Tapo C545D
                                </h4>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs space-y-1.5 pl-8">
                                    <div className="flex items-center justify-between">
                                        <span className="text-emerald-300">rtsp://admin:password@192.168.1.xxx:554/stream1</span>
                                        <span className="text-[10px] text-white/40">(Main Stream 2K/4K คมชัดสูง)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-cyan-300">rtsp://admin:password@192.168.1.xxx:554/stream2</span>
                                        <span className="text-[10px] text-white/40">(Sub Stream 360p ลื่นไหล)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">3</span>
                                    ทางเลือกที่ 1: ติดตั้ง Local Media Server (go2rtc / MediaMTX) — แนะนำที่สุด!
                                </h4>
                                <p className="text-xs text-white/60 pl-8">
                                    ติดตั้ง <strong>go2rtc</strong> (ฟรี, ไฟล์เดียว, กินแรมน้อยมาก) บนเครื่องคอมพิวเตอร์ที่เปิดทิ้งไว้ที่ออฟฟิศ (เช่น Mini PC, เครื่อง welcome server หรือเครื่องสแกนบัตร HIP):
                                </p>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-[11px] text-white/70 pl-8 space-y-1">
                                    <p className="text-white/40"># ตัวอย่างไฟล์ config go2rtc.yaml</p>
                                    <p>streams:</p>
                                    <p>&nbsp;&nbsp;cam1: rtsp://admin:pass@192.168.1.101:554/stream2</p>
                                    <p>&nbsp;&nbsp;cam2: rtsp://admin:pass@192.168.1.102:554/stream2</p>
                                    <p>&nbsp;&nbsp;cam3: rtsp://admin:pass@192.168.1.103:554/stream2</p>
                                    <p>&nbsp;&nbsp;cam4: rtsp://admin:pass@192.168.1.104:554/stream2</p>
                                </div>
                                <p className="text-xs text-emerald-300 pl-8">
                                    ✓ WebRTC ให้ความหน่วงต่ำกว่า 0.5 วินาที ดูในแลนออฟฟิศได้ทันทีโดยไม่เสียเน็ตนอก หรือจะยิงผ่าน Cloudflare Tunnel เพื่อดูจากนอกออฟฟิศได้ฟรี!
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs">4</span>
                                    ทางเลือกที่ 2: ใช้แอพ Tapo App โดยตรง
                                </h4>
                                <p className="text-xs text-white/60 pl-8">
                                    หากยังไม่ได้ตั้ง go2rtc ผู้ใช้สามารถกดปุ่ม <strong>&ldquo;เปิดใน Tapo App&rdquo;</strong> หรือคัดลอก RTSP URL ไปเปิดใน VLC Player ได้ทันที
                                </p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                            >
                                เข้าใจแล้ว ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-5">
                    <Check size={16} />
                    <span>{toast}</span>
                </div>
            )}
        </div>
    )
}

function CameraCard({
    camera,
    index,
    currentTime,
    streamMode,
    isFocused,
    isMuted,
    canManage,
    onToggleFocus,
    onToggleMute,
    onEdit,
    onShowToast,
}: {
    camera: CctvCamera
    index: number
    currentTime: string
    streamMode: StreamMode
    isFocused: boolean
    isMuted: boolean
    canManage: boolean
    onToggleFocus: () => void
    onToggleMute: () => void
    onEdit: () => void
    onShowToast: (msg: string) => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [streamFailed, setStreamFailed] = useState(false)
    const [displayedSnapshot, setDisplayedSnapshot] = useState<string>('')
    const [retryTrigger, setRetryTrigger] = useState(0)

    // Reset stream failure flag on mode or camera change
    useEffect(() => {
        setStreamFailed(false)
    }, [streamMode, camera.id, camera.webrtc_url, camera.snapshot_url])

    const HTTPS_TUNNEL = 'https://painted-princeton-basename-mall.trycloudflare.com'

    // Helper to resolve URLs: normalize any trycloudflare.com or http:// URLs to the active HTTPS tunnel
    const resolveStreamUrl = useCallback((rawUrl: string | null | undefined, fallbackPath: string): string => {
        if (!rawUrl || rawUrl.trim().length === 0) {
            return `${HTTPS_TUNNEL}${fallbackPath}`
        }
        if (rawUrl.includes('.trycloudflare.com') || (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawUrl.startsWith('http://'))) {
            const pathAndQuery = rawUrl.replace(/^https?:\/\/[^/]+/, '')
            return `${HTTPS_TUNNEL}${pathAndQuery}`
        }
        return rawUrl
    }, [HTTPS_TUNNEL])

    // Double-buffered snapshot loading: keeps the previous frame on screen without flickering
    useEffect(() => {
        if (streamMode !== 'snapshot') return
        let isCancelled = false
        let timerId: ReturnType<typeof setTimeout>

        const fetchNextSnapshot = () => {
            if (isCancelled) return

            const rawUrl = camera.snapshot_url || `/api/frame.jpeg?src=cam${index + 1}`
            const fullUrl = resolveStreamUrl(rawUrl, `/api/frame.jpeg?src=cam${index + 1}`)
            const urlWithTime = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`

            const img = new Image()
            img.onload = () => {
                if (isCancelled) return
                setDisplayedSnapshot(urlWithTime)
                setStreamFailed(false)
                // Schedule next snapshot 4 seconds AFTER current snapshot finishes downloading
                timerId = setTimeout(fetchNextSnapshot, 4000)
            }
            img.onerror = () => {
                if (isCancelled) return
                // If we don't have any frame yet, mark as failed so placeholder displays
                setDisplayedSnapshot(prev => {
                    if (!prev) setStreamFailed(true)
                    return prev
                })
                // Retry in 4 seconds
                timerId = setTimeout(fetchNextSnapshot, 4000)
            }
            img.src = urlWithTime
        }

        fetchNextSnapshot()

        return () => {
            isCancelled = true
            if (timerId) clearTimeout(timerId)
        }
    }, [streamMode, camera.id, camera.snapshot_url, index, resolveStreamUrl, retryTrigger])

    // Capture camera snapshot
    const handleSnapshot = () => {
        onShowToast(`📸 บันทึกภาพ ${camera.name} สำเร็จ`)
    }

    const rawStreamHtml = camera.webrtc_url
        ? camera.webrtc_url.replace('/api/webrtc?src=', '/stream.html?src=')
        : `/stream.html?src=cam${index + 1}`
    const streamHtmlUrl = resolveStreamUrl(rawStreamHtml, `/stream.html?src=cam${index + 1}`)

    return (
        <div className={cn(
            "rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col transition-all",
            isFocused ? "ring-2 ring-blue-500/50" : "hover:border-white/25"
        )}>
            {/* Camera Viewport Area */}
            <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden group">
                {/* Simulated Feed Background with camera aesthetic grid */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* Live Stream / WebRTC Player */}
                {streamMode === 'webrtc' && !streamFailed ? (
                    <iframe
                        src={streamHtmlUrl}
                        title={camera.name}
                        className="w-full h-full border-0 object-cover bg-black"
                        allow="autoplay; fullscreen"
                        onError={() => setStreamFailed(true)}
                    />
                ) : streamMode === 'snapshot' && displayedSnapshot ? (
                    <img
                        src={displayedSnapshot}
                        alt={camera.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    /* Visual Feed Simulator / Offline State */
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className={cn(
                            "absolute inset-0 transition-opacity",
                            index === 0 ? "bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-950" :
                            index === 1 ? "bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950" :
                            index === 2 ? "bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950" :
                            "bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950"
                        )} />

                        {/* Motion Reticle */}
                        <div className="relative z-10 flex flex-col items-center gap-3">
                            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400/80 shadow-inner group-hover:scale-105 transition-transform">
                                <Cctv size={32} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white/90">{camera.name}</p>
                                <p className="text-xs text-white/50">{camera.location}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] text-white/70">
                                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                                <span>กำลังรอสัญญาณภาพ...</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setStreamFailed(false)
                                    setRetryTrigger(c => c + 1)
                                    onShowToast('กำลังเชื่อมต่อสัญญาณภาพใหม่...')
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/80 hover:bg-blue-600 text-[11px] font-semibold text-white border border-blue-400/40 shadow-md transition-colors"
                            >
                                <RefreshCw size={12} />
                                <span>ลองเชื่อมต่อใหม่ (Retry)</span>
                            </button>
                        </div>

                        {/* Lens crosshair markers */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full pointer-events-none opacity-40" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-blue-400/20 rounded-full pointer-events-none opacity-50" />
                    </div>
                )}

                {/* On-Screen Display (OSD) Overlays */}
                {/* Top-Left OSD: Camera ID & Name */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-mono">
                    <span className="font-bold text-amber-300">CAM 0{index + 1}</span>
                    <span className="text-white/40">|</span>
                    <span className="text-white/90 truncate max-w-[150px] sm:max-w-[200px]">{camera.name}</span>
                </div>

                {/* Top-Right OSD: Live Indicator & Clock */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span>LIVE</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-mono text-white/90 hidden sm:block">
                        {currentTime || '2026-10-08 09:50:00'}
                    </div>
                </div>

                {/* Bottom-Left OSD: Model & Stream Info */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 text-[11px] font-mono text-white/70 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-blue-300 font-bold">{camera.model}</span>
                    <span>•</span>
                    <span>Dual-Lens 4K</span>
                </div>

                {/* Bottom-Right OSD: Action Hover Controls */}
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/15 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={handleSnapshot}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        title="แคปภาพนิ่ง (Snapshot)"
                    >
                        <Camera size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleMute}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button
                        type="button"
                        onClick={onToggleFocus}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        title={isFocused ? "ย่อขนาดเป็นตาราง" : "ขยายดูตัวนี้เต็มจอ"}
                    >
                        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    {canManage && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="p-1.5 rounded-lg hover:bg-white/20 text-blue-300 hover:text-blue-200 transition-colors"
                            title="ตั้งค่า URL / IP กล้อง"
                        >
                            <Settings size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Camera Details & Quick Links Footer */}
            <div className="p-4 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                    <p className="font-semibold text-white flex items-center gap-1.5">
                        <span>{camera.name}</span>
                        <span className="text-[10px] text-white/40">({camera.location})</span>
                    </p>
                    <p className="text-[11px] text-white/50 line-clamp-1">{camera.notes}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Copy RTSP Button */}
                    {camera.stream_url && (
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(camera.stream_url || '')
                                onShowToast('คัดลอก RTSP URL แล้ว')
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white flex items-center gap-1.5 text-[11px] font-mono transition-colors"
                            title="คัดลอก RTSP Stream URL ไปเปิดใน VLC"
                        >
                            <Copy size={12} />
                            <span>RTSP</span>
                        </button>
                    )}

                    {/* Open in Tapo Button */}
                    <a
                        href="tapo://"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white flex items-center gap-1 text-[11px] font-medium transition-colors"
                        title="เปิดในแอพ Tapo บนอุปกรณ์นี้"
                    >
                        <ExternalLink size={12} />
                        <span>Tapo App</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
