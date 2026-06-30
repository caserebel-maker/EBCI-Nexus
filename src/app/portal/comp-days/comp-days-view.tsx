'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
    CalendarHeart, CheckCircle2, AlertCircle, Loader2, Info, X, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    type CompDayRow, type CompDaySummary, type CompDayStatus,
    COMP_DAY_STATUS_LABEL, COMP_DAY_STATUS_BADGE,
} from '@/lib/comp-days-shared'

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** Compute status from a row — mirrors lib/comp-days.computeStatus
 *  (kept inline here so the client doesn't have to round-trip just
 *  to label a row's badge). */
function computeStatus(r: CompDayRow, today: string): CompDayStatus {
    if (r.voided_at) return 'voided'
    if (r.used_on) return 'used'
    if (r.expires_at && r.expires_at <= today) return 'expired'
    return 'available'
}

function todayBangkokIso(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(0, 10)
}

export function CompDaysView() {
    const [items, setItems] = useState<CompDayRow[]>([])
    const [summary, setSummary] = useState<CompDaySummary>({
        available: 0, used: 0, expired: 0, voided: 0, total: 0,
    })
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [useModalOpen, setUseModalOpen] = useState(false)

    const loadAll = useCallback(async () => {
        setErr(null)
        setLoading(true)
        try {
            const res = await fetch('/api/portal/comp-days', { cache: 'no-store' })
            if (!res.ok) throw new Error('โหลดวันหยุดสะสมไม่สำเร็จ')
            const json = await res.json()
            setItems(json.items ?? [])
            setSummary(json.summary ?? { available: 0, used: 0, expired: 0, voided: 0, total: 0 })
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void loadAll() }, [loadAll])

    const today = useMemo(() => todayBangkokIso(), [])

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <CalendarHeart size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">วันหยุดสะสม</h1>
                    <p className="text-sm text-white/50">วันที่ทำงานในวันหยุด → สะสมไว้แลกหยุดวันอื่น (ไม่ตัดยอดลา)</p>
                </div>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {/* Balance card */}
            <div className="rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <p className="text-sm text-white/60">วันหยุดสะสมที่ใช้ได้</p>
                <div className="mt-2 flex items-end gap-3">
                    <p className="text-5xl font-bold text-white tabular-nums">{summary.available}</p>
                    <p className="text-lg text-white/50 mb-1">วัน</p>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-white/60">
                    <span>ใช้แล้ว <strong className="text-sky-200">{summary.used}</strong></span>
                    {summary.expired > 0 && <span>หมดอายุ <strong className="text-amber-200">{summary.expired}</strong></span>}
                    <span>รวมตลอด <strong>{summary.total}</strong></span>
                </div>
                <button
                    type="button"
                    onClick={() => setUseModalOpen(true)}
                    disabled={loading || summary.available === 0}
                    className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#15803d 0%,#22c55e 100%)' }}
                >
                    <CheckCircle2 size={16} />
                    ใช้สิทธิ์หยุดงาน
                </button>
                <div className="mt-4 rounded-xl p-3 bg-white/5 border border-white/10 text-xs text-white/70 space-y-1">
                    <p className="font-bold text-amber-300 inline-flex items-center gap-1">
                        <Info size={13} />
                        ข้อกำหนดสำคัญเพื่อรักษาสิทธิ์ของท่าน:
                    </p>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] leading-relaxed text-white/80">
                        <li>หากต้องมาทำงานในวันหยุด <strong>ต้องแจ้ง HR ทุกครั้ง</strong> เพื่อทำการบันทึกสิทธิ์สะสมวันหยุดเข้าสู่ระบบ</li>
                        <li>สิทธิ์วันหยุดสะสมที่ได้รับ <strong>ต้องใช้ภายใน 90 วัน</strong> นับจากวันที่มาทำงานในวันหยุดนั้นๆ (หากเกินกำหนดสิทธิ์จะหมดอายุอัตโนมัติ)</li>
                    </ul>
                </div>
            </div>

            {/* History list */}
            <div className="space-y-2">
                <h2 className="text-sm font-bold text-white/80">ประวัติทั้งหมด</h2>
                {loading ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-white/50 text-sm">
                        <Loader2 size={16} className="inline animate-spin mr-2" />
                        กำลังโหลด…
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-white/50 text-sm">
                        ยังไม่มีรายการวันหยุดสะสม
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map(r => (
                            <CompDayRowCard key={r.id} row={r} today={today} />
                        ))}
                    </ul>
                )}
            </div>

            {useModalOpen && (
                <UseCompDayModal
                    onClose={() => setUseModalOpen(false)}
                    onSuccess={(msg) => {
                        setUseModalOpen(false)
                        setToast(msg)
                        void loadAll()
                        window.setTimeout(() => setToast(null), 5000)
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm shadow-2xl inline-flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {toast}
                </div>
            )}
        </div>
    )
}

function getDaysUntilExpiry(expiresAt: string, today: string): number {
    const exp = new Date(expiresAt + 'T00:00:00')
    const t = new Date(today + 'T00:00:00')
    const diffTime = exp.getTime() - t.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function CompDayRowCard({ row, today }: { row: CompDayRow; today: string }) {
    const status = computeStatus(row, today)

    let countdownText = ''
    let countdownStyle = ''
    if (row.expires_at && status === 'available') {
        const daysLeft = getDaysUntilExpiry(row.expires_at, today)
        if (daysLeft <= 0) {
            countdownText = 'หมดอายุแล้ววันนี้'
            countdownStyle = 'text-rose-300 bg-rose-500/15 border-rose-500/25 font-semibold'
        } else if (daysLeft <= 7) {
            countdownText = `เหลืออีก ${daysLeft} วัน (ด่วนมาก!)`
            countdownStyle = 'text-rose-200 bg-rose-500/20 border-rose-500/30 font-bold animate-pulse'
        } else if (daysLeft <= 30) {
            countdownText = `เหลืออีก ${daysLeft} วัน`
            countdownStyle = 'text-orange-300 bg-orange-500/15 border-orange-500/25 font-semibold'
        } else {
            countdownText = `เหลืออีก ${daysLeft} วัน`
            countdownStyle = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20 font-semibold'
        }
    }

    return (
        <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold',
                        COMP_DAY_STATUS_BADGE[status],
                    )}>
                        {COMP_DAY_STATUS_LABEL[status]}
                    </span>
                    <p className="text-sm text-white">
                        ทำงานเมื่อ <strong>{formatThaiDate(row.worked_on)}</strong>
                    </p>
                </div>
                {row.expires_at && status === 'available' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs',
                        countdownStyle,
                    )}>
                        <Clock size={12} />
                        <span>{countdownText} (หมดอายุ {formatThaiDate(row.expires_at)})</span>
                    </span>
                )}
            </div>
            {row.earned_reason && (
                <p className="mt-1.5 text-xs text-white/55">เหตุผล: {row.earned_reason}</p>
            )}
            {row.used_on && (
                <p className="mt-1.5 text-xs text-sky-200/80">
                    ใช้เป็นวันหยุดเมื่อ <strong>{formatThaiDate(row.used_on)}</strong>
                    {row.used_note && ` · ${row.used_note}`}
                </p>
            )}
            {row.voided_at && (
                <p className="mt-1.5 text-xs text-white/40">
                    ยกเลิกโดย HR{row.voided_reason && ` — ${row.voided_reason}`}
                </p>
            )}
        </li>
    )
}

function UseCompDayModal({
    onClose, onSuccess,
}: {
    onClose: () => void
    onSuccess: (msg: string) => void
}) {
    const [useOn, setUseOn] = useState(todayBangkokIso())
    const [note, setNote] = useState('')
    const [submitting, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

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
        if (!useOn) {
            setErr('กรุณาเลือกวันที่จะใช้')
            return
        }
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/portal/comp-days', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ useOn, note: note.trim() || null }),
                })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error ?? 'บันทึกไม่สำเร็จ')
                onSuccess(`ใช้วันหยุดสะสมสำหรับวันที่ ${formatThaiDate(useOn)}`)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
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
                className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto"
                style={{ background: 'rgba(86,30,35,0.77)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">ใช้สิทธิ์หยุดงาน</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
                        aria-label="ปิด"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            วันที่จะใช้เป็นวันหยุด <span className="text-red-300">*</span>
                        </span>
                        <input
                            type="date"
                            value={useOn}
                            onChange={(e) => setUseOn(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            หมายเหตุ (ไม่บังคับ)
                        </span>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="เช่น ไปธุระต่างจังหวัด"
                            maxLength={200}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30"
                        />
                    </label>
                    <div className="rounded-lg p-3 bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-100 inline-flex items-start gap-2 w-full">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        <span>ใช้แล้วยกเลิกเองไม่ได้ — ติดต่อ HR ถ้าจำเป็น. ระบบจะหยิบสิทธิ์ที่ใกล้หมดอายุที่สุดก่อน.</span>
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
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-bold active:scale-95"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ยืนยันใช้สิทธิ์
                    </button>
                </div>
            </div>
        </div>
    )
}
