'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Save, Loader2, CheckCircle2, XCircle, CreditCard, Wifi, WifiOff, ShieldCheck, ChevronRight, History } from 'lucide-react'
import { updateOfficeLocation } from './actions'

interface Location {
    id: string
    latitude: number
    longitude: number
    radius_meters: number
    name: string
    is_active: boolean
}

export function SettingsClient({ initialLocation }: { initialLocation: Location | null }) {
    const [form, setForm] = useState({
        id: initialLocation?.id,
        name: initialLocation?.name ?? 'EBCI Office',
        latitude: initialLocation?.latitude ?? 13.7563,
        longitude: initialLocation?.longitude ?? 100.5018,
        radius_meters: initialLocation?.radius_meters ?? 50,
    })

    const [cardReader, setCardReader] = useState({
        ip: '192.168.1.40',
        port: 5005,
        syncMode: 'manual' as 'manual' | 'auto_15min' | 'auto_1hour',
    })
    const [testing, setTesting] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        const res = await updateOfficeLocation(form)
        setSaving(false)
        if (res.error) {
            setMessage({ type: 'error', text: res.error })
        } else {
            setMessage({ type: 'success', text: 'บันทึกเรียบร้อย' })
            setTimeout(() => setMessage(null), 3000)
        }
    }

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'เบราว์เซอร์ไม่รองรับ GPS' })
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm({
                    ...form,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                })
                setMessage({ type: 'success', text: 'ดึงพิกัดปัจจุบันสำเร็จ' })
                setTimeout(() => setMessage(null), 3000)
            },
            (err) => setMessage({ type: 'error', text: err.message })
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-[22px] font-bold text-white">ตั้งค่าระบบ</h1>
                <p className="text-[14px] text-white/60 mt-1">จัดการการตั้งค่าออฟฟิศและระบบ</p>
            </div>

            {/* Quick links — sub-pages live under this settings tree */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                    href="/hradmin/settings/permissions"
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] hover:border-amber-300/30 transition-all"
                >
                    <div className="h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-200 shrink-0">
                        <ShieldCheck size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-white">สิทธิ์ผู้ใช้</p>
                        <p className="text-[12px] text-white/55 leading-snug">มอบ/ถอน permission ให้ทีมงาน · มี audit log</p>
                    </div>
                    <ChevronRight size={16} className="text-white/40 group-hover:text-amber-300 transition-colors" />
                </Link>

                <Link
                    href="/hradmin/settings/audit"
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] hover:border-rose-300/30 transition-all"
                >
                    <div className="h-10 w-10 rounded-lg bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-200 shrink-0">
                        <History size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-white">Audit log</p>
                        <p className="text-[12px] text-white/55 leading-snug">ประวัติการเปลี่ยนสิทธิ์ + แก้ข้อมูลพนักงาน</p>
                    </div>
                    <ChevronRight size={16} className="text-white/40 group-hover:text-rose-300 transition-colors" />
                </Link>
            </div>

            {/* Office Location Card */}
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/15">
                    <div className="h-8 w-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white shrink-0">
                        <MapPin size={16} />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-white">ตำแหน่งออฟฟิศ</h2>
                        <p className="text-[12px] text-white/60">พิกัดและรัศมีสำหรับเช็คอิน</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-[13px] font-medium text-white/75 mb-1.5">ชื่อออฟฟิศ</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 text-white text-[15px] px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-white/50 outline-none transition-all"
                        />
                    </div>

                    {/* Lat + Lng grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[13px] font-medium text-white/75 mb-1.5">Latitude</label>
                            <input
                                type="number"
                                step="0.00000001"
                                value={form.latitude}
                                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                                className="w-full bg-white/10 border border-white/20 text-white text-[15px] px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-white/50 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-white/75 mb-1.5">Longitude</label>
                            <input
                                type="number"
                                step="0.00000001"
                                value={form.longitude}
                                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                                className="w-full bg-white/10 border border-white/20 text-white text-[15px] px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-white/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Use current location button */}
                    <button
                        onClick={useCurrentLocation}
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-semibold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <MapPin size={14} />
                        ใช้ตำแหน่งปัจจุบัน (ต้องอยู่ที่ออฟฟิศ)
                    </button>

                    {/* Radius */}
                    <div>
                        <label className="block text-[13px] font-medium text-white/75 mb-1.5">
                            รัศมีการเช็คอิน: <span className="text-amber-300 font-bold">{form.radius_meters} เมตร</span>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={form.radius_meters}
                            onChange={(e) => setForm({ ...form, radius_meters: parseInt(e.target.value) })}
                            className="w-full accent-amber-400"
                        />
                        <div className="flex justify-between text-[11px] text-white/50 mt-1">
                            <span>10m</span>
                            <span>100m</span>
                            <span>250m</span>
                            <span>500m</span>
                        </div>
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-[#561e23] to-[#ad5f6c] hover:from-[#ad5f6c] hover:to-[#c47080] text-white font-bold py-2.5 px-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[15px]"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>

                    {/* Message */}
                    {message && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] ${
                            message.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
                                : 'bg-red-500/20 text-red-100 border border-red-500/40'
                        }`}>
                            {message.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Card Reader Settings */}
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/15">
                    <div className="h-8 w-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white shrink-0">
                        <CreditCard size={16} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[16px] font-bold text-white">เครื่องแตะบัตร HIP Ci100S</h2>
                        <p className="text-[12px] text-white/60">ตั้งค่าการเชื่อมต่อและ sync ข้อมูล</p>
                    </div>
                    {connectionStatus === 'connected' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 text-[11px] font-semibold">
                            <Wifi size={12} /> เชื่อมต่อ
                        </div>
                    )}
                    {connectionStatus === 'disconnected' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-100 text-[11px] font-semibold">
                            <WifiOff size={12} /> ขาดการเชื่อมต่อ
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {/* IP + Port */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[13px] font-medium text-white/75 mb-1.5">IP Address</label>
                            <input
                                type="text"
                                value={cardReader.ip}
                                onChange={(e) => setCardReader({ ...cardReader, ip: e.target.value })}
                                placeholder="192.168.1.40"
                                className="w-full bg-white/10 border border-white/20 text-white text-[15px] px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-white/50 outline-none transition-all font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-white/75 mb-1.5">Port</label>
                            <input
                                type="number"
                                value={cardReader.port}
                                onChange={(e) => setCardReader({ ...cardReader, port: parseInt(e.target.value) || 5005 })}
                                placeholder="5005"
                                className="w-full bg-white/10 border border-white/20 text-white text-[15px] px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-white/50 outline-none transition-all font-mono"
                            />
                        </div>
                    </div>

                    {/* Sync Mode */}
                    <div>
                        <label className="block text-[13px] font-medium text-white/75 mb-1.5">โหมดการ Sync</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'manual', label: 'Manual', desc: 'กด sync เอง' },
                                { value: 'auto_15min', label: 'Auto 15 นาที', desc: 'sync อัตโนมัติ' },
                                { value: 'auto_1hour', label: 'Auto 1 ชั่วโมง', desc: 'sync รายชั่วโมง' },
                            ].map((mode) => (
                                <button
                                    key={mode.value}
                                    onClick={() => setCardReader({ ...cardReader, syncMode: mode.value as any })}
                                    className={`p-3 rounded-lg border transition-all text-left ${
                                        cardReader.syncMode === mode.value
                                            ? 'bg-amber-500/20 border-amber-400/50 ring-2 ring-amber-400/30'
                                            : 'bg-white/5 border-white/15 hover:bg-white/10'
                                    }`}
                                >
                                    <div className={`text-[13px] font-bold ${cardReader.syncMode === mode.value ? 'text-amber-200' : 'text-white'}`}>
                                        {mode.label}
                                    </div>
                                    <div className="text-[11px] text-white/50 mt-0.5">{mode.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Test Connection */}
                    <button
                        onClick={() => {
                            setTesting(true)
                            setConnectionStatus('idle')
                            // Mock test — real implementation จะเชื่อม HIP SDK
                            setTimeout(() => {
                                setTesting(false)
                                setConnectionStatus('disconnected')
                                setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อได้ - ต้องทดสอบจาก network ของออฟฟิศ' })
                                setTimeout(() => setMessage(null), 4000)
                            }, 1500)
                        }}
                        disabled={testing}
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-semibold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {testing ? <Loader2 className="animate-spin" size={14} /> : <Wifi size={14} />}
                        {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                    </button>

                    <div className="text-[11px] text-white/50 text-center pt-2 border-t border-white/10">
                        💡 การเชื่อมต่อ HIP Ci100S ต้อง run จาก network เดียวกันกับเครื่อง (192.168.1.x)
                    </div>
                </div>
            </div>
        </div>
    )
}
