'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    MapPin, Save, Loader2, CheckCircle2, XCircle, CreditCard, Wifi, WifiOff,
    ShieldCheck, ChevronRight, History, Thermometer, Activity, RefreshCw,
    Cpu, MemoryStick, Clock3, MonitorCheck, KeyRound,
} from 'lucide-react'
import { updateOfficeLocation } from './actions'

interface Location {
    id: string
    latitude: number
    longitude: number
    radius_meters: number
    name: string
    is_active: boolean
}

interface SystemHealth {
    host_key: string
    host_name: string | null
    temperature_c: number | null
    temperature_source: string | null
    cpu_load_percent: number | null
    memory_used_percent: number | null
    uptime_seconds: number | null
    hip_running: boolean | null
    sync_loop_running: boolean | null
    power_status: string | null
    reported_at: string
}

type CardReaderSyncMode = 'manual' | 'auto_15min' | 'auto_1hour'

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return 'ยังไม่มีข้อมูล'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'ยังไม่มีข้อมูล'
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' })
}

function formatUptime(seconds: number | null): string {
    if (!seconds || seconds < 0) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days} วัน ${hours} ชม.`
    if (hours > 0) return `${hours} ชม. ${minutes} นาที`
    return `${minutes} นาที`
}

function classifyTemperature(temp: number | null): 'ok' | 'warning' | 'critical' | 'unknown' {
    if (temp === null) return 'unknown'
    if (temp >= 85) return 'critical'
    if (temp >= 75) return 'warning'
    return 'ok'
}

export function SettingsClient({ initialLocation, canManagePasswords }: { initialLocation: Location | null; canManagePasswords: boolean }) {
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
        syncMode: 'manual' as CardReaderSyncMode,
    })
    const [testing, setTesting] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
    const [healthLoading, setHealthLoading] = useState(true)
    const [healthError, setHealthError] = useState<string | null>(null)
    const [healthCheckedAt, setHealthCheckedAt] = useState(0)

    const loadSystemHealth = useCallback(async () => {
        setHealthError(null)
        try {
            const res = await fetch('/api/hradmin/system/health', { cache: 'no-store' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
            setSystemHealth(json.health ?? null)
        } catch (err) {
            setHealthError(err instanceof Error ? err.message : 'โหลดสถานะเครื่องไม่สำเร็จ')
        } finally {
            setHealthCheckedAt(new Date().getTime())
            setHealthLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSystemHealth()
        const timer = window.setInterval(loadSystemHealth, 30_000)
        return () => window.clearInterval(timer)
    }, [loadSystemHealth])

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
                {canManagePasswords && (
                    <Link
                        href="/hradmin/settings/password-requests"
                        className="group flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] hover:border-emerald-300/30 transition-all"
                    >
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-200 shrink-0">
                            <KeyRound size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-white">คำขอเปลี่ยนรหัสผ่าน</p>
                            <p className="text-[12px] text-white/55 leading-snug">ตรวจสอบ อนุมัติ หรือปฏิเสธคำขอจากพนักงาน</p>
                        </div>
                        <ChevronRight size={16} className="text-white/40 group-hover:text-emerald-300 transition-colors" />
                    </Link>
                )}
                <Link
                    href="/hradmin/settings/permissions"
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] hover:border-amber-300/30 transition-all"
                >
                    <div className="h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-200 shrink-0">
                        <ShieldCheck size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-white">สิทธิ์การเข้าถึงระบบ</p>
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

            {/* Office Sync Machine Health */}
            <SystemHealthCard
                health={systemHealth}
                loading={healthLoading}
                error={healthError}
                now={healthCheckedAt}
                onRefresh={loadSystemHealth}
            />

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
                            {([
                                { value: 'manual', label: 'Manual', desc: 'กด sync เอง' },
                                { value: 'auto_15min', label: 'Auto 15 นาที', desc: 'sync อัตโนมัติ' },
                                { value: 'auto_1hour', label: 'Auto 1 ชั่วโมง', desc: 'sync รายชั่วโมง' },
                            ] satisfies Array<{ value: CardReaderSyncMode; label: string; desc: string }>).map((mode) => (
                                <button
                                    key={mode.value}
                                    onClick={() => setCardReader({ ...cardReader, syncMode: mode.value })}
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

function SystemHealthCard({
    health,
    loading,
    error,
    now,
    onRefresh,
}: {
    health: SystemHealth | null
    loading: boolean
    error: string | null
    now: number
    onRefresh: () => void
}) {
    const tempStatus = classifyTemperature(health?.temperature_c ?? null)
    const reportedAt = health?.reported_at ? new Date(health.reported_at) : null
    const ageMs = reportedAt && !Number.isNaN(reportedAt.getTime()) && now > 0 ? now - reportedAt.getTime() : null
    const isFresh = ageMs !== null && ageMs < 10 * 60 * 1000
    const statusLabel = !health
        ? 'ยังไม่มีข้อมูล'
        : isFresh
            ? 'ออนไลน์'
            : 'ข้อมูลเก่า'
    const statusClass = !health
        ? 'bg-white/10 text-white/60 border-white/15'
        : isFresh
            ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/35'
            : 'bg-amber-500/20 text-amber-100 border-amber-500/35'
    const tempClass = tempStatus === 'critical'
        ? 'text-red-200'
        : tempStatus === 'warning'
            ? 'text-amber-200'
            : tempStatus === 'ok'
                ? 'text-emerald-200'
                : 'text-white/65'

    return (
        <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div className="flex items-start sm:items-center gap-3 mb-5 pb-3 border-b border-white/15">
                <div className="h-8 w-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white shrink-0">
                    <Thermometer size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-[16px] font-bold text-white">สุขภาพเครื่อง Sync ที่ออฟฟิศ</h2>
                    <p className="text-[12px] text-white/60">
                        อุณหภูมิและสถานะเครื่องที่รัน HIP TIME + Nexus sync
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${statusClass}`}>
                        <MonitorCheck size={12} />
                        {statusLabel}
                    </span>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/75 flex items-center justify-center transition-all"
                        title="รีเฟรช"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] bg-red-500/20 text-red-100 border border-red-500/40">
                    <XCircle size={14} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <HealthMetric
                    icon={Thermometer}
                    label="อุณหภูมิ"
                    value={
                        health?.temperature_c !== null && health?.temperature_c !== undefined
                            ? `${Number(health.temperature_c).toFixed(1)}°C`
                            : loading
                                ? 'กำลังโหลด'
                                : 'อ่านไม่ได้'
                    }
                    detail={health?.temperature_source ?? 'Windows ยังไม่ส่งค่า sensor'}
                    valueClassName={tempClass}
                />
                <HealthMetric
                    icon={Cpu}
                    label="CPU"
                    value={health?.cpu_load_percent !== null && health?.cpu_load_percent !== undefined ? `${Number(health.cpu_load_percent).toFixed(0)}%` : '—'}
                    detail="โหลดเครื่องตอนรายงานล่าสุด"
                />
                <HealthMetric
                    icon={MemoryStick}
                    label="RAM"
                    value={health?.memory_used_percent !== null && health?.memory_used_percent !== undefined ? `${Number(health.memory_used_percent).toFixed(0)}%` : '—'}
                    detail="หน่วยความจำที่ใช้อยู่"
                />
                <HealthMetric
                    icon={Clock3}
                    label="เปิดมาแล้ว"
                    value={formatUptime(health?.uptime_seconds ?? null)}
                    detail={health?.power_status ?? '—'}
                />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                <StatusPill label="HIP TIME" ok={health?.hip_running === true} unknown={!health} />
                <StatusPill label="Nexus sync loop" ok={health?.sync_loop_running === true} unknown={!health} />
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/55">
                    อัปเดตล่าสุด: <span className="text-white/80 font-semibold">{formatDateTime(health?.reported_at)}</span>
                </div>
            </div>

            {tempStatus === 'warning' && (
                <p className="mt-3 text-[12px] text-amber-100 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                    เครื่องเริ่มร้อน ควรเช็กช่องลม/พัดลม และลดโปรแกรมที่ไม่จำเป็น
                </p>
            )}
            {tempStatus === 'critical' && (
                <p className="mt-3 text-[12px] text-red-100 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    อุณหภูมิสูงมาก ควรเช็กการระบายอากาศทันทีเพื่อป้องกันเครื่องดับหรือ sync หลุด
                </p>
            )}
        </div>
    )
}

function HealthMetric({
    icon: Icon,
    label,
    value,
    detail,
    valueClassName = 'text-white',
}: {
    icon: typeof Thermometer
    label: string
    value: string
    detail: string
    valueClassName?: string
}) {
    return (
        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/55 text-[12px] font-semibold mb-2">
                <Icon size={13} />
                {label}
            </div>
            <p className={`text-[24px] font-bold tabular-nums ${valueClassName}`}>{value}</p>
            <p className="text-[11px] text-white/45 mt-1 truncate" title={detail}>{detail}</p>
        </div>
    )
}

function StatusPill({ label, ok, unknown }: { label: string; ok: boolean; unknown?: boolean }) {
    const className = unknown
        ? 'bg-white/5 border-white/10 text-white/55'
        : ok
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100'
            : 'bg-red-500/15 border-red-500/30 text-red-100'
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${className}`}>
            {ok ? <CheckCircle2 size={13} /> : <Activity size={13} />}
            <span className="font-semibold">{label}</span>
            <span className="ml-auto">{unknown ? 'รอข้อมูล' : ok ? 'ทำงาน' : 'ไม่ทำงาน'}</span>
        </div>
    )
}
