'use client'

import { useCallback, useState, useTransition } from 'react'
import {
    ClipboardCheck, CheckCircle2, XCircle, Loader2, AlertCircle, Home,
    Calendar, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WfhRequest } from '@/lib/wfh-shared'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'

interface EnrichedWfh extends WfhRequest {
    applicant_name: string
    applicant_nickname: string | null
    applicant_department: string | null
}

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

export function WfhInboxView({
    items: initialItems,
    focusRef = null,
}: {
    items: EnrichedWfh[]
    focusRef?: string | null
}) {
    const [items, setItems] = useState(initialItems)
    const [decideTarget, setDecideTarget] = useState<EnrichedWfh | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [err, setErr] = useState<string | null>(null)

    const handleDecided = useCallback((id: string, msg: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
        setDecideTarget(null)
        setToast(msg)
        window.setTimeout(() => setToast(null), 4000)
    }, [])

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                    <ClipboardCheck size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">อนุมัติคำขอ WFH</h1>
                    <p className="text-sm text-white/50">รายการรออนุมัติจากทีมที่คุณดูแล · {items.length} รายการ</p>
                </div>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-emerald-300 mb-2" />
                    <p className="text-sm text-white/65">ไม่มีคำขอรออนุมัติ</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {items.map(r => {
                        const isFocused = focusRef === r.reference_code
                        return (
                            <li
                                key={r.id}
                                className={cn(
                                    'rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors',
                                    isFocused && 'border-amber-300/70 bg-amber-400/10 shadow-[0_0_0_1px_rgba(252,211,77,0.35)]',
                                )}
                            >
                                <div className="flex items-start gap-3 flex-wrap">
                                    <Home size={16} className="text-blue-300 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">
                                            {r.applicant_name}
                                            {r.applicant_nickname && (
                                                <span className="text-white/55 font-normal"> ({r.applicant_nickname})</span>
                                            )}
                                        </p>
                                        {r.applicant_department && (
                                            <p className="text-[11px] text-white/50">{r.applicant_department}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isFocused && (
                                            <span className="rounded-md bg-amber-300/20 px-2 py-1 text-[10px] font-bold text-amber-100">
                                                จากอีเมล
                                            </span>
                                        )}
                                        <span className="text-[11px] text-white/45">{r.reference_code}</span>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm text-white/85 flex-wrap">
                                    <Calendar size={13} className="text-white/55" />
                                    <strong>{formatThaiRange(r.start_date, r.end_date)}</strong>
                                    <span className="text-white/55"> · {Number(r.total_days)} วัน</span>
                                </div>
                                <p className="mt-2 text-sm text-white/80 leading-snug">เหตุผล: {r.reason}</p>
                                {r.contact_during_wfh && (
                                    <p className="text-xs text-white/55 mt-0.5">ติดต่อ: {r.contact_during_wfh}</p>
                                )}
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDecideTarget(r)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold active:scale-95"
                                    >
                                        <CheckCircle2 size={14} /> อนุมัติ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDecideTarget({ ...r, status: 'rejected' as const })}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-sm font-semibold"
                                    >
                                        <XCircle size={14} /> ปฏิเสธ
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {decideTarget && (
                <DecisionModal
                    request={decideTarget}
                    initialDecision={decideTarget.status === 'rejected' ? 'reject' : 'approve'}
                    onClose={() => setDecideTarget(null)}
                    onError={(msg) => setErr(msg)}
                    onDecided={handleDecided}
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

function DecisionModal({
    request: r, initialDecision, onClose, onError, onDecided,
}: {
    request: EnrichedWfh
    initialDecision: 'approve' | 'reject'
    onClose: () => void
    onError: (msg: string) => void
    onDecided: (id: string, msg: string) => void
}) {
    const confirm = useConfirmDialog()
    const [decision, setDecision] = useState<'approve' | 'reject'>(initialDecision)
    const [note, setNote] = useState('')
    const [submitting, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (decision === 'reject' && !note.trim()) {
            setErr('กรุณาระบุเหตุผลที่ปฏิเสธ')
            return
        }
        if (decision === 'reject') {
            const ok = await confirm({
                title: 'ยืนยันปฏิเสธคำขอ WFH?',
                body: 'ผู้ขอจะได้รับแจ้งผล และจะไม่สามารถเช็คอิน WFH ในช่วงวันที่ขอนี้',
                summary: (
                    <div className="space-y-1">
                        <p>👤 {r.applicant_name}{r.applicant_nickname ? ` (${r.applicant_nickname})` : ''}</p>
                        <p>🏠 WFH · {formatThaiRange(r.start_date, r.end_date)}</p>
                        <p>📝 {r.reason.length > 90 ? `${r.reason.slice(0, 90)}…` : r.reason}</p>
                    </div>
                ),
                confirmLabel: 'ปฏิเสธ',
                variant: 'destructive',
            })
            if (!ok) return
        }
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch(`/api/wfh/${r.id}/decision`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ decision, note: note.trim() || null }),
                })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error ?? 'บันทึกไม่สำเร็จ')
                onDecided(
                    r.id,
                    decision === 'approve'
                        ? `อนุมัติ ${r.reference_code} แล้ว`
                        : `ปฏิเสธ ${r.reference_code} แล้ว`,
                )
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
                setErr(msg)
                onError(msg)
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
                    <h2 className="text-lg font-bold text-white">
                        {decision === 'approve' ? 'อนุมัติคำขอ WFH' : 'ปฏิเสธคำขอ WFH'}
                    </h2>
                    <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center" aria-label="ปิด">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-3">
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                        <p className="text-white font-semibold">{r.applicant_name}{r.applicant_nickname && <span className="text-white/55 font-normal"> ({r.applicant_nickname})</span>}</p>
                        <p className="text-white/70 mt-1">{formatThaiRange(r.start_date, r.end_date)} · {Number(r.total_days)} วัน</p>
                        <p className="text-white/70 mt-1">เหตุผล: {r.reason}</p>
                    </div>

                    {/* Toggle: หากเข้ามาจากปุ่มไหน ก็ยังเปลี่ยนใจได้ */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setDecision('approve')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors',
                                decision === 'approve'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/5 text-white/55 hover:bg-white/10'
                            )}
                        >
                            <CheckCircle2 size={14} /> อนุมัติ
                        </button>
                        <button
                            type="button"
                            onClick={() => setDecision('reject')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors',
                                decision === 'reject'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/5 text-white/55 hover:bg-white/10'
                            )}
                        >
                            <XCircle size={14} /> ปฏิเสธ
                        </button>
                    </div>

                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            หมายเหตุ {decision === 'reject' && <span className="text-red-300">*</span>}
                        </span>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={decision === 'approve' ? 'เช่น "อนุมัติ — รบกวน online ตามเวลา"' : 'เช่น "วันนี้มีประชุมต้องเข้าออฟฟิศ"'}
                            maxLength={500}
                            rows={3}
                            className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30 resize-none"
                        />
                    </label>

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
                        className={cn(
                            'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white text-sm font-bold active:scale-95 disabled:opacity-50',
                            decision === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                        )}
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ยืนยัน{decision === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
                    </button>
                </div>
            </div>
        </div>
    )
}
