'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react'
import type { LeaveRequestItem } from './types'

type Action = 'approve' | 'reject' | 'cancel'

interface Props {
    item: LeaveRequestItem | null
    action: Action | null
    onClose: () => void
    onConfirmed: () => void
}

const META: Record<Action, { title: string; verb: string; icon: typeof CheckCircle2; accent: string; needsReason: boolean }> = {
    approve: {
        title: 'บังคับอนุมัติ',
        verb: 'อนุมัติ',
        icon: CheckCircle2,
        accent: '#6ee7b7',
        needsReason: false,
    },
    reject: {
        title: 'บังคับปฏิเสธ',
        verb: 'ปฏิเสธ',
        icon: XCircle,
        accent: '#fca5a5',
        needsReason: true,
    },
    cancel: {
        title: 'ยกเลิกใบลา',
        verb: 'ยกเลิก',
        icon: Ban,
        accent: '#cbd5e1',
        needsReason: true,
    },
}

/**
 * Destructive-action confirmation modal. Requires a reason for reject
 * and cancel (matches force-action API validation) and warns that the
 * override bypasses the regular approval chain.
 */
export function ForceActionDialog({ item, action, onClose, onConfirmed }: Props) {
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!action) return
        setReason('')
        setError(null)
        setLoading(false)
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [action, loading, onClose])

    if (!item || !action) return null
    const meta = META[action]
    const Icon = meta.icon

    const submit = async () => {
        if (meta.needsReason && reason.trim().length < 5) {
            setError('กรุณาระบุเหตุผล (อย่างน้อย 5 ตัวอักษร)')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    action,
                    reason: meta.needsReason ? reason.trim() : undefined,
                }),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            onConfirmed()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !loading && onClose()} />
            <div
                role="dialog"
                aria-labelledby="force-action-title"
                className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.98) 0%, rgba(60,15,20,0.98) 60%, rgba(86,30,35,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                {/* Header */}
                <header className="px-5 py-4 border-b border-white/10 flex items-start gap-3">
                    <span
                        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${meta.accent}20`, color: meta.accent }}
                    >
                        <Icon size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                        <h2 id="force-action-title" className="text-white font-bold">{meta.title}</h2>
                        <p className="text-xs text-white/55 mt-0.5 font-mono">{item.reference_code ?? '—'}</p>
                    </div>
                    <button
                        onClick={() => !loading && onClose()}
                        disabled={loading}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <X size={15} />
                    </button>
                </header>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/10 border border-amber-300/20">
                        <AlertTriangle size={15} className="text-amber-300 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-100 leading-relaxed">
                            <strong>การ{meta.verb}นี้จะข้าม approval chain ปกติ</strong>
                            {' '}และบันทึกเป็นการกระทำของ HR ในประวัติของใบลา ยอด balance จะถูกปรับอัตโนมัติตามสถานะใหม่
                        </p>
                    </div>

                    <p className="text-sm text-white/75">
                        ใบลาของ <strong className="text-white">{item.employee?.nickname ?? item.employee?.first_name_th ?? '—'}</strong>
                        {' '}จะถูกเปลี่ยนสถานะเป็น <strong style={{ color: meta.accent }}>{meta.verb}</strong>.
                        คุณแน่ใจหรือไม่?
                    </p>

                    {meta.needsReason && (
                        <div>
                            <label className="block text-xs font-semibold text-white/65 mb-1.5">
                                เหตุผล <span className="text-red-300">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                disabled={loading}
                                rows={3}
                                placeholder="ระบุเหตุผลในการ..."
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 resize-none"
                            />
                            <p className="mt-1 text-[11px] text-white/40">{reason.trim().length} / 5 ตัวอักษรขั้นต่ำ</p>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-[#2a0a0e] shadow disabled:opacity-60 transition-colors"
                        style={{ background: meta.accent }}
                    >
                        {loading ? (
                            <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก</>
                        ) : (
                            <><Icon size={14} /> ยืนยัน{meta.verb}</>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    )
}
