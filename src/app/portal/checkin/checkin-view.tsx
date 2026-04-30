'use client'

import dynamic from 'next/dynamic'

const CheckinMap = dynamic(() => import('@/components/checkin/checkin-map').then(m => m.CheckinMap), { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-white/5 animate-pulse flex items-center justify-center text-white/40 text-sm">กำลังโหลดแผนที่...</div> })

import { useState, useEffect } from 'react'
import { MapPin, CheckCircle2, AlertCircle, Loader2, Home, Building, LogOut, X, Briefcase, Palmtree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkIn, checkOut } from './actions'
import { haversineDistance } from '@/lib/geo'
import { formatBangkokTime, formatBangkokDateTime } from '@/lib/datetime'
import type { LeaveTodayInfo } from '@/lib/leave-today'

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
    /** §1.3 — set when the user has an approved/pending leave covering
     *  today. blocksCheckin=true (full-day approved) hides the CTA
     *  entirely; blocksCheckin=false renders a banner above the
     *  normal flow (half-day or pending). */
    leaveToday: LeaveTodayInfo | null
}

type GPSState = 'idle' | 'requesting' | 'success' | 'error'

export function CheckinView({ office, todayCheckin, leaveToday }: Props) {
    const [gpsState, setGpsState] = useState<GPSState>('idle')
    const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
    const [gpsError, setGpsError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    // Field check-in collects a destination note before submit. The whole
    // affordance lives behind a "ออกพื้นที่" button so the default flow
    // (office / WFH) stays one click.
    const [fieldMode, setFieldMode] = useState(false)
    const [fieldNote, setFieldNote] = useState('')
    const FIELD_NOTE_MIN = 5

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

    // Auto-dismiss after 5s. The dialog also gets a manual close button —
    // older staff sometimes want the message to stay until they tap it.
    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 5000)
    }

    const handleCheckin = async (type: 'office' | 'wfh' | 'field', notes?: string) => {
        if ((type === 'office' || type === 'field') && !gps) {
            showToast('error', 'กรุณารอระบบตรวจตำแหน่งก่อน')
            return
        }
        setLoading(true)
        const result = await checkIn({
            type,
            latitude: gps?.lat ?? null,
            longitude: gps?.lng ?? null,
            accuracy: gps?.accuracy ?? null,
            notes,
        })
        setLoading(false)
        if (result.error) {
            showToast('error', result.error)
        } else {
            const successMsg =
                type === 'office' ? 'เช็คอินออฟฟิศสำเร็จ'
              : type === 'wfh'    ? 'เช็คอิน WFH สำเร็จ'
              :                     'เช็คอินภาคสนามสำเร็จ'
            showToast('success', successMsg)
            setTimeout(() => window.location.reload(), 1500)
        }
    }

    const handleFieldSubmit = () => {
        const trimmed = fieldNote.trim()
        if (trimmed.length < FIELD_NOTE_MIN) {
            showToast('error', `กรุณาระบุปลายทาง/เหตุผลอย่างน้อย ${FIELD_NOTE_MIN} ตัวอักษร`)
            return
        }
        handleCheckin('field', trimmed)
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
            {/* Toast — centered modal-style dialog with backdrop. Replaces the
                old top-6 banner that overlapped the shell topbar (notification
                bell + language toggle). Auto-dismisses after 5s; tap backdrop
                or X to close earlier. */}
            {toast && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center px-6 animate-in fade-in duration-150"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
                    onClick={() => setToast(null)}
                    role="alertdialog"
                    aria-live="assertive"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={cn(
                            'relative w-full max-w-sm rounded-2xl shadow-2xl px-6 py-7 flex flex-col items-center text-center text-white animate-in zoom-in-95 duration-200',
                            toast.type === 'success'
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                                : 'bg-gradient-to-br from-red-500 to-red-700',
                        )}
                    >
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                            aria-label="ปิด"
                        >
                            <X size={18} />
                        </button>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
                            {toast.type === 'success'
                                ? <CheckCircle2 size={28} />
                                : <AlertCircle size={28} />}
                        </div>
                        <p className="text-base font-bold leading-snug">
                            {toast.msg}
                        </p>
                    </div>
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

            {/* §1.3 — full-day approved leave: suppress CTA entirely.
                Skip this branch if the user already managed to check in
                today (e.g. leave was approved AFTER they punched in) so
                the checkout button stays reachable. */}
            {leaveToday?.blocksCheckin && !isCheckedIn ? (
                <div
                    className="rounded-2xl p-6 border border-amber-400/40 bg-amber-500/10"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-amber-500/25 flex items-center justify-center">
                            <Palmtree size={24} className="text-amber-200" />
                        </div>
                        <div>
                            <p className="text-sm text-amber-200/80">วันนี้คุณลาอยู่</p>
                            <p className="text-lg font-bold text-white">
                                {leaveToday.leave_type_name ?? 'ลา'}
                            </p>
                            <p className="text-xs text-white/50 mt-0.5">
                                {leaveToday.start_date === leaveToday.end_date
                                    ? leaveToday.start_date
                                    : `${leaveToday.start_date} → ${leaveToday.end_date}`}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed">
                        ไม่ต้องเช็คอินวันนี้ — ระบบจะไม่นับว่าขาดงาน
                    </p>
                    <p className="text-xs text-white/50 leading-relaxed mt-2">
                        หากต้องการยกเลิกใบลา ให้ไปที่หน้า{' '}
                        <a href="/portal/leave" className="underline decoration-amber-300/50 hover:text-amber-200">
                            การลา
                        </a>{' '}แล้วกด &ldquo;ส่งคำขอยกเลิก&rdquo;
                    </p>
                </div>
            ) : isCheckedIn ? (
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
                                {todayCheckin!.type === 'office' ? '🏢 ออฟฟิศ'
                                  : todayCheckin!.type === 'field' ? '🚛 ภาคสนาม'
                                  : '🏠 WFH'}
                            </p>
                            <p className="text-xs text-white/50 mt-0.5">
                                {formatBangkokDateTime(todayCheckin!.checked_in_at)}
                            </p>
                        </div>
                    </div>
                    {/* Show the field-checkin note back to the user so they
                        remember what they declared this morning + give them
                        a chance to spot a typo before checkout. */}
                    {todayCheckin!.type === 'field' && todayCheckin!.notes && (
                        <div className="mb-4 rounded-lg p-3 bg-amber-500/10 border border-amber-400/25 text-sm">
                            <p className="text-amber-300/80 text-[11px] font-semibold uppercase tracking-wider mb-1">
                                ปลายทาง
                            </p>
                            <p className="text-amber-100">{todayCheckin!.notes}</p>
                        </div>
                    )}
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
                                {todayCheckin!.type === 'office' ? '🏢 ออฟฟิศ'
                                  : todayCheckin!.type === 'field' ? '🚛 ภาคสนาม'
                                  : '🏠 WFH'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-1 text-sm">
                        <div className="flex justify-between text-white/70">
                            <span>เช็คอิน</span>
                            <span className="font-mono">
                                {formatBangkokTime(todayCheckin!.checked_in_at)}
                            </span>
                        </div>
                        <div className="flex justify-between text-white/70">
                            <span>เช็คเอาท์</span>
                            <span className="font-mono">
                                {formatBangkokTime(todayCheckin!.checked_out_at)}
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-white/40 text-center mt-4">
                        ขอบคุณสำหรับการทำงานวันนี้ 🙏
                    </p>
                </div>
            ) : (
                <>
                    {/* §1.3 — informational banner when half-day approved
                        OR a leave is still pending. The user can still
                        check in (the other half / pre-approval slot is
                        normal work) but we want them to know. */}
                    {leaveToday && !leaveToday.blocksCheckin && (
                        <div className="rounded-xl p-4 border border-amber-400/30 bg-amber-500/10 flex items-start gap-3">
                            <Palmtree size={18} className="text-amber-200 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold text-amber-100">
                                    {leaveToday.is_half_day
                                        ? `วันนี้คุณลาครึ่งวัน${leaveToday.half_day_period === 'morning' ? 'เช้า' : 'บ่าย'} (${leaveToday.leave_type_name ?? 'ลา'})`
                                        : `ใบลา ${leaveToday.leave_type_name ?? ''} ของคุณยังรออนุมัติ`}
                                </p>
                                <p className="text-xs text-white/65 mt-0.5">
                                    {leaveToday.is_half_day
                                        ? 'อีกครึ่งวันยังต้องเช็คอินตามปกติ'
                                        : 'ถ้าใบลาได้รับอนุมัติก่อนสิ้นวัน ระบบจะไม่นับว่าขาดงาน'}
                                </p>
                            </div>
                        </div>
                    )}

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

                    {fieldMode ? (
                        /* Field check-in expansion — replaces the three
                           buttons with a focused note + confirm flow.
                           Hides Office/WFH so the user can't multi-pick
                           by mistake; cancel returns to the default. */
                        <div className="space-y-3 rounded-xl p-4 border border-amber-400/30 bg-amber-500/10">
                            <div className="flex items-center gap-2 text-amber-200">
                                <Briefcase size={18} />
                                <span className="font-semibold text-sm">เช็คอินภาคสนาม</span>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                                ระบุว่าวันนี้ออกไปทำอะไร / ที่ไหน — HR ใช้สำหรับตรวจสอบ
                            </p>
                            <textarea
                                value={fieldNote}
                                onChange={e => setFieldNote(e.target.value)}
                                placeholder='เช่น "ประชุมลูกค้า ABC ที่บางนา" หรือ "ส่งสินค้าโรงงาน XYZ"'
                                rows={3}
                                autoFocus
                                className="w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm px-3 py-2 focus:outline-none focus:border-amber-300/50 resize-none"
                            />
                            <div className="flex items-center justify-between text-[11px]">
                                <span className={cn(
                                    'transition-colors',
                                    fieldNote.trim().length >= FIELD_NOTE_MIN ? 'text-emerald-300' : 'text-white/40',
                                )}>
                                    {fieldNote.trim().length >= FIELD_NOTE_MIN
                                        ? '✓ ครบจำนวนตัวอักษรแล้ว'
                                        : `อย่างน้อย ${FIELD_NOTE_MIN} ตัวอักษร (ตอนนี้ ${fieldNote.trim().length})`}
                                </span>
                                {gpsState === 'success' && gps && (
                                    <span className="text-white/40">
                                        GPS ±{Math.round(gps.accuracy)} ม.
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => { setFieldMode(false); setFieldNote('') }}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white/85 border border-white/15 transition-colors disabled:opacity-60"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleFieldSubmit}
                                    disabled={loading || gpsState !== 'success' || fieldNote.trim().length < FIELD_NOTE_MIN}
                                    className="flex-[1.5] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-amber-500/85 hover:bg-amber-500 text-[#1a0a0d] border border-amber-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading
                                        ? <Loader2 className="animate-spin" size={16} />
                                        : <Briefcase size={16} />}
                                    ยืนยันเช็คอินภาคสนาม
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
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

                            {/* Field button — same row size as the others, amber
                                tone to match the HR Admin "preview" mode chip in
                                the sidebar. Visible to every employee on every
                                day (intentional: occasional office workers also
                                have customer meetings). */}
                            <button
                                onClick={() => setFieldMode(true)}
                                disabled={loading || gpsState !== 'success'}
                                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-amber-500/85 hover:bg-amber-500 text-[#1a0a0d] border border-amber-400/50 disabled:opacity-60"
                            >
                                <Briefcase size={18} />
                                เช็คอินภาคสนาม / ออกประชุม
                            </button>

                            <p className="text-xs text-white/40 text-center">
                                ระบบจะบันทึกตำแหน่ง GPS เพื่อตรวจสอบการทำงาน
                            </p>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
