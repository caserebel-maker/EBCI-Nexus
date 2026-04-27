'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    X, Loader2, AlertTriangle, Users, Check, ArrowRight, RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveTypeLite } from './types'

interface Props {
    open: boolean
    onClose: () => void
    onApplied: (msg: string) => void
    leaveTypes: LeaveTypeLite[]
    departments: string[]
    year: number
}

type ActionKey = 'set_total' | 'add_total' | 'reset_used'
type ScopeMode = 'all' | 'departments' | 'levels'

interface PreviewResp {
    success: true
    affected: number
    unchanged?: number
    sample: Array<{
        employee_id: string
        employee_code: string | null
        name: string
        department: string | null
        old_total: number
        new_total: number
        old_used: number
        new_used: number
        pending: number
        new_remaining: number
    }>
}

const ACTIONS: Array<{ key: ActionKey; label: string; hint: string; needsValue: boolean }> = [
    { key: 'set_total',  label: 'ตั้งยอดรวม',     hint: 'เซ็ตยอด total_days = ค่าที่ระบุ', needsValue: true },
    { key: 'add_total',  label: 'เพิ่มยอดรวม',    hint: 'เพิ่ม total_days อีก N วัน',     needsValue: true },
    { key: 'reset_used', label: 'รีเซ็ตที่ใช้ไป', hint: 'used_days = 0 (ขึ้นปีใหม่)',      needsValue: false },
]

const LEVELS = [5, 4, 3, 2, 1]

/**
 * Bulk balance adjuster — opens from the Tab 3 action bar.
 * Two-step flow:
 *   1. Configure (leave type, action, value, scope, reason)
 *   2. Preview — server returns how many rows will change + a sample
 *   3. Apply — server upserts every row, appends bulk audit line
 *
 * Apply is gated behind a successful preview so HR can sanity-check
 * the affected count before mutating data.
 */
export function BulkAdjustModal({
    open, onClose, onApplied, leaveTypes, departments, year,
}: Props) {
    const [mounted, setMounted] = useState(false)
    const [leaveTypeId, setLeaveTypeId] = useState('')
    const [action, setAction] = useState<ActionKey>('set_total')
    const [value, setValue] = useState('10')
    const [scopeMode, setScopeMode] = useState<ScopeMode>('all')
    const [departmentScope, setDepartmentScope] = useState<string[]>([])
    const [levelScope, setLevelScope] = useState<number[]>([])
    const [reason, setReason] = useState('')
    const [preview, setPreview] = useState<PreviewResp | null>(null)
    const [busy, setBusy] = useState<'idle' | 'previewing' | 'applying'>('idle')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => setMounted(true), [])

    // Reset state on open
    useEffect(() => {
        if (!open) return
        setLeaveTypeId(leaveTypes[0]?.id ?? '')
        setAction('set_total')
        setValue('10')
        setScopeMode('all')
        setDepartmentScope([])
        setLevelScope([])
        setReason('')
        setPreview(null)
        setBusy('idle')
        setError(null)
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && busy !== 'applying') onClose() }
        window.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const actionMeta = ACTIONS.find(a => a.key === action)!
    const valueNum = parseFloat(value)
    const valueValid = !actionMeta.needsValue || (Number.isFinite(valueNum) && valueNum >= 0)

    const canPreview = leaveTypeId
        && valueValid
        && (scopeMode !== 'departments' || departmentScope.length > 0)
        && (scopeMode !== 'levels' || levelScope.length > 0)

    const canApply = canPreview
        && preview !== null
        && preview.affected > 0
        && reason.trim().length >= 10

    const buildBody = (mode: 'preview' | 'apply') => ({
        mode,
        year,
        leave_type_id: leaveTypeId,
        action,
        value: actionMeta.needsValue ? valueNum : undefined,
        reason: mode === 'apply' ? reason.trim() : undefined,
        scope:
            scopeMode === 'all'         ? { all: true }
            : scopeMode === 'departments' ? { departments: departmentScope }
            :                             { levels: levelScope },
    })

    const runPreview = async () => {
        setBusy('previewing')
        setError(null)
        setPreview(null)
        try {
            const res = await fetch('/api/hradmin/leave/balances/bulk', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(buildBody('preview')),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            setPreview(await res.json() as PreviewResp)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'preview ล้มเหลว')
        } finally {
            setBusy('idle')
        }
    }

    const runApply = async () => {
        setBusy('applying')
        setError(null)
        try {
            const res = await fetch('/api/hradmin/leave/balances/bulk', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(buildBody('apply')),
            })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`)
            const skippedCount = j?.skipped?.length ?? 0
            const msg = skippedCount > 0
                ? `ปรับสำเร็จ ${j.applied} แถว · ข้าม ${skippedCount}`
                : `ปรับสำเร็จ ${j.applied} แถว`
            onApplied(msg)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'apply ล้มเหลว')
            setBusy('idle')
        }
    }

    const toggleInArray = <T,>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

    // Reset preview whenever the configuration changes
    const config = JSON.stringify(buildBody('preview'))
    useEffect(() => { setPreview(null) }, [config])

    if (!mounted || !open) return null

    const content = (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => busy !== 'applying' && onClose()} />
            <div
                role="dialog"
                aria-labelledby="bulk-adjust-title"
                className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.98) 0%, rgba(60,15,20,0.98) 60%, rgba(86,30,35,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                {/* Header */}
                <header className="px-5 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
                    <span className="h-9 w-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
                        <Users size={16} className="text-amber-200" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <h2 id="bulk-adjust-title" className="text-white font-bold">ปรับยอดหลายคน</h2>
                        <p className="text-[11px] text-white/50 mt-0.5">
                            ปี {year + 543} ({year}) · ปรับ batch · audit line ไปทุกแถวที่เปลี่ยน
                        </p>
                    </div>
                    <button
                        onClick={() => busy !== 'applying' && onClose()}
                        disabled={busy === 'applying'}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <X size={15} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* 1. Leave type */}
                    <FormBlock label="1. ประเภทการลา" required>
                        <div className="flex flex-wrap gap-1.5">
                            {leaveTypes.map(t => {
                                const active = leaveTypeId === t.id
                                const color = t.color ?? '#f9c5cd'
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setLeaveTypeId(t.id)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                            active ? 'shadow' : 'hover:opacity-90',
                                        )}
                                        style={{
                                            background: active ? color : `${color}18`,
                                            color: active ? '#2a0a0e' : color,
                                            border: `1px solid ${color}33`,
                                        }}
                                    >
                                        {active && <Check size={10} className="inline mr-1" />}
                                        {t.name_th}
                                    </button>
                                )
                            })}
                        </div>
                    </FormBlock>

                    {/* 2. Action */}
                    <FormBlock label="2. การกระทำ" required>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {ACTIONS.map(a => {
                                const active = action === a.key
                                return (
                                    <button
                                        key={a.key}
                                        onClick={() => setAction(a.key)}
                                        className={cn(
                                            'text-left p-2.5 rounded-lg border text-xs transition-all',
                                            active
                                                ? 'bg-amber-400/20 border-amber-300/50 text-amber-100 shadow'
                                                : 'bg-white/5 border-white/10 text-white/65 hover:bg-white/10',
                                        )}
                                    >
                                        <p className="font-bold">{a.label}</p>
                                        <p className="text-[10px] mt-0.5 opacity-80 leading-relaxed">{a.hint}</p>
                                    </button>
                                )
                            })}
                        </div>
                        {actionMeta.needsValue && (
                            <div className="mt-2 inline-flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    className="w-28 h-9 px-2 text-center rounded-lg bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 tabular-nums"
                                />
                                <span className="text-xs text-white/55">วัน</span>
                            </div>
                        )}
                    </FormBlock>

                    {/* 3. Scope */}
                    <FormBlock label="3. ขอบเขต (ใครจะถูกปรับ)" required>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {([
                                ['all', 'ทุกคน'],
                                ['departments', 'เลือกแผนก'],
                                ['levels', 'เลือก Level'],
                            ] as Array<[ScopeMode, string]>).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setScopeMode(key)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                                        scopeMode === key
                                            ? 'bg-amber-400 text-[#561e23] shadow'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {scopeMode === 'departments' && (
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg bg-white/[0.03] border border-white/8">
                                {departments.length === 0
                                    ? <p className="text-[11px] text-white/40">ไม่มีแผนก</p>
                                    : departments.map(d => {
                                        const active = departmentScope.includes(d)
                                        return (
                                            <button
                                                key={d}
                                                onClick={() => setDepartmentScope(p => toggleInArray(p, d))}
                                                className={cn(
                                                    'px-2.5 py-1 rounded-md text-[11px] transition-all',
                                                    active
                                                        ? 'bg-amber-400 text-[#561e23] font-semibold'
                                                        : 'bg-white/5 text-white/65 hover:bg-white/10',
                                                )}
                                            >
                                                {d}
                                            </button>
                                        )
                                    })}
                            </div>
                        )}
                        {scopeMode === 'levels' && (
                            <div className="flex flex-wrap gap-1.5">
                                {LEVELS.map(l => {
                                    const active = levelScope.includes(l)
                                    return (
                                        <button
                                            key={l}
                                            onClick={() => setLevelScope(p => toggleInArray(p, l))}
                                            className={cn(
                                                'px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                                                active
                                                    ? 'bg-amber-400 text-[#561e23]'
                                                    : 'bg-white/5 text-white/65 hover:bg-white/10',
                                            )}
                                        >
                                            L{l}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </FormBlock>

                    {/* 4. Reason */}
                    <FormBlock label="4. เหตุผล" required>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                            placeholder="เช่น ตั้งโควต้าพักร้อนปี 2569 / เพิ่มสิทธิ์ลาแก่คน IT ตามนโยบายใหม่"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 resize-none"
                        />
                        <p className="mt-1 text-[11px] text-white/40">
                            {reason.trim().length} / 10 ตัวอักษรขั้นต่ำ
                        </p>
                    </FormBlock>

                    {/* Preview */}
                    {preview && (
                        <div className="rounded-xl border border-amber-300/30 bg-amber-400/[0.06] p-3">
                            <p className="text-amber-100 font-bold text-sm mb-2">
                                จะปรับ {preview.affected} แถว
                                {preview.unchanged ? ` · ไม่เปลี่ยน ${preview.unchanged}` : ''}
                            </p>
                            {preview.affected > 0 && (
                                <div className="rounded-lg bg-black/20 border border-white/10 overflow-hidden">
                                    <table className="w-full text-[11px]">
                                        <thead className="text-white/45 border-b border-white/10">
                                            <tr>
                                                <th className="text-left px-2 py-1.5 font-semibold">พนักงาน</th>
                                                <th className="text-left px-2 py-1.5 font-semibold">แผนก</th>
                                                <th className="text-right px-2 py-1.5 font-semibold">Total</th>
                                                <th className="text-right px-2 py-1.5 font-semibold">Used</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {preview.sample.map(s => (
                                                <tr key={s.employee_id}>
                                                    <td className="px-2 py-1.5 text-white/85 truncate max-w-[180px]">{s.name}</td>
                                                    <td className="px-2 py-1.5 text-white/55 truncate max-w-[140px]">{s.department ?? '—'}</td>
                                                    <td className="px-2 py-1.5 text-right text-white/85 tabular-nums">
                                                        {s.old_total} <ArrowRight size={9} className="inline -mt-0.5 text-white/40" /> <strong>{s.new_total}</strong>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-white/85 tabular-nums">
                                                        {s.old_used !== s.new_used
                                                            ? <>{s.old_used} <ArrowRight size={9} className="inline -mt-0.5 text-white/40" /> <strong>{s.new_used}</strong></>
                                                            : <span className="text-white/40">{s.old_used}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {preview.affected > preview.sample.length && (
                                        <p className="px-2 py-1 text-[10px] text-white/45 border-t border-white/10">
                                            … และอีก {preview.affected - preview.sample.length} แถว
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warning + error */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/10 border border-amber-300/20">
                        <AlertTriangle size={14} className="text-amber-300 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-100 leading-relaxed">
                            การปรับ batch จะแก้ <strong>ทุกแถวที่ตรงเงื่อนไข</strong> และเขียน audit line
                            ทุกแถว · กดดู preview ก่อน apply เสมอเพื่อยืนยันจำนวน
                        </p>
                    </div>
                    {error && (
                        <p className="text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 shrink-0 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        disabled={busy === 'applying'}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={runPreview}
                        disabled={!canPreview || busy !== 'idle'}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {busy === 'previewing' ? (
                            <><Loader2 size={14} className="animate-spin" /> กำลัง preview</>
                        ) : (
                            <><RefreshCcw size={13} /> Preview</>
                        )}
                    </button>
                    <button
                        onClick={runApply}
                        disabled={!canApply || busy !== 'idle'}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-[#2a0a0e] shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
                    >
                        {busy === 'applying' ? (
                            <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก</>
                        ) : (
                            <><Check size={14} /> Apply{preview ? ` (${preview.affected})` : ''}</>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    )

    return createPortal(content, document.body)
}

function FormBlock({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-white/65 mb-2">
                {label} {required && <span className="text-red-300">*</span>}
            </p>
            {children}
        </div>
    )
}
