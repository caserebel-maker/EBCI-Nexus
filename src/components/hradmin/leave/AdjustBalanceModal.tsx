'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, AlertTriangle, Pencil, Check } from 'lucide-react'
import type { BalanceCell, EmployeeRowLite, LeaveTypeLite } from './types'

interface Props {
    open: boolean
    onClose: () => void
    onSaved: () => void
    employee: EmployeeRowLite | null
    leaveTypes: LeaveTypeLite[]
    cells: Record<string, BalanceCell>  // leave_type_id → cell
    year: number
    /** When set, only this row is editable; other rows render read-only. */
    focusTypeId?: string | null
}

/**
 * HR balance adjustment modal.
 *
 * Only `total_days` is editable per (employee, type). `used_days` and
 * `pending_days` come from the leave-request flow and must not be
 * touched here — changing them would lie about the real consumption
 * history. `remaining` is always derived.
 *
 * Every save requires a ≥10-char reason. The API appends a one-line
 * audit entry to the balance row's `notes` column so every change is
 * recoverable from the database alone.
 */
export function AdjustBalanceModal({
    open, onClose, onSaved, employee, leaveTypes, cells, year, focusTypeId,
}: Props) {
    const [mounted, setMounted] = useState(false)
    const [reason, setReason] = useState('')
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => setMounted(true), [])

    // Seed draft values from the current cells whenever the modal opens.
    useEffect(() => {
        if (!open) return
        setError(null)
        setReason('')
        setSubmitting(false)
        const next: Record<string, string> = {}
        for (const t of leaveTypes) {
            const c = cells[t.id]
            next[t.id] = String(c?.total_days ?? 0)
        }
        setDrafts(next)
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
        window.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee?.id])

    // What changed vs. original cells? Only dirty rows are PATCHed.
    const diffs = useMemo(() => {
        const list: Array<{
            leaveTypeId: string
            existingId: string | null
            oldTotal: number
            newTotal: number
        }> = []
        for (const t of leaveTypes) {
            const raw = drafts[t.id]
            if (raw === undefined) continue
            const parsed = parseFloat(raw)
            if (!Number.isFinite(parsed) || parsed < 0) continue
            const c = cells[t.id]
            const oldTotal = Number(c?.total_days ?? 0)
            if (Math.abs(parsed - oldTotal) < 0.001) continue
            list.push({
                leaveTypeId: t.id,
                existingId: c?.id ?? null,
                oldTotal,
                newTotal: parsed,
            })
        }
        return list
    }, [drafts, cells, leaveTypes])

    const hasChange = diffs.length > 0
    const canSave = hasChange && reason.trim().length >= 10

    const warnings = useMemo(() => {
        const list: string[] = []
        for (const d of diffs) {
            const c = cells[d.leaveTypeId]
            const consumed = Number(c?.used_days ?? 0) + Number(c?.pending_days ?? 0)
            if (d.newTotal < consumed) {
                const label = leaveTypes.find(t => t.id === d.leaveTypeId)?.name_th ?? d.leaveTypeId
                list.push(`${label}: ยอดรวมใหม่ (${d.newTotal}) น้อยกว่าที่ใช้ไปแล้ว + pending (${consumed})`)
            }
        }
        return list
    }, [diffs, cells, leaveTypes])

    const submit = async () => {
        if (!canSave || !employee) return
        setSubmitting(true)
        setError(null)
        try {
            // Fire PATCH per dirty row sequentially — each call appends its
            // own audit line so the order is deterministic.
            for (const d of diffs) {
                const res = await fetch('/api/hradmin/leave/balances', {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        balance_id: d.existingId,       // null → upsert a new row
                        employee_id: employee.id,
                        leave_type_id: d.leaveTypeId,
                        year,
                        total_days: d.newTotal,
                        reason: reason.trim(),
                    }),
                })
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    throw new Error(j?.error ?? `HTTP ${res.status} — ${d.leaveTypeId}`)
                }
            }
            onSaved()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSubmitting(false)
        }
    }

    if (!mounted || !open || !employee) return null

    const content = (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && onClose()} />
            <div
                role="dialog"
                aria-labelledby="adjust-balance-title"
                className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.98) 0%, rgba(60,15,20,0.98) 60%, rgba(86,30,35,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                {/* Header */}
                <header className="px-4 sm:px-5 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
                    <span className="h-9 w-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
                        <Pencil size={15} className="text-amber-200" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <h2 id="adjust-balance-title" className="text-white font-bold truncate">
                            ปรับยอดวันลา — {employee.nickname ?? employee.first_name_th ?? '—'}
                        </h2>
                        <p className="text-[11px] text-white/50 mt-0.5 truncate">
                            {employee.department ?? '—'}
                            {employee.position ? ` · ${employee.position}` : ''}
                            {employee.approval_level ? ` · L${employee.approval_level}` : ''}
                            {` · ปี ${year + 543} (${year})`}
                        </p>
                    </div>
                    <button
                        onClick={() => !submitting && onClose()}
                        disabled={submitting}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <X size={15} />
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="text-[10px] font-bold uppercase tracking-wider text-white/45 bg-white/[0.03]">
                                <tr>
                                    <th className="text-left px-3 py-2">ประเภท</th>
                                    <th className="text-center px-2 py-2 w-24">Total</th>
                                    <th className="text-center px-2 py-2 w-16">Used</th>
                                    <th className="text-center px-2 py-2 w-20">Pending</th>
                                    <th className="text-center px-2 py-2 w-20">Remain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {leaveTypes.map(t => {
                                    const cell = cells[t.id]
                                    const used = Number(cell?.used_days ?? 0)
                                    const pending = Number(cell?.pending_days ?? 0)
                                    const draft = drafts[t.id] ?? '0'
                                    const draftNum = parseFloat(draft)
                                    const total = Number.isFinite(draftNum) && draftNum >= 0 ? draftNum : 0
                                    const remain = Math.max(0, total - used - pending)
                                    const disabled = focusTypeId ? focusTypeId !== t.id : false
                                    const color = t.color ?? '#f9c5cd'
                                    return (
                                        <tr key={t.id} className={disabled ? 'opacity-60' : ''}>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-1.5 h-5 rounded-full shrink-0"
                                                        style={{ background: color }}
                                                    />
                                                    <span className="text-white/85 font-semibold">{t.name_th}</span>
                                                    {cell?.is_manually_adjusted && (
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full bg-violet-400"
                                                            title={cell.last_adjusted_by_name ? `ปรับโดย ${cell.last_adjusted_by_name}` : 'ปรับแต่งเอง'}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    disabled={disabled || submitting}
                                                    value={draft}
                                                    onChange={e => setDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                                                    className="w-20 h-9 px-2 text-center rounded-lg bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 tabular-nums disabled:opacity-50"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center text-white/75 tabular-nums">{used}</td>
                                            <td className="px-2 py-2 text-center text-white/60 tabular-nums">{pending}</td>
                                            <td className="px-2 py-2 text-center font-semibold tabular-nums" style={{ color }}>
                                                {remain}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {warnings.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-300/20 space-y-1">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-300" />
                                <p className="text-xs font-bold text-amber-100">คำเตือน</p>
                            </div>
                            {warnings.map((w, i) => (
                                <p key={i} className="text-[11px] text-amber-100/90 leading-relaxed">• {w}</p>
                            ))}
                            <p className="text-[11px] text-amber-100/70 mt-1">
                                ระบบยังอนุญาตให้บันทึก แต่อาจแสดงยอดคงเหลือติดลบในการแสดงผล
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-white/65 mb-1.5">
                            เหตุผลในการปรับ <span className="text-red-300">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            disabled={submitting}
                            rows={3}
                            placeholder="เช่น พนักงานผ่านโปรครบปี ได้พักร้อนเพิ่ม / ปรับตามนโยบายใหม่ 2569"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 resize-none"
                        />
                        <p className="mt-1 text-[11px] text-white/40">
                            {reason.trim().length} / 10 ตัวอักษรขั้นต่ำ
                        </p>
                    </div>

                    {error && (
                        <p className="text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    {/* Audit trail preview — show existing notes if any */}
                    {leaveTypes.some(t => cells[t.id]?.notes) && (
                        <details className="rounded-lg border border-white/10 bg-white/[0.03]">
                            <summary className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/75">
                                ประวัติการปรับ
                            </summary>
                            <div className="px-3 pb-3 space-y-2">
                                {leaveTypes.map(t => {
                                    const c = cells[t.id]
                                    if (!c?.notes) return null
                                    return (
                                        <div key={t.id}>
                                            <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider mb-1">{t.name_th}</p>
                                            <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono leading-relaxed bg-black/20 rounded p-2 border border-white/5">
                                                {c.notes}
                                            </pre>
                                        </div>
                                    )
                                })}
                            </div>
                        </details>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-4 sm:px-5 py-4 border-t border-white/10 flex items-center justify-between gap-2 shrink-0 bg-white/[0.02]">
                    <p className="text-[11px] text-white/55">
                        {hasChange
                            ? <>จะปรับ <strong className="text-white">{diffs.length}</strong> ประเภท</>
                            : 'ยังไม่มีการเปลี่ยนแปลง'}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={submit}
                            disabled={!canSave || submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-[#2a0a0e] shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
                        >
                            {submitting ? (
                                <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก</>
                            ) : (
                                <><Check size={14} /> บันทึก</>
                            )}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
