'use client'

import { useState, useTransition } from 'react'
import { DoorOpen, Plus, X, Clock, Users, FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createBooking, cancelBooking } from './actions'
import type { RoomBooking } from './constants'
import { formatBangkokTime, formatBangkokDateTime } from '@/lib/datetime'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDateShort(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const day = d.getDate()
    const m = TH_MONTHS[d.getMonth()]
    return `${day} ${m}`
}

function formatTimeRange(startsAt: string, endsAt: string): string {
    return `${formatBangkokTime(startsAt)}-${formatBangkokTime(endsAt)}`
}

function isSameDay(a: string, b: string): boolean {
    const d1 = new Date(a)
    const d2 = new Date(b)
    return d1.getFullYear() === d2.getFullYear()
        && d1.getMonth() === d2.getMonth()
        && d1.getDate() === d2.getDate()
}

function todayDateInputValue(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function maxDateInputValue(daysAhead: number): string {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
    roomName: string
    horizonDays: number
    upcoming: RoomBooking[]
    mine: RoomBooking[]
    currentEmployeeId: string | null
    isHrAdmin: boolean
    /** When true the page renders as an HR audit view: hides "my bookings",
        relabels the main list as "ทุกการจอง", and surfaces cancelled rows
        too (employee mode only renders active upcoming bookings). */
    hrAuditMode?: boolean
}

export function MeetingRoomView({ roomName, horizonDays, upcoming, mine, currentEmployeeId, isHrAdmin, hrAuditMode = false }: Props) {
    const [showForm, setShowForm] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <DoorOpen className="w-6 h-6 text-amber-200" />
                        <h1 className="text-xl font-bold text-white">จองห้องประชุม</h1>
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                        {roomName} · จองล่วงหน้าได้ {horizonDays} วัน
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-[#561e23] font-bold text-sm shadow-lg active:scale-95 transition"
                >
                    <Plus className="w-4 h-4" /> จองห้อง
                </button>
            </div>

            {/* My bookings (if any) — hidden in HR audit view */}
            {!hrAuditMode && mine.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-white/85 font-semibold text-sm">การจองของฉัน</h2>
                    <div className="space-y-2">
                        {mine.map(b => (
                            <BookingRow
                                key={b.id}
                                booking={b}
                                canCancel={
                                    !b.cancelled_at
                                    && new Date(b.ends_at) > new Date()
                                    && (b.booked_by_employee_id === currentEmployeeId || isHrAdmin)
                                }
                                onCancelled={(msg) => showToast('success', msg)}
                                onError={(msg) => showToast('error', msg)}
                                tone="own"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming (everyone's) */}
            <section className="space-y-2">
                <h2 className="text-white/85 font-semibold text-sm">
                    {hrAuditMode
                        ? `ทุกการจอง (30 วันที่ผ่านมา + ${horizonDays} วันข้างหน้า)`
                        : `คิวห้องประชุม ${horizonDays} วันข้างหน้า`}
                </h2>
                {upcoming.length === 0 ? (
                    <div className="p-6 text-center text-white/55 text-sm" style={glass}>
                        {hrAuditMode ? 'ยังไม่มีรายการจองในช่วงนี้' : 'ยังไม่มีใครจอง — ห้องว่างทั้งสัปดาห์'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {upcoming.map(b => (
                            <BookingRow
                                key={b.id}
                                booking={b}
                                canCancel={
                                    !b.cancelled_at
                                    && new Date(b.ends_at) > new Date()
                                    && (b.booked_by_employee_id === currentEmployeeId || isHrAdmin)
                                }
                                onCancelled={(msg) => showToast('success', msg)}
                                onError={(msg) => showToast('error', msg)}
                                tone="public"
                            />
                        ))}
                    </div>
                )}
            </section>

            {showForm && (
                <BookingFormModal
                    horizonDays={horizonDays}
                    roomName={roomName}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); showToast('success', 'จองห้องเรียบร้อย') }}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {toast && (
                <div className="fixed inset-x-0 top-1/3 z-[100] flex justify-center pointer-events-none px-4">
                    <div
                        className="pointer-events-auto px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 max-w-md"
                        style={{
                            background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)',
                            color: 'white',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                        <div className="text-sm font-medium">{toast.msg}</div>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function BookingRow({
    booking,
    canCancel,
    onCancelled,
    onError,
    tone,
}: {
    booking: RoomBooking
    canCancel: boolean
    onCancelled: (msg: string) => void
    onError: (msg: string) => void
    tone: 'own' | 'public'
}) {
    const [pending, startTransition] = useTransition()
    const isCancelled = !!booking.cancelled_at
    const isPast = new Date(booking.ends_at) < new Date()

    const handleCancel = () => {
        if (!confirm(`ยกเลิกการจอง "${booking.title}"?`)) return
        startTransition(async () => {
            const res = await cancelBooking(booking.id)
            if (res.error) onError(res.error)
            else onCancelled('ยกเลิกเรียบร้อย')
        })
    }

    return (
        <div
            className="p-4 flex items-start gap-3"
            style={{
                ...glass,
                opacity: isCancelled || isPast ? 0.5 : 1,
                borderColor: tone === 'own' ? 'rgba(251,191,36,0.4)' : undefined,
            }}
        >
            <div
                className="shrink-0 w-14 text-center py-1.5 rounded-lg"
                style={{
                    background: tone === 'own' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)',
                    color: tone === 'own' ? '#fde68a' : '#ffffff',
                }}
            >
                <div className="text-xs font-medium opacity-80">{formatThaiDateShort(booking.starts_at)}</div>
                <div className="text-[11px] mt-0.5 opacity-70">
                    {isSameDay(booking.starts_at, booking.ends_at)
                        ? formatTimeRange(booking.starts_at, booking.ends_at)
                        : formatBangkokTime(booking.starts_at) + '...'}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-[15px] truncate">{booking.title}</div>
                <div className="text-white/65 text-xs mt-1 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> {booking.booked_by_name}
                </div>
                {booking.attendees && (
                    <div className="text-white/55 text-xs mt-1 truncate">
                        ผู้ร่วม: {booking.attendees}
                    </div>
                )}
                {booking.notes && (
                    <div className="text-white/55 text-xs mt-1 line-clamp-2">{booking.notes}</div>
                )}
                {isCancelled && (
                    <div className="text-rose-300 text-xs mt-1.5 font-medium">
                        ยกเลิกแล้ว{booking.cancelled_by_name ? ` โดย ${booking.cancelled_by_name}` : ''}
                    </div>
                )}
            </div>
            {canCancel && (
                <button
                    onClick={handleCancel}
                    disabled={pending}
                    className="shrink-0 p-2 rounded-lg text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                    title="ยกเลิกการจอง"
                >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            )}
        </div>
    )
}

function BookingFormModal({
    horizonDays,
    roomName,
    onClose,
    onSuccess,
    onError,
}: {
    horizonDays: number
    roomName: string
    onClose: () => void
    onSuccess: () => void
    onError: (msg: string) => void
}) {
    const [pending, startTransition] = useTransition()
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(todayDateInputValue())
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('10:00')
    const [attendees, setAttendees] = useState('')
    const [notes, setNotes] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { onError('กรอกหัวเรื่องการประชุม'); return }
        if (endTime <= startTime) { onError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม'); return }

        const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
        const endsAt = new Date(`${date}T${endTime}:00`).toISOString()

        startTransition(async () => {
            const res = await createBooking({ title, notes, attendees, startsAt, endsAt })
            if (res.error) onError(res.error)
            else onSuccess()
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
            style={{ background: 'rgba(47,0,0,0.5)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto"
                style={{
                    background: 'linear-gradient(160deg, rgba(86,30,35,0.95) 0%, rgba(107,34,40,0.95) 60%, rgba(139,53,64,0.95) 100%)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: '20px',
                }}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">จองห้องประชุม</h2>
                        <p className="text-white/65 text-xs mt-0.5">{roomName} · ล่วงหน้าได้ {horizonDays} วัน</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <Field label="หัวเรื่องการประชุม *" icon={<FileText className="w-4 h-4" />}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder="เช่น ประชุมประจำสัปดาห์"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                            required
                        />
                    </Field>

                    <Field label="วันที่ *" icon={<Clock className="w-4 h-4" />}>
                        <input
                            type="date"
                            value={date}
                            min={todayDateInputValue()}
                            max={maxDateInputValue(horizonDays)}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="เวลาเริ่ม *">
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                                required
                            />
                        </Field>
                        <Field label="เวลาสิ้นสุด *">
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                                required
                            />
                        </Field>
                    </div>

                    <Field label="ผู้ร่วมประชุม (ไม่บังคับ)" icon={<Users className="w-4 h-4" />}>
                        <input
                            type="text"
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            maxLength={500}
                            placeholder="พิมพ์ชื่อคั่นด้วยจุลภาค"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                        />
                    </Field>

                    <Field label="หมายเหตุ (ไม่บังคับ)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={1000}
                            rows={2}
                            placeholder="วาระ / อุปกรณ์ที่ต้องเตรียม"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[14px] resize-none"
                        />
                    </Field>
                </div>

                <div className="flex gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm active:scale-95 transition"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 text-[#561e23] font-bold text-sm active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {pending ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                    </button>
                </div>
            </form>
        </div>
    )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <label className="block">
            <div className="text-white/75 text-xs mb-1.5 flex items-center gap-1.5 font-medium">
                {icon}{label}
            </div>
            {children}
        </label>
    )
}
