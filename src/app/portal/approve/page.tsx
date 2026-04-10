'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
    ClipboardCheck, CheckCircle2, XCircle, Clock, CalendarDays,
    User, Loader2, X, AlertCircle, ChevronRight,
} from 'lucide-react'
import { approveLeaveAsCurrentUser, rejectLeaveAsCurrentUser } from '@/lib/leave-approval-actions'
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
const modalOverlay: React.CSSProperties = {
    background: 'rgba(10,2,4,0.75)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
}
const modalCard: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(60,15,20,0.92) 60%, rgba(100,35,45,0.85) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    borderRadius: '1.25rem',
}

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
    supervisor: 'หัวหน้าแผนก', manager: 'หัวหน้าฝ่าย', hr: 'HR Admin', md: 'MD',
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
    employee: {
        id: string
        first_name_th: string
        last_name_th: string
        nickname: string | null
        department: string | null
        position: string | null
    }
    leave_approvals: ApprovalStep[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
function empName(e: LeaveReq['employee']) {
    return `${e.first_name_th} ${e.last_name_th}${e.nickname ? ` (${e.nickname})` : ''}`
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({
    req, onConfirm, onClose, loading,
}: {
    req: LeaveReq
    onConfirm: (comment: string) => void
    onClose: () => void
    loading: boolean
}) {
    const [comment, setComment] = useState('')
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalOverlay} onClick={onClose}>
            <div style={modalCard} className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-bold text-[1.1rem]">
                        <XCircle size={20} className="text-red-400" />
                        ปฏิเสธใบลา
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-white/5 rounded-xl p-3 text-[0.9rem] space-y-1 text-white/80">
                        <p><span className="font-bold text-white/50">พนักงาน:</span> {empName(req.employee)}</p>
                        <p><span className="font-bold text-white/50">ประเภท:</span> {LEAVE_LABELS[req.leave_type]}</p>
                        <p><span className="font-bold text-white/50">วันที่:</span> {fmt(req.start_date)} – {fmt(req.end_date)} ({req.total_days} วัน)</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[0.8rem] font-bold text-white/50 uppercase tracking-wider">
                            เหตุผลที่ปฏิเสธ <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="กรุณาระบุเหตุผล (บังคับ)"
                            rows={3}
                            className="w-full bg-black/20 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 resize-none transition-colors"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => comment.trim() && onConfirm(comment)}
                            disabled={!comment.trim() || loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-[0.9rem] transition-colors disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                            ยืนยันปฏิเสธ
                        </button>
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white font-medium transition-colors">
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Approval History Badges ──────────────────────────────────────────────────
function ApprovalHistory({ steps }: { steps: ApprovalStep[] }) {
    const sorted = [...steps].sort(
        (a, b) => new Date(a.acted_at ?? a.id).getTime() - new Date(b.acted_at ?? b.id).getTime()
    )
    if (sorted.length === 0) return null
    return (
        <div className="flex flex-wrap items-center gap-1 mt-2">
            {sorted.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight size={11} className="text-white/20" />}
                    <span className={cn(
                        'text-[0.7rem] font-bold px-2 py-0.5 rounded-full border',
                        s.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                            : s.status === 'rejected' ? 'bg-red-500/15 border-red-500/25 text-red-300'
                                : 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                    )}>
                        {s.status === 'approved' ? '✅' : s.status === 'rejected' ? '❌' : '⏳'}{' '}
                        {ROLE_LABELS[s.approver_role] ?? s.approver_role}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ─── Leave Card ───────────────────────────────────────────────────────────────
function LeaveCard({
    req, onApprove, onReject, actionId,
}: {
    req: LeaveReq
    onApprove: (id: string) => void
    onReject: (req: LeaveReq) => void
    actionId: string | null
}) {
    const isLoading = actionId === req.id
    return (
        <div style={glass} className="p-5 space-y-4 hover:brightness-105 transition-all duration-200">
            {/* Employee */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#561e23]/70 flex items-center justify-center text-sm font-black text-white border border-[#ad5f6c]/30 shrink-0">
                        {req.employee.first_name_th?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[1rem] font-bold text-white">{empName(req.employee)}</p>
                        <p className="text-[0.8rem] text-white/45">{req.employee.position} · {req.employee.department}</p>
                    </div>
                </div>
                <span className={cn('shrink-0 text-[0.75rem] font-bold px-2.5 py-0.5 rounded-full border',
                    LEAVE_COLORS[req.leave_type] ?? 'bg-white/10 text-white/50 border-white/10')}>
                    {LEAVE_LABELS[req.leave_type] ?? req.leave_type}
                </span>
            </div>

            {/* Details */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[0.9rem] text-white/80">
                    <CalendarDays size={14} className="text-[#ad5f6c] shrink-0" />
                    <span>{fmt(req.start_date)} – {fmt(req.end_date)}</span>
                    <span className="font-bold text-white">({req.total_days} วัน)</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[0.75rem] text-white/40">เหตุผล</p>
                    <p className="text-[0.9rem] text-white/85">{req.reason}</p>
                </div>
                <ApprovalHistory steps={req.leave_approvals} />
                <p className="text-[0.75rem] text-white/30">ยื่นเมื่อ {fmt(req.created_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                    onClick={() => onApprove(req.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-[0.9rem] transition-colors disabled:opacity-50 active:scale-95"
                >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    อนุมัติ
                </button>
                <button
                    onClick={() => onReject(req)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-[0.9rem] transition-colors disabled:opacity-50 active:scale-95"
                >
                    <XCircle size={15} />
                    ไม่อนุมัติ
                </button>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalApprovePage() {
    const [requests, setRequests] = useState<LeaveReq[]>([])
    const [loading, setLoading] = useState(true)
    const [actionId, setActionId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<LeaveReq | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/leave/v2/pending-approvals')
            const data = await res.json()
            if (data.data) setRequests(data.data)
        } catch {
            showToast('error', 'ไม่สามารถโหลดข้อมูลได้')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    function handleApprove(id: string) {
        setActionId(id)
        startTransition(async () => {
            const result = await approveLeaveAsCurrentUser(id)
            if ('error' in result) {
                showToast('error', result.error)
            } else {
                showToast('success', result.fullyApproved
                    ? 'อนุมัติเสร็จสิ้น — พนักงานได้รับการแจ้งเตือนแล้ว'
                    : 'อนุมัติแล้ว ส่งต่อขั้นตอนถัดไป')
                fetchRequests()
            }
            setActionId(null)
        })
    }

    function handleRejectConfirm(comment: string) {
        if (!rejectTarget) return
        const id = rejectTarget.id
        setActionId(id)
        startTransition(async () => {
            const result = await rejectLeaveAsCurrentUser(id, comment)
            if ('error' in result) {
                showToast('error', result.error)
            } else {
                showToast('success', 'ปฏิเสธใบลาเรียบร้อย พนักงานได้รับการแจ้งเตือน')
                setRejectTarget(null)
                fetchRequests()
            }
            setActionId(null)
        })
    }

    return (
        <div className="space-y-6 pb-20" style={{ fontSize: '1.2em' }}>
            {/* Toast */}
            {toast && (
                <div className={cn(
                    'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-[0.9rem] font-bold transition-all',
                    toast.type === 'success'
                        ? 'bg-emerald-600/90 text-white border border-emerald-500/30'
                        : 'bg-red-600/90 text-white border border-red-500/30'
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Reject Modal */}
            {rejectTarget && (
                <RejectModal
                    req={rejectTarget}
                    onConfirm={handleRejectConfirm}
                    onClose={() => setRejectTarget(null)}
                    loading={isPending && actionId === rejectTarget.id}
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20 shrink-0">
                    <ClipboardCheck size={20} />
                </div>
                <div>
                    <h1 className="text-[1.3rem] font-black text-white tracking-tight">อนุมัติใบลา</h1>
                    <p className="text-[0.75rem] text-white/40">
                        ใบลาที่รอการพิจารณาจากคุณ {requests.length > 0 && `· ${requests.length} รายการ`}
                    </p>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-[#ad5f6c]" size={32} />
                </div>
            ) : requests.length === 0 ? (
                <div style={glass} className="p-16 text-center text-white/30">
                    <ClipboardCheck size={48} className="mx-auto mb-4 opacity-40" />
                    <p className="text-[1rem] font-bold">ไม่มีใบลารออนุมัติ</p>
                    <p className="text-[0.85rem] mt-1 opacity-70">ทุกอย่างเรียบร้อยแล้ว</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {requests.map(req => (
                        <LeaveCard
                            key={req.id}
                            req={req}
                            onApprove={handleApprove}
                            onReject={setRejectTarget}
                            actionId={actionId}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
