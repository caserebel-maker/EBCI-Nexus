'use client'

import dynamic from 'next/dynamic'

const CheckinMap = dynamic(() => import('@/components/checkin/checkin-map').then(m => m.CheckinMap), { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-white/5 animate-pulse flex items-center justify-center text-white/40 text-sm">กำลังโหลดแผนที่...</div> })

import { useState, useEffect } from 'react'
import { MapPin, CheckCircle2, AlertCircle, Loader2, Home, Building, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkIn, checkOut } from './actions'
import { haversineDistance } from '@/lib/geo'

interface Office {
    name: string
    latitude: number
    longitude: number
    radius_meters: number
}

interface Checkin {
    id: string
    type: string
    latitude: number | null
    longitude: number | null
    accuracy_meters: number | null
    distance_from_office: number | null
    checked_in_at: string
    checked_out_at: string | null
    notes: string | null
}

interface Props {
    office: Office | null
    todayCheckin: Checkin | null
}

type GPSState = 'idle' | 'requesting' | 'success' | 'error'

export function CheckinView({ office, todayCheckin }: Props) {
    const [gpsState, setGpsState] = useState<GPSState>('idle')
    const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
    const [gpsError, setGpsError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const isCheckedIn = !!todayCheckin && !todayCheckin.checked_out_at
    const isFullyCheckedOut = !!todayCheckin && !!todayCheckin.checked_out_at

    // Auto-request GPS on mount (if not already checked in)
    useEffect(() => {
        if (!isCheckedIn) requestGPS()
    }, [isCheckedIn])

    function requestGPS() {
        if (!navigator.geolocation) {
            setGpsState('error')
            setGpsError('เบราว์เซอร์ไม่รองรับ GPS')
            return
        }
        setGpsState('requesting')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                })
                setGpsState('success')
                setGpsError(null)
            },
            (err) => {
                setGpsState('error')
                const messages: Record<number, string> = {
                    1: 'ถูกปฏิเสธสิทธิ์การเข้าถึงตำแหน่ง — กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์',
                    2: 'ไม่สามารถตรวจจับตำแหน่งได้ — ตรวจสอบว่า GPS เปิดอยู่',
                    3: 'หมดเวลารอตำแหน่ง',
                }
                setGpsError(messages[err.code] ?? err.message)
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        )
    }

    const distance = gps && office
        ? haversineDistance(gps.lat, gps.lng, office.latitude, office.longitude)
        : null
    const isAtOffice = distance !== null && office && distance <= office.radius_meters

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const handleCheckin = async (type: 'office' | 'wfh') => {
        if (type === 'office' && !gps) {
            showToast('error', 'กรุณารอระบบตรวจตำแหน่งก่อน')
            return
        }
        setLoading(true)
        const result = await checkIn({
            type,
            latitude: gps?.lat ?? null,
            longitude: gps?.lng ?? null,
            accuracy: gps?.accuracy ?? null,
        })
        setLoading(false)
        if (result.error) {
            showToast('error', result.error)
        } else {
            showToast('success', type === 'office' ? 'เช็คอินออฟฟิศสำเร็จ' : 'เช็คอิน WFH สำเร็จ')
            setTimeout(() => window.location.reload(), 1500)
        }
    }

    const handleCheckout = async () => {
        setLoading(true)
        const result = await checkOut()
        setLoading(false)
        if (result.error) {
            showToast('error', result.error)
        } else {
            showToast('success', 'เช็คเอาท์สำเร็จ')
            setTimeout(() => window.location.reload(), 1500)
        }
    }

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    'fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold',
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300 ring-1 ring-white/25">
                    <MapPin size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">เช็คอิน / เช็คเอาท์</h1>
                    <p className="text-sm text-white/50">บันทึกเวลาเข้า-ออกงาน</p>
                </div>
            </div>

            {/* Already checked in — show checkout UI */}
            {isCheckedIn ? (
                <div
                    className="rounded-2xl p-6 border border-emerald-500/40 bg-emerald-500/10"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 size={24} className="text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-sm text-emerald-200/70">เช็คอินแล้ว</p>
                            <p className="text-lg font-bold text-white">
                                {todayCheckin!.type === 'office' ? '🏢 ออฟฟิศ' : '🏠 WFH'}
                            </p>
                            <p className="text-xs text-white/50 mt-0.5">
                                {new Date(todayCheckin!.checked_in_at).toLocaleString('th-TH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                        เช็คเอาท์
                    </button>
                </div>
            ) : isFullyCheckedOut ? (
                <div
                    className="rounded-2xl p-6 border border-slate-500/40 bg-slate-500/10"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-full bg-slate-500/20 flex items-center justify-center">
                            <CheckCircle2 size={24} className="text-slate-300" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-200/70">เสร็จสิ้นการทำงานวันนี้แล้ว</p>
                            <p className="text-lg font-bold text-white">
                                {todayCheckin!.type === 'office' ? '🏢 ออฟฟิศ' : '🏠 WFH'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-1 text-sm">
                        <div className="flex justify-between text-white/70">
                            <span>เช็คอิน</span>
                            <span className="font-mono">
                                {new Date(todayCheckin!.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex justify-between text-white/70">
                            <span>เช็คเอาท์</span>
                            <span className="font-mono">
                                {new Date(todayCheckin!.checked_out_at!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-white/40 text-center mt-4">
                        ขอบคุณสำหรับการทำงานวันนี้ 🙏
                    </p>
                </div>
            ) : (
                <>
                    {/* Map */}
                    {office && (
                        <CheckinMap
                            officeLat={office.latitude}
                            officeLng={office.longitude}
                            officeName={office.name}
                            radiusMeters={office.radius_meters}
                            userLat={gps?.lat ?? null}
                            userLng={gps?.lng ?? null}
                            distanceMeters={gps && office ? Math.round(Math.sqrt(Math.pow((gps.lat - office.latitude) * 111000, 2) + Math.pow((gps.lng - office.longitude) * 111000 * Math.cos(office.latitude * Math.PI / 180), 2))) : null}
                        />
                    )}

                    {/* GPS status card */}
                    <div
                        className="rounded-2xl p-6 border border-white/10 bg-white/5"
                        style={{ backdropFilter: 'blur(8px)' }}
                    >
                        {gpsState === 'requesting' && (
                            <div className="flex items-center gap-3 text-white/70">
                                <Loader2 className="animate-spin" size={20} />
                                <span>กำลังตรวจตำแหน่งปัจจุบัน...</span>
                            </div>
                        )}

                        {gpsState === 'error' && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 text-red-300">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <span className="text-sm">{gpsError}</span>
                                </div>
                                <button
                                    onClick={requestGPS}
                                    className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        )}

                        {gpsState === 'success' && distance !== null && office && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-white/60">
                                    <MapPin size={14} />
                                    <span>ห่างจาก {office.name}: <strong className="text-white">{Math.round(distance)} เมตร</strong></span>
                                </div>
                                <div className="text-xs text-white/40">
                                    ความแม่นยำ: ±{Math.round(gps!.accuracy)} ม.
                                </div>
                                {isAtOffice ? (
                                    <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold pt-2">
                                        <CheckCircle2 size={16} />
                                        อยู่ในพื้นที่ออฟฟิศ
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold pt-2">
                                        <AlertCircle size={16} />
                                        อยู่นอกพื้นที่ออฟฟิศ (รัศมี {office.radius_meters} ม.)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Office checkin button */}
                    <button
                        onClick={() => handleCheckin('office')}
                        disabled={loading || gpsState !== 'success' || !isAtOffice}
                        className={cn(
                            "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border",
                            isAtOffice
                                ? "bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-500/40"
                                : "bg-white/5 text-white/40 border-white/10 cursor-not-allowed"
                        )}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Building size={18} />}
                        เช็คอินที่ออฟฟิศ
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 text-white/30 text-xs">
                        <div className="flex-1 h-px bg-white/10" />
                        <span>หรือ</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* WFH button */}
                    <button
                        onClick={() => handleCheckin('wfh')}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500/40 disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Home size={18} />}
                        เช็คอิน Work From Home
                    </button>

                    <p className="text-xs text-white/40 text-center">
                        ระบบจะบันทึกตำแหน่ง GPS เพื่อตรวจสอบการทำงาน
                    </p>
                </>
            )}
        </div>
    )
}
