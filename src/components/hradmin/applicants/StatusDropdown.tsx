'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    allowedTransitions,
    type ApplicantStatus,
    APPLICANT_STATUSES,
} from '@/lib/applicant-status'
import { StatusBadge, STATUS_META } from './StatusBadge'

interface Props {
    applicationId: string
    currentStatus: ApplicantStatus | string
    applicantEmail: string | null
}

/**
 * Button + dropdown lives in the detail header. Only renders the
 * targets that canTransition() allows from the current state, so
 * terminal states (hired/rejected) collapse to a disabled-looking
 * badge. Confirmation + optional note are collected in a small
 * inline panel before POSTing to /api/hradmin/applicants/[id]/status.
 */
export function StatusDropdown({ applicationId, currentStatus, applicantEmail }: Props) {
    const router = useRouter()
    const rootRef = useRef<HTMLDivElement | null>(null)

    const [open, setOpen] = useState(false)
    const [picked, setPicked] = useState<ApplicantStatus | null>(null)
    const [note, setNote] = useState('')
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    // close when clicking outside
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false)
                setPicked(null)
                setErr(null)
            }
        }
        window.addEventListener('mousedown', onClick)
        return () => window.removeEventListener('mousedown', onClick)
    }, [open])

    const transitions = allowedTransitions(currentStatus as ApplicantStatus)
    const isTerminal = transitions.length === 0 && APPLICANT_STATUSES.includes(currentStatus as ApplicantStatus)

    const submit = () => {
        if (!picked) return
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch(`/api/hradmin/applicants/${applicationId}/status`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ new_status: picked, notes: note.trim() || null }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'เปลี่ยนสถานะไม่สำเร็จ')
                setToast(
                    `เปลี่ยนเป็น ${STATUS_META[picked]?.label ?? picked}`
                    + (json.email_sent ? ' · ส่ง email แล้ว' : applicantEmail ? ' · email ส่งไม่สำเร็จ' : ''),
                )
                window.setTimeout(() => setToast(null), 5000)
                setOpen(false); setPicked(null); setNote('')
                router.refresh()
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ')
            }
        })
    }

    return (
        <div ref={rootRef} className="relative">
            {isTerminal ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <StatusBadge status={currentStatus} />
                    <span className="text-[11px] text-white/50">(ขั้นสุดท้าย)</span>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 transition-all',
                        open && 'bg-white/15',
                    )}
                >
                    <StatusBadge status={currentStatus} />
                    <ChevronDown size={14} className={cn('text-white/70 transition-transform', open && 'rotate-180')} />
                </button>
            )}

            {open && !isTerminal && (
                <div
                    className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-[#15040a] shadow-2xl z-50 overflow-hidden"
                >
                    {!picked ? (
                        <>
                            <div className="px-4 py-2.5 border-b border-white/10">
                                <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">เปลี่ยนสถานะเป็น</p>
                            </div>
                            <div className="flex flex-col">
                                {transitions.map(target => (
                                    <button
                                        key={target}
                                        type="button"
                                        onClick={() => setPicked(target)}
                                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <StatusBadge status={target} />
                                        <span className="text-xs text-white/50 ml-auto">เลือก →</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">ยืนยันการเปลี่ยน</span>
                                <StatusBadge status={picked} />
                            </div>
                            <p className="text-[13px] text-white/80">
                                เปลี่ยน <StatusBadge status={currentStatus} size="sm" /> → <StatusBadge status={picked} size="sm" />
                            </p>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-wider text-white/55 font-bold">หมายเหตุ (optional)</span>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={2}
                                    placeholder="เช่น รายละเอียดการสัมภาษณ์ / เหตุผลการตัดสินใจ"
                                    className="mt-1 w-full text-sm rounded-lg bg-black/25 border border-white/15 text-white px-2.5 py-2 focus:outline-none focus:border-amber-300/50"
                                />
                                <span className="text-[10px] text-white/40 inline-flex items-center gap-1 mt-1">
                                    <Mail size={10} />
                                    หมายเหตุจะแนบไปใน email ของผู้สมัคร
                                </span>
                            </label>
                            {err && (
                                <p className="text-red-300 text-xs inline-flex items-center gap-1.5">
                                    <AlertCircle size={12} />
                                    {err}
                                </p>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setPicked(null); setErr(null) }}
                                    disabled={pending}
                                    className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={pending}
                                    className="flex-1 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold inline-flex items-center justify-center gap-1.5"
                                >
                                    {pending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {toast && (
                <div
                    role="status"
                    className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl text-sm text-white font-semibold shadow-xl border border-emerald-400/40"
                    style={{ background: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)' }}
                >
                    <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                    {toast}
                </div>
            )}
        </div>
    )
}
