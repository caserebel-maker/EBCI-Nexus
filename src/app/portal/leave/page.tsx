'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
    CalendarDays, Plus, Clock, CheckCircle2, XCircle,
    ChevronDown, X, Loader2, FileText, AlertCircle, ChevronRight,
} from 'lucide-react'
import { submitLeaveRequestAsCurrentUser } from '@/lib/leave-approval-actions'
import { cn } from '@/lib/utils'

// ─── Styles ───────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
}
const inputCls = 'w-full bg-black/20 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors'

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด', ordination: 'ลาบวช',
}
const LEAVE_COLORS: Record<string, string> = {
    sick: 'bg-red-500/20 text-red-300 border-red-500/30',
    personal: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    annual: 'bg-green-500/20 text-green-300 border-green-500/30',
    maternity: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    ordination: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}
const ROLE_LABELS: Record<string, string> = {
    supervisor: 'หัวหน้าแผนก',
    manager: 'หัวหน้าฝ่าย',
    hr: 'HR Admin',
    md: 'MD',
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApprovalStep {
    id: string
    approver_role: string
    status: string
    comment: string | null
    acted_at: string | null
    approver: { first_name_th: string; last_name_th: string } | null
}
interface LeaveReq {
    id: string
    leave_type: string
    start_date: string
    end_date: string
    total_days: number
    reason: string
    status: string
    current_step: number | null
    created_at: string
    leave_approvals: ApprovalStep[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
function calcDays(start: string, end: string): number {
    let count = 0
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endD = new Date(end)
    endD.setHours(0, 0, 0, 0)
    while (cur <= endD) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) count++
        cur.setDate(cur.getDate() + 1)
    }
    return count
}

// ─── Approval Timeline ────────────────────────────────────────────────────────
function ApprovalTimeline({ steps, overall }: { steps: ApprovalStep[]; overall: string }) {
    if (steps.length === 0 && overall === 'pending') {
        return <p className="text-[0.8rem] text-white/40 italic">กำลังรอหัวหน้าพิจารณา...</p>
    }
    const sorted = [...steps].sort(
        (a, b) => new Date(a.acted_at ?? a.id).getTime() - new Date(b.acted_at ?? b.id).getTime()
    )
    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {sorted.map((s, i) => {
                const icon = s.status === 'approved'
                    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    : s.status === 'rejected'
                        ? <XCircle size={13} className="text-red-400 shrink-0" />
                        : <Clock size={13} className="text-amber-400 shrink-0" />
                return (
                    <div key={s.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight size={12} className="text-white/25" />}
                        <div className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-bold border',
                            s.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                                : s.status === 'rejected' ? 'bg-red-500/15 border-red-500/25 text-red-300'
                                    : 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                        )}>
                            {icon}
                            {ROLE_LABELS[s.approver_role] ?? s.approver_role}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Leave Card ───────────────────────────────────────────────────────────────
function LeaveCard({ req }: { req: LeaveReq }) {
    const [expanded, setExpanded] = useState(false)
    const statusColor = req.status === 'approved'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : req.status === 'rejected'
            ? 'bg-red-500/20 text-red-300 border-red-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    const statusLabel = req.status === 'approved' ? '✅ อนุมัติแล้ว'
        : req.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รออนุมัติ'

    const rejectedStep = req.leave_approvals.find(s => s.status === 'rejected')

    return (
        <div style={glass} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[0.75rem] font-bold px-2.5 py-0.5 rounded-full border',
                        LEAVE_COLORS[req.leave_type] ?? 'bg-white/10 text-white/50 border-white/10')}>
                        {LEAVE_LABELS[req.leave_type] ?? req.leave_type}
                    </span>
                    <span className={cn('text-[0.75rem] font-bold px-2.5 py-0.5 rounded-full border', statusColor)}>
                        {statusLabel}
                    </span>
                </div>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="shrink-0 text-white/40 hover:text-white/70 transition-colors"
                >
                    <ChevronDown size={16} className={cn('transition-transform', expanded && 'rotate-180')} />
                </button>
            </div>

            <div className="text-[0.9rem] text-white/80 font-medium">
                {fmt(req.start_date)} – {fmt(req.end_date)}
                <span className="ml-2 text-white/40 font-normal text-[0.8rem]">({req.total_days} วัน)</span>
            </div>

            <ApprovalTimeline steps={req.leave_approvals} overall={req.status} />

            {rejectedStep?.comment && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-[0.8rem] text-red-300 font-medium">เหตุผลที่ปฏิเสธ:</p>
                    <p className="text-[0.85rem] text-red-200 mt-0.5">{rejectedStep.comment}</p>
                </div>
            )}

            {expanded && (
                <div className="pt-2 border-t border-white/10">
                    <p className="text-[0.8rem] text-white/50 mb-1">เหตุผล:</p>
                    <p className="text-[0.9rem] text-white/80">{req.reason}</p>
                    <p className="text-[0.75rem] text-white/30 mt-2">ยื่นเมื่อ {fmt(req.created_at)}</p>
                </div>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalLeavePage() {
    const [requests, setRequests] = useState<LeaveReq[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Form state
    const [leaveType, setLeaveType] = useState('sick')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')

    const totalDays = startDate && endDate ? calcDays(startDate, endDate) : 0

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/leave/v2/my-requests')
            const data = await res.json()
            if (data.data) setRequests(data.data)
        } catch {
            /* silently ignore */
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!leaveType || !startDate || !endDate || !reason.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน')
            return
        }
        if (totalDays <= 0) {
            setError('วันที่ไม่ถูกต้อง (ต้องเป็นวันทำงาน)')
            return
        }
        setError('')
        startTransition(async () => {
            const result = await submitLeaveRequestAsCurrentUser({
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                total_days: totalDays,
                reason: reason.trim(),
            })
            if ('error' in result) {
                setError(result.error)
                return
            }
            setSuccess('ยื่นใบลาสำเร็จ! ระบบจะแจ้งผู้อนุมัติทันที')
            setShowForm(false)
            setLeaveType('sick'); setStartDate(''); setEndDate(''); setReason('')
            fetchRequests()
            setTimeout(() => setSuccess(''), 6000)
        })
    }

    const pendingCount = requests.filter(r => r.status === 'pending').length

    return (
        <div className="space-y-6 pb-20" style={{ fontSize: '1.2em' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20 shrink-0">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <h1 className="text-[1.3rem] font-black text-white tracking-tight">ใบลาของฉัน</h1>
                        <p className="text-[0.75rem] text-white/40">
                            {requests.length} รายการทั้งหมด
                            {pendingCount > 0 && ` · รออนุมัติ ${pendingCount} รายการ`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowForm(v => !v); setError('') }}
                    className="flex items-center gap-2 bg-[#882136] hover:bg-[#882136]/80 text-white font-bold px-4 py-2.5 rounded-xl transition-all border border-[#ad5f6c]/30 text-[0.85rem] active:scale-95"
                >
                    <Plus size={16} />
                    ยื่นใบลา
                </button>
            </div>

            {/* Success */}
            {success && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl px-4 py-3 text-[0.9rem] font-medium">
                    <CheckCircle2 size={16} />
                    {success}
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div style={glass} className="overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2 text-white font-bold">
                            <FileText size={18} />
                            <span>ยื่นใบลา</span>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-[0.85rem]">
                                <AlertCircle size={15} />
                                {error}
                            </div>
                        )}

                        {/* Type */}
                        <div className="space-y-1.5">
                            <label className="text-[0.8rem] font-bold text-white/50 uppercase tracking-wider">
                                ประเภทการลา <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={leaveType}
                                    onChange={e => setLeaveType(e.target.value)}
                                    className={cn(inputCls, 'appearance-none pr-10')}
                                >
                                    {Object.entries(LEAVE_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[0.8rem] font-bold text-white/50 uppercase tracking-wider">
                                    วันที่เริ่ม <span className="text-red-400">*</span>
                                </label>
                                <input type="date" value={startDate} min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setStartDate(e.target.value)} className={inputCls} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[0.8rem] font-bold text-white/50 uppercase tracking-wider">
                                    วันที่สิ้นสุด <span className="text-red-400">*</span>
                                </label>
                                <input type="date" value={endDate} min={startDate || new Date().toISOString().split('T')[0]}
                                    onChange={e => setEndDate(e.target.value)} className={inputCls} required />
                            </div>
                        </div>
                        {totalDays > 0 && (
                            <p className="text-[0.85rem] text-[#ad5f6c] font-bold">
                                จำนวนวันทำงาน: {totalDays} วัน
                            </p>
                        )}

                        {/* Reason */}
                        <div className="space-y-1.5">
                            <label className="text-[0.8rem] font-bold text-white/50 uppercase tracking-wider">
                                เหตุผล <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="กรุณาระบุเหตุผลในการลา"
                                rows={3}
                                className={cn(inputCls, 'resize-none')}
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex items-center gap-2 bg-[#882136] hover:bg-[#882136]/80 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-[0.9rem] disabled:opacity-60 active:scale-95"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                {isPending ? 'กำลังส่ง...' : 'ยื่นใบลา'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError('') }}
                                className="px-6 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-[0.9rem] font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* History */}
            <div style={glass} className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h2 className="text-[1rem] font-bold text-white">ประวัติการลา</h2>
                    <span className="text-[0.8rem] text-white/35">{requests.length} รายการ</span>
                </div>
                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin text-[#ad5f6c]" size={28} />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-white/30">
                            <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="text-[0.9rem]">ยังไม่มีรายการลา</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(r => <LeaveCard key={r.id} req={r} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
