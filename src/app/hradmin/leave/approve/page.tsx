'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    ClipboardCheck, CheckCircle2, XCircle, AlertCircle,
    CalendarDays, User, Loader2, X
} from 'lucide-react'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'

// ---- Types ----
interface LeaveRequest {
    id: string
    leaveType: string
    startDate: string
    endDate: string
    totalDays: number
    reason: string
    status: string
    rejectionReason?: string
    approver?: { name: string }
    approvedAt?: string
    createdAt: string
    employee: {
        id: string
        employeeCode: string
        firstNameTH: string
        lastNameTH: string
        department: string
        position: string
        email: string
        workLocation?: string | null
    }
}

// ---- Constants ----
const LEAVE_TYPE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด',
    ordination: 'ลาบวช',
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
    sick: 'bg-red-100 text-red-700',
    personal: 'bg-blue-100 text-blue-700',
    annual: 'bg-green-100 text-green-700',
    maternity: 'bg-pink-100 text-pink-700',
    ordination: 'bg-amber-100 text-amber-700',
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

// ---- Reject Modal ----
function RejectModal({
    request,
    onConfirm,
    onClose,
    loading,
}: {
    request: LeaveRequest
    onConfirm: (reason: string) => void
    onClose: () => void
    loading: boolean
}) {
    const [reason, setReason] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <XCircle size={18} className="text-red-500" />
                        ปฏิเสธใบลา
                    </h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                        <p><span className="font-medium">พนักงาน:</span> {request.employee.firstNameTH} {request.employee.lastNameTH}</p>
                        <p><span className="font-medium">ประเภท:</span> {LEAVE_TYPE_LABELS[request.leaveType]}</p>
                        <p><span className="font-medium">วันที่:</span> {formatDate(request.startDate)} – {formatDate(request.endDate)} ({request.totalDays} วัน)</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            เหตุผลที่ปฏิเสธ <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="กรุณาระบุเหตุผลที่ปฏิเสธ"
                            rows={3}
                            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => reason.trim() && onConfirm(reason)}
                            disabled={!reason.trim() || loading}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                            ยืนยันปฏิเสธ
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- Leave Card Component ----
function LeaveCard({
    req,
    onApprove,
    onReject,
    actionLoading,
}: {
    req: LeaveRequest
    onApprove: (id: string) => void
    onReject: (req: LeaveRequest) => void
    actionLoading: string | null
}) {
    return (
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User size={18} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-semibold text-foreground text-sm truncate">
                                    {req.employee.firstNameTH} {req.employee.lastNameTH}
                                </p>
                                {req.employee.workLocation === 'johnson' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-red-600 border border-red-200 leading-none shrink-0 shadow-sm">
                                        จอห์นสัน
                                    </span>
                                )}
                                {req.employee.workLocation === 'saraburi' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-blue-600 border border-blue-200 leading-none shrink-0 shadow-sm">
                                        สระบุรี (WFH)
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {req.employee.position} • {req.employee.department}
                            </p>
                        </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}>
                        {LEAVE_TYPE_LABELS[req.leaveType]}
                    </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays size={14} />
                        <span>
                            {formatDate(req.startDate)} – {formatDate(req.endDate)}
                            <span className="ml-1 font-semibold text-foreground">({req.totalDays} วัน)</span>
                        </span>
                    </div>
                    <div className="bg-muted rounded-md px-3 py-2">
                        <p className="text-xs text-muted-foreground">เหตุผล</p>
                        <p className="text-sm text-foreground">{req.reason}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        ยื่นเมื่อ {formatDate(req.createdAt)}
                    </p>
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                        <button
                            onClick={() => onApprove(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                        >
                            {actionLoading === req.id ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={14} />
                            )}
                            อนุมัติ
                        </button>
                        <button
                            onClick={() => onReject(req)}
                            disabled={actionLoading === req.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
                        >
                            <XCircle size={14} />
                            ปฏิเสธ
                        </button>
                    </div>
                )}

                {req.status !== 'pending' && (
                    <div className={`flex items-center gap-2 pt-3 border-t border-border text-sm ${req.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                        {req.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span className="font-medium">
                            {req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                        </span>
                        {req.approver?.name && <span className="text-muted-foreground text-xs">โดย {req.approver.name}</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

// ---- Calendar View ----
function TeamCalendar({ requests }: { requests: LeaveRequest[] }) {
    const today = new Date()
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [currentYear, setCurrentYear] = useState(today.getFullYear())

    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const approvedInMonth = requests.filter(r => {
        if (r.status !== 'approved') return false
        const start = new Date(r.startDate)
        const end = new Date(r.endDate)
        return start.getMonth() === currentMonth && start.getFullYear() === currentYear
            || end.getMonth() === currentMonth && end.getFullYear() === currentYear
    })

    function getLeavesForDay(day: number) {
        const date = new Date(currentYear, currentMonth, day)
        return approvedInMonth.filter(r => {
            const start = new Date(r.startDate)
            const end = new Date(r.endDate)
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
            return date >= start && date <= end
        })
    }

    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

    function prevMonth() {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
        else setCurrentMonth(m => m - 1)
    }
    function nextMonth() {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
        else setCurrentMonth(m => m + 1)
    }

    return (
        <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                    <CalendarDays size={18} />
                    ปฏิทินทีม
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                        ‹
                    </button>
                    <span className="text-sm font-semibold text-foreground min-w-[7rem] text-center">
                        {monthNames[currentMonth]} {currentYear + 543}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                        ›
                    </button>
                </div>
            </div>
            <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                    {dayNames.map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                    ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells before first day */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const leaves = getLeavesForDay(day)
                        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                        const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6

                        return (
                            <div
                                key={day}
                                className={`relative min-h-[52px] rounded-lg p-1 text-xs ${isWeekend ? 'bg-muted/50' : 'bg-background'} ${isToday ? 'ring-2 ring-primary' : ''}`}
                            >
                                <span className={`block text-center font-medium mb-1 ${isToday ? 'text-primary' : isWeekend ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {day}
                                </span>
                                {leaves.slice(0, 2).map(req => (
                                    <div
                                        key={req.id}
                                        className={`text-[10px] truncate px-1 py-0.5 rounded mb-0.5 ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}
                                        title={`${req.employee.firstNameTH} — ${LEAVE_TYPE_LABELS[req.leaveType]}`}
                                    >
                                        {req.employee.firstNameTH}
                                    </div>
                                ))}
                                {leaves.length > 2 && (
                                    <div className="text-[10px] text-center text-muted-foreground">+{leaves.length - 2}</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ---- Main Page ----
export default function ApproveLeavePage() {
    const confirm = useConfirmDialog()
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [filterStatus, setFilterStatus] = useState('pending')

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/leave/team')
            const data = await res.json()
            if (data.data) setRequests(data.data)
        } catch {
            showToast('error', 'ไม่สามารถโหลดข้อมูลได้')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    async function handleApprove(id: string) {
        setActionLoading(id)
        try {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'approve' }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) { showToast('error', data.error || 'เกิดข้อผิดพลาด'); return }
            showToast('success', 'อนุมัติใบลาสำเร็จ')
            fetchRequests()
        } catch {
            showToast('error', 'เกิดข้อผิดพลาด')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleRejectConfirm(reason: string) {
        if (!rejectTarget) return
        const target = rejectTarget
        const ok = await confirm({
            title: 'ยืนยันปฏิเสธใบลา?',
            body: 'พนักงานจะได้รับ email แจ้งผล และระบบจะคืนวันลาที่จองไว้ในสถานะ pending',
            summary: (
                <div className="space-y-1">
                    <p>👤 {target.employee.firstNameTH} {target.employee.lastNameTH}</p>
                    <p>🌴 {LEAVE_TYPE_LABELS[target.leaveType] ?? target.leaveType} · {formatDate(target.startDate)} – {formatDate(target.endDate)}</p>
                    <p>📝 {reason.length > 90 ? `${reason.slice(0, 90)}…` : reason}</p>
                </div>
            ),
            confirmLabel: 'ปฏิเสธ',
            variant: 'destructive',
        })
        if (!ok) return

        setActionLoading(target.id)
        try {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: target.id, action: 'reject', reason }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) { showToast('error', data.error || 'เกิดข้อผิดพลาด'); return }
            showToast('success', 'ปฏิเสธใบลาเรียบร้อย')
            setRejectTarget(null)
            fetchRequests()
        } catch {
            showToast('error', 'เกิดข้อผิดพลาด')
        } finally {
            setActionLoading(null)
        }
    }

    const filtered = requests.filter(r => filterStatus === 'all' || r.status === filterStatus)
    const pendingCount = requests.filter(r => r.status === 'pending').length
    const approvedRequests = requests.filter(r => r.status === 'approved')

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Reject Modal */}
            {rejectTarget && (
                <RejectModal
                    request={rejectTarget}
                    onConfirm={handleRejectConfirm}
                    onClose={() => setRejectTarget(null)}
                    loading={actionLoading === rejectTarget.id}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                        <ClipboardCheck size={24} />
                        อนุมัติการลา
                    </h1>
                    <p className="text-white/70 dark:text-muted-foreground text-sm mt-1">
                        พิจารณาใบลาของลูกน้องในทีม
                    </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'รออนุมัติ', count: requests.filter(r => r.status === 'pending').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
                        { label: 'อนุมัติแล้ว', count: requests.filter(r => r.status === 'approved').length, color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
                        { label: 'ปฏิเสธ', count: requests.filter(r => r.status === 'rejected').length, color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
                    ].map(({ label, count, color }) => (
                        <div key={label} className={`${color} rounded-xl p-4 text-center`}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs font-medium mt-1">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex gap-2 flex-wrap">
                    {[
                        { value: 'pending', label: `รออนุมัติ (${pendingCount})` },
                        { value: 'approved', label: 'อนุมัติแล้ว' },
                        { value: 'rejected', label: 'ปฏิเสธ' },
                        { value: 'all', label: 'ทั้งหมด' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === opt.value
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'bg-white dark:bg-card border border-border text-foreground hover:bg-muted'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Leave Cards */}
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="animate-spin text-primary" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white dark:bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                        <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{filterStatus === 'pending' ? 'ไม่มีใบลารออนุมัติ' : 'ไม่มีรายการ'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map(req => (
                            <LeaveCard
                                key={req.id}
                                req={req}
                                onApprove={handleApprove}
                                onReject={setRejectTarget}
                                actionLoading={actionLoading}
                            />
                        ))}
                    </div>
                )}

                {/* Team Calendar */}
                <TeamCalendar requests={approvedRequests} />
            </div>
        </>
    )
}
