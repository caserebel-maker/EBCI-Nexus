'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, Search, Loader2, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveTypeLite } from './types'

interface EmployeeOption {
    id: string
    nickname: string | null
    first_name_th: string | null
    last_name_th: string | null
    department: string | null
    employee_code: string | null
}

interface Props {
    open: boolean
    onClose: () => void
    onCreated: () => void
    leaveTypes: LeaveTypeLite[]
}

/**
 * HR creates a leave request on behalf of an employee. The resulting
 * row is auto-approved (HR is the authoritative approver), balance
 * deducts straight into used_days, and the employee gets the standard
 * approved-email flow. Form matches the employee-side submit but
 * skips the approval chain.
 */
export function CreateOnBehalfModal({ open, onClose, onCreated, leaveTypes }: Props) {
    const [empSearch, setEmpSearch] = useState('')
    const [empResults, setEmpResults] = useState<EmployeeOption[]>([])
    const [empLoading, setEmpLoading] = useState(false)
    const [selectedEmp, setSelectedEmp] = useState<EmployeeOption | null>(null)
    const [leaveTypeId, setLeaveTypeId] = useState<string>('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isHalfDay, setIsHalfDay] = useState(false)
    const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning')
    const [reason, setReason] = useState('')
    const [hrNotes, setHrNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Reset when modal opens
    useEffect(() => {
        if (!open) return
        setEmpSearch('')
        setEmpResults([])
        setSelectedEmp(null)
        setLeaveTypeId('')
        setStartDate('')
        setEndDate('')
        setIsHalfDay(false)
        setHalfDayPeriod('morning')
        setReason('')
        setHrNotes('')
        setError(null)
        setSubmitting(false)
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Employee typeahead — debounce 250ms
    useEffect(() => {
        if (!open || selectedEmp) return
        const q = empSearch.trim()
        if (q.length < 2) { setEmpResults([]); return }
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(async () => {
            setEmpLoading(true)
            try {
                const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}&limit=8`, {
                    cache: 'no-store',
                })
                if (!res.ok) {
                    // Fallback: graceful empty list on any error (e.g. endpoint missing in prod)
                    setEmpResults([])
                    return
                }
                const json = await res.json()
                const list = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : []
                setEmpResults(list)
            } catch {
                setEmpResults([])
            } finally {
                setEmpLoading(false)
            }
        }, 250)
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
        }
    }, [empSearch, open, selectedEmp])

    if (!open) return null

    const canSubmit = selectedEmp
        && leaveTypeId
        && startDate
        && endDate
        && reason.trim().length >= 3
        && (!isHalfDay || startDate === endDate)

    const submit = async () => {
        if (!canSubmit) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/hradmin/leave/create-on-behalf', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmp!.id,
                    leave_type_id: leaveTypeId,
                    start_date: startDate,
                    end_date: endDate,
                    is_half_day: isHalfDay,
                    half_day_period: isHalfDay ? halfDayPeriod : undefined,
                    reason: reason.trim(),
                    notes: hrNotes.trim() || undefined,
                }),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            onCreated()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !submitting && onClose()} />
            <div
                role="dialog"
                aria-labelledby="create-on-behalf-title"
                className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.98) 0%, rgba(60,15,20,0.98) 60%, rgba(86,30,35,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center">
                            <Plus size={16} className="text-amber-200" />
                        </span>
                        <div>
                            <h2 id="create-on-behalf-title" className="text-white font-bold">สร้างใบลา</h2>
                            <p className="text-[11px] text-white/50 mt-0.5">HR สร้างแทน · อัพเดตสถานะเป็น "อนุมัติแล้ว" อัตโนมัติ</p>
                        </div>
                    </div>
                    <button
                        onClick={() => !submitting && onClose()}
                        disabled={submitting}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <X size={15} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Employee search */}
                    <div>
                        <label className="block text-xs font-semibold text-white/65 mb-1.5">
                            พนักงาน <span className="text-red-300">*</span>
                        </label>
                        {selectedEmp ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/25">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="h-8 w-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-100 text-xs font-bold">
                                        {(selectedEmp.nickname?.[0] ?? selectedEmp.first_name_th?.[0] ?? '?').toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">
                                            {[selectedEmp.first_name_th, selectedEmp.last_name_th].filter(Boolean).join(' ')
                                                + (selectedEmp.nickname ? ` (${selectedEmp.nickname})` : '')}
                                        </p>
                                        <p className="text-[11px] text-white/50 truncate">
                                            {selectedEmp.department ?? '—'} · {selectedEmp.employee_code ?? '—'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedEmp(null); setEmpSearch('') }}
                                    className="text-xs text-white/55 hover:text-white underline decoration-dotted shrink-0"
                                >
                                    เปลี่ยน
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    value={empSearch}
                                    onChange={e => setEmpSearch(e.target.value)}
                                    placeholder="ชื่อเล่น / รหัสพนักงาน (อย่างน้อย 2 ตัวอักษร)"
                                    className="w-full pl-9 pr-3 h-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                                />
                                {empLoading && (
                                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin" />
                                )}
                                {empResults.length > 0 && (
                                    <div className="mt-1 rounded-lg border border-white/10 overflow-hidden divide-y divide-white/5 max-h-56 overflow-y-auto bg-[rgba(20,5,8,0.98)]">
                                        {empResults.map(emp => (
                                            <button
                                                key={emp.id}
                                                onClick={() => setSelectedEmp(emp)}
                                                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/10 text-left"
                                            >
                                                <span className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-xs font-bold shrink-0">
                                                    {(emp.nickname?.[0] ?? emp.first_name_th?.[0] ?? '?').toUpperCase()}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-white text-sm truncate">
                                                        {[emp.first_name_th, emp.last_name_th].filter(Boolean).join(' ')
                                                            + (emp.nickname ? ` (${emp.nickname})` : '')}
                                                    </p>
                                                    <p className="text-[10px] text-white/45 truncate">
                                                        {emp.department ?? '—'} · {emp.employee_code ?? '—'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {empSearch.length >= 2 && !empLoading && empResults.length === 0 && (
                                    <p className="mt-1 text-[11px] text-white/40 px-1">ไม่พบพนักงาน</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Leave type */}
                    <div>
                        <label className="block text-xs font-semibold text-white/65 mb-1.5">
                            ประเภทการลา <span className="text-red-300">*</span>
                        </label>
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
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-white/65 mb-1.5">ตั้งแต่ *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/65 mb-1.5">ถึง *</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                            />
                        </div>
                    </div>

                    {/* Half day */}
                    <div>
                        <label className="inline-flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isHalfDay}
                                onChange={e => {
                                    setIsHalfDay(e.target.checked)
                                    if (e.target.checked && startDate && startDate !== endDate) {
                                        setEndDate(startDate)
                                    }
                                }}
                                className="h-4 w-4 rounded accent-amber-400"
                            />
                            ลาครึ่งวัน
                        </label>
                        {isHalfDay && (
                            <div className="mt-2 flex gap-1.5">
                                {([['morning', 'เช้า'], ['afternoon', 'บ่าย']] as const).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setHalfDayPeriod(val)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                            halfDayPeriod === val
                                                ? 'bg-amber-400 text-[#2a0a0e] shadow'
                                                : 'bg-white/5 text-white/70 hover:bg-white/10',
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-semibold text-white/65 mb-1.5">
                            เหตุผล <span className="text-red-300">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                            placeholder="เหตุผลการลา"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40 resize-none"
                        />
                    </div>

                    {/* HR note (optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-white/65 mb-1.5">
                            บันทึก HR (ทางเลือก)
                        </label>
                        <input
                            type="text"
                            value={hrNotes}
                            onChange={e => setHrNotes(e.target.value)}
                            placeholder="เช่น: ลูกจ้างแจ้งทางโทรศัพท์"
                            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                        />
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-400/5 border border-blue-300/15">
                        <AlertTriangle size={14} className="text-blue-300 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-100 leading-relaxed">
                            ใบลาที่สร้างจะมีสถานะ <strong>อนุมัติแล้ว</strong> อัตโนมัติ
                            และหักยอดจาก used_days ของพนักงานทันที · ส่งอีเมลแจ้งพนักงาน
                        </p>
                    </div>

                    {error && (
                        <p className="text-xs text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <footer className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 shrink-0 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={submit}
                        disabled={!canSubmit || submitting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-[#2a0a0e] shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
                    >
                        {submitting ? (
                            <><Loader2 size={14} className="animate-spin" /> กำลังสร้าง</>
                        ) : (
                            <><Plus size={14} /> สร้างใบลา</>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    )
}
