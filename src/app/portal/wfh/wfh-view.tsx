'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
    Home, Plus, X, Loader2, AlertCircle, CheckCircle2, Info, Trash2,
    Calendar, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    type WfhRequest, type WfhStatus,
    WFH_STATUS_LABEL, WFH_STATUS_BADGE,
} from '@/lib/wfh-shared'

const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function formatThaiDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatThaiRange(start: string, end: string): string {
    if (start === end) return formatThaiDate(start)
    return `${formatThaiDate(start)} – ${formatThaiDate(end)}`
}
function todayBangkokIso(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(0, 10)
}
function daysInclusive(start: string, end: string): number {
    if (!start || !end) return 0
    const s = new Date(start + 'T00:00:00Z').getTime()
    const e = new Date(end + 'T00:00:00Z').getTime()
    if (isNaN(s) || isNaN(e) || e < s) return 0
    return Math.round((e - s) / 86_400_000) + 1
}

export function WfhView() {
    const [items, setItems] = useState<WfhRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const loadAll = useCallback(async () => {
        setErr(null)
        setLoading(true)
        try {
            const res = await fetch('/api/wfh/my', { cache: 'no-store' })
            if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
            const json = await res.json()
            setItems(json.items ?? [])
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void loadAll() }, [loadAll])

    const counts = useMemo(() => {
        const c: Record<WfhStatus | 'all', number> = {
            all: items.length, pending: 0, approved: 0, rejected: 0, cancelled: 0,
        }
        for (const r of items) c[r.status]++
        return c
    }, [items])

    const handleCancel = useCallback(async (r: WfhRequest) => {
        if (!confirm(`ยกเลิกใบขอ WFH ${r.reference_code}?`)) return
        const reason = prompt('เหตุผล (ไม่บังคับ):') ?? ''
        try {
            const res = await fetch(`/api/wfh/${r.id}/cancel`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() || null }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error ?? 'ยกเลิกไม่สำเร็จ')
            setToast(`ยกเลิก ${r.reference_code} แล้ว`)
            window.setTimeout(() => setToast(null), 3000)
            void loadAll()
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ')
        }
    }, [loadAll])

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                    <Home size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">ขอ WFH</h1>
                    <p className="text-sm text-white/50">ขอทำงานที่บ้าน — ส่งให้ผู้บังคับบัญชาอนุมัติ · ไม่ตัดยอดวันลา</p>
                </div>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {/* Action button */}
            <button
                type="button"
                onClick={() => setFormOpen(true)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)' }}
            >
                <Plus size={17} /> ส่งคำขอ WFH ใหม่
            </button>

            {/* Status summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <SummaryChip label="ทั้งหมด"     value={counts.all} />
                <SummaryChip label="รออนุมัติ"   value={counts.pending}   color="text-amber-200" />
                <SummaryChip label="อนุมัติแล้ว" value={counts.approved}  color="text-emerald-200" />
                <SummaryChip label="ปฏิเสธ"     value={counts.rejected}  color="text-rose-200" />
            </div>

            {/* History */}
            <div className="space-y-2">
                <h2 className="text-sm font-bold text-white/80">ประวัติคำขอ</h2>
                {loading ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-white/50 text-sm">
                        <Loader2 size={16} className="inline animate-spin mr-2" />
                        กำลังโหลด…
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-white/50 text-sm">
                        ยังไม่มีประวัติคำขอ WFH
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map(r => (
                            <RequestCard
                                key={r.id}
                                request={r}
                                onCancel={['pending','approved'].includes(r.status) ? () => handleCancel(r) : undefined}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {formOpen && (
                <NewWfhModal
                    onClose={() => setFormOpen(false)}
                    onSuccess={(msg) => {
                        setFormOpen(false)
                        setToast(msg)
                        void loadAll()
                        window.setTimeout(() => setToast(null), 5000)
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm shadow-2xl inline-flex items-center gap-2">
                    <CheckCircle2 size={16} /> {toast}
                </div>
            )}
        </div>
    )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <p className={cn('text-xl font-bold tabular-nums', color ?? 'text-white')}>{value}</p>
            <p className="text-[11px] text-white/55">{label}</p>
        </div>
    )
}

function RequestCard({ request: r, onCancel }: { request: WfhRequest; onCancel?: () => void }) {
    return (
        <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 flex-wrap">
                <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold',
                    WFH_STATUS_BADGE[r.status],
                )}>
                    {WFH_STATUS_LABEL[r.status]}
                </span>
                <p className="text-sm text-white">
                    <strong>{formatThaiRange(r.start_date, r.end_date)}</strong>
                    <span className="text-white/55"> · {Number(r.total_days)} วัน</span>
                </p>
                <span className="text-[11px] text-white/40 ml-auto">{r.reference_code}</span>
            </div>
            <p className="mt-1.5 text-sm text-white/80">{r.reason}</p>
            {r.contact_during_wfh && (
                <p className="mt-0.5 text-xs text-white/55">ติดต่อ: {r.contact_during_wfh}</p>
            )}
            {r.status === 'rejected' && r.rejection_reason && (
                <p className="mt-2 text-xs text-rose-200">เหตุผลปฏิเสธ: {r.rejection_reason}</p>
            )}
            {r.status === 'approved' && r.approval_notes && (
                <p className="mt-2 text-xs text-emerald-200">หมายเหตุผู้อนุมัติ: {r.approval_notes}</p>
            )}
            {r.status === 'cancelled' && r.cancellation_reason && (
                <p className="mt-2 text-xs text-white/45">เหตุผลยกเลิก: {r.cancellation_reason}</p>
            )}
            {onCancel && (
                <div className="mt-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-300 text-xs font-semibold"
                    >
                        <Trash2 size={12} /> ยกเลิกคำขอ
                    </button>
                </div>
            )}
        </li>
    )
}

function NewWfhModal({
    onClose, onSuccess,
}: {
    onClose: () => void
    onSuccess: (msg: string) => void
}) {
    const today = todayBangkokIso()
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [reason, setReason] = useState('')
    const [contact, setContact] = useState('')
    const [submitting, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    const totalDays = daysInclusive(startDate, endDate)
    const canSubmit = totalDays > 0 && reason.trim().length > 0 && totalDays <= 30

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    const handleSubmit = () => {
        if (!canSubmit) return
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/wfh/submit', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        startDate, endDate,
                        reason: reason.trim(),
                        contactDuringWfh: contact.trim() || null,
                    }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'ส่งคำขอไม่สำเร็จ')
                onSuccess(`ส่งคำขอ WFH เรียบร้อย · รหัส ${json.reference_code} · ส่งให้ ${json.approver_name}`)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'ส่งคำขอไม่สำเร็จ')
            }
        })
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto"
                style={{ background: 'rgba(86,30,35,0.77)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">ส่งคำขอ WFH</h2>
                    <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center" aria-label="ปิด">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                วันที่เริ่ม <span className="text-red-300">*</span>
                            </span>
                            <input
                                type="date"
                                value={startDate}
                                min={today}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                    if (e.target.value > endDate) setEndDate(e.target.value)
                                }}
                                className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                วันที่สิ้นสุด <span className="text-red-300">*</span>
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                            />
                        </label>
                    </div>

                    {totalDays > 0 && (
                        <div className="text-sm text-white/70 inline-flex items-center gap-2">
                            <Calendar size={14} /> รวม <strong className="text-white">{totalDays}</strong> วัน
                            {totalDays > 30 && <span className="text-rose-300 ml-1">(เกิน 30 วัน — แยกหลายคำขอ)</span>}
                        </div>
                    )}

                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            เหตุผล <span className="text-red-300">*</span>
                        </span>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="เช่น ช่างมาล้างแอร์ที่บ้าน · พาลูกหาหมอ · รอช่างซ่อม"
                            maxLength={500}
                            rows={3}
                            className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30 resize-none"
                        />
                    </label>

                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            ช่องทางติดต่อระหว่าง WFH (ไม่บังคับ)
                        </span>
                        <input
                            type="text"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="เช่น Line: ponds123 · มือถือ 081-xxx-xxxx"
                            maxLength={200}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30"
                        />
                    </label>

                    <div className="rounded-lg p-3 bg-blue-400/10 border border-blue-400/30 text-[11px] text-blue-100 inline-flex items-start gap-2 w-full">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        <span>คำขอจะส่งให้ผู้บังคับบัญชาตามสายงาน · เมื่ออนุมัติแล้ว สามารถเช็คอิน WFH ผ่านแอปได้ในวันที่กำหนด · ไม่ตัดยอดวันลา</span>
                    </div>

                    {err && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {err}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-bold active:scale-95"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ส่งคำขอ
                    </button>
                </div>
            </div>
        </div>
    )
}
