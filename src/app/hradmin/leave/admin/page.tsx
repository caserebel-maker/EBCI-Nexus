'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import {
    ShieldCheck, Download, Filter, CheckCircle2, XCircle, Trash2,
    Clock, CalendarDays, User, Loader2, X, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
    approved: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
    rejected: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-600', icon: <X size={12} /> },
}

const MONTHS = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function SelectFilter({
    value, onChange, label, options
}: {
    value: string
    onChange: (v: string) => void
    label: string
    options: { value: string; label: string }[]
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                aria-label={label}
                className="w-full appearance-none bg-white dark:bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
    )
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
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                        <p><span className="font-medium">พนักงาน:</span> {request.employee.firstNameTH} {request.employee.lastNameTH}</p>
                        <p><span className="font-medium">ประเภท:</span> {LEAVE_TYPE_LABELS[request.leaveType]}</p>
                        <p><span className="font-medium">วันที่:</span> {formatDate(request.startDate)} – {formatDate(request.endDate)}</p>
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
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                            ยืนยันปฏิเสธ
                        </button>
                        <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium">
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Types for HR multi-level tab ───────────────────────────────────────────
interface HrApprovalStep {
    id: string; approver_role: string; status: string
    comment: string | null; acted_at: string | null
    approver: { first_name_th: string; last_name_th: string } | null
}
interface HrLeaveReq {
    id: string; leave_type: string; start_date: string; end_date: string
    total_days: number; reason: string; status: string; created_at: string
    employee: { id: string; first_name_th: string; last_name_th: string; nickname: string | null; department: string | null; position: string | null; work_location?: string | null }
    leave_approvals: HrApprovalStep[]
}

const HR_ROLE_LABELS: Record<string, string> = {
    supervisor: 'หัวหน้าแผนก', manager: 'หัวหน้าฝ่าย', hr: 'HR Admin', md: 'MD',
}

// ── HR Pending Card ────────────────────────────────────────────────────────
function HrLeaveCard({
    req, onApprove, onReject, actionId,
}: {
    req: HrLeaveReq
    onApprove: (id: string) => void
    onReject: (req: HrLeaveReq) => void
    actionId: string | null
}) {
    const sorted = [...req.leave_approvals].sort(
        (a, b) => new Date(a.acted_at ?? a.id).getTime() - new Date(b.acted_at ?? b.id).getTime()
    )
    const isLoading = actionId === req.id
    const emp = req.employee
    return (
        <div className="p-4 border-b border-border last:border-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={13} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-sm flex items-center gap-1.5 flex-wrap">
                            <span>
                                {emp.first_name_th} {emp.last_name_th}
                                {emp.nickname && <span className="font-normal text-muted-foreground"> ({emp.nickname})</span>}
                            </span>
                            {emp.work_location === 'johnson' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-red-600 border border-red-200 leading-none shrink-0 shadow-sm">
                                    จอห์นสัน
                                </span>
                            )}
                            {emp.work_location === 'saraburi' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-blue-600 border border-blue-200 leading-none shrink-0 shadow-sm">
                                    สระบุรี (WFH)
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">{emp.position} · {emp.department}</p>
                    </div>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {LEAVE_TYPE_LABELS[req.leave_type] ?? req.leave_type}
                </span>
            </div>
            <div className="text-sm text-muted-foreground">
                {formatDate(req.start_date)} – {formatDate(req.end_date)}
                <span className="ml-1 font-semibold text-foreground">({req.total_days} วัน)</span>
            </div>
            <div className="bg-muted rounded-md px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">เหตุผล</p>
                <p className="text-foreground">{req.reason}</p>
            </div>
            {/* Approval History */}
            {sorted.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                    {sorted.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight size={11} className="text-muted-foreground/50" />}
                            <span className={cn('text-[0.7rem] font-semibold px-1.5 py-0.5 rounded-full',
                                s.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                    : s.status === 'rejected' ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700')}>
                                {s.status === 'approved' ? '✅' : s.status === 'rejected' ? '❌' : '⏳'}{' '}
                                {HR_ROLE_LABELS[s.approver_role] ?? s.approver_role}
                            </span>
                        </div>
                    ))}
                    <span className="text-[0.7rem] font-bold text-primary ml-1">← ขั้นของ HR</span>
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => onApprove(req.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                >
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                    อนุมัติ
                </button>
                <button
                    onClick={() => onReject(req)}
                    disabled={isLoading}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                >
                    <XCircle size={10} />
                    ปฏิเสธ
                </button>
            </div>
        </div>
    )
}

// ── HR Reject Modal ────────────────────────────────────────────────────────
function HrRejectModal({
    req, onConfirm, onClose, loading,
}: {
    req: HrLeaveReq; onConfirm: (r: string) => void; onClose: () => void; loading: boolean
}) {
    const [reason, setReason] = useState('')
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-card rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <XCircle size={18} className="text-red-500" />ปฏิเสธใบลา (HR)
                    </h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                        <p><span className="font-medium">พนักงาน:</span> {req.employee.first_name_th} {req.employee.last_name_th}</p>
                        <p><span className="font-medium">ประเภท:</span> {LEAVE_TYPE_LABELS[req.leave_type]}</p>
                        <p><span className="font-medium">วันที่:</span> {formatDate(req.start_date)} – {formatDate(req.end_date)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">เหตุผล <span className="text-red-500">*</span></label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="กรุณาระบุเหตุผลที่ปฏิเสธ" rows={3}
                            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => reason.trim() && onConfirm(reason)} disabled={!reason.trim() || loading}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60">
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}ยืนยันปฏิเสธ
                        </button>
                        <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium">ยกเลิก</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- Main Page ----
export default function LeaveAdminPage() {
    const searchParams = useSearchParams()
    const urlStatus = searchParams.get('status')
    const legacyFilter = searchParams.get('filter')
    const initialStatus = urlStatus ?? (legacyFilter === 'pending' ? 'pending' : '')
    const confirm = useConfirmDialog()
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [exportLoading, setExportLoading] = useState(false)

    // HR multi-level tab
    const [viewMode, setViewMode] = useState<'all' | 'hr_pending'>('all')
    const [hrRequests, setHrRequests] = useState<HrLeaveReq[]>([])
    const [hrLoading, setHrLoading] = useState(false)
    const [hrRejectTarget, setHrRejectTarget] = useState<HrLeaveReq | null>(null)
    const [hrActionId, setHrActionId] = useState<string | null>(null)
    const [, startHrTransition] = useTransition()

    // Filters
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(currentYear)
    const [month, setMonth] = useState('0')
    const [department, setDepartment] = useState('')
    const [leaveType, setLeaveType] = useState('')
    const [status, setStatus] = useState(initialStatus)

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ year: String(year) })
            if (month !== '0') params.set('month', month)
            if (department) params.set('department', department)
            if (leaveType) params.set('leaveType', leaveType)
            if (status) params.set('status', status)

            const res = await fetch(`/api/leave/requests?${params}`)
            const data = await res.json()
            if (data.data) setRequests(data.data)
        } catch {
            showToast('error', 'ไม่สามารถโหลดข้อมูลได้')
        } finally {
            setLoading(false)
        }
    }, [year, month, department, leaveType, status])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    const fetchHrRequests = useCallback(async () => {
        setHrLoading(true)
        try {
            const res = await fetch('/api/leave/v2/hr-pending')
            const data = await res.json()
            if (data.data) setHrRequests(data.data)
        } catch { /* ignore */ } finally { setHrLoading(false) }
    }, [])

    useEffect(() => { if (viewMode === 'hr_pending') fetchHrRequests() }, [viewMode, fetchHrRequests])

    function handleHrApprove(id: string) {
        setHrActionId(id)
        startHrTransition(async () => {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'approve' }),
            })
            const result = await res.json().catch(() => ({}))
            if (!res.ok) { showToast('error', result.error || 'อนุมัติไม่สำเร็จ') }
            else { showToast('success', 'อนุมัติเสร็จสิ้น — แจ้งพนักงานแล้ว'); fetchHrRequests() }
            setHrActionId(null)
        })
    }

    async function handleHrRejectConfirm(comment: string) {
        if (!hrRejectTarget) return
        const target = hrRejectTarget
        const ok = await confirm({
            title: 'ยืนยันปฏิเสธใบลา (HR)?',
            body: 'พนักงานจะได้รับแจ้งผล (email + 🔔) และระบบจะคืนวันลาที่จองไว้ในสถานะ pending',
            summary: (
                <div className="space-y-1">
                    <p>👤 {target.employee.first_name_th} {target.employee.last_name_th}</p>
                    <p>🌴 {LEAVE_TYPE_LABELS[target.leave_type] ?? target.leave_type} · {formatDate(target.start_date)} – {formatDate(target.end_date)}</p>
                    <p>📝 {comment.length > 90 ? `${comment.slice(0, 90)}…` : comment}</p>
                </div>
            ),
            confirmLabel: 'ปฏิเสธ',
            variant: 'destructive',
        })
        if (!ok) return

        const id = target.id
        setHrActionId(id)
        startHrTransition(async () => {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'reject', reason: comment }),
            })
            const result = await res.json().catch(() => ({}))
            if (!res.ok) { showToast('error', result.error || 'ปฏิเสธไม่สำเร็จ') }
            else { showToast('success', 'ปฏิเสธใบลา พนักงานได้รับแจ้งแล้ว'); setHrRejectTarget(null); fetchHrRequests() }
            setHrActionId(null)
        })
    }

    async function handleApprove(id: string) {
        setActionLoading(id)
        try {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'approve' }),
            })
            const data = await res.json()
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
            const data = await res.json()
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

    async function handleDelete(reqItem: LeaveRequest) {
        const ok = await confirm({
            title: 'ยืนยันลบใบลาถาวร?',
            body: 'การลบนี้จะลบข้อมูลออกจากระบบโดยสิ้นเชิง และจะคืนวันลาสะสมตามสิทธิ์ของพนักงานโดยอัตโนมัติ (ไม่สามารถกู้คืนข้อมูลประวัติหรือแนบไฟล์ได้)',
            summary: (
                <div className="space-y-1">
                    <p>👤 {reqItem.employee.firstNameTH} {reqItem.employee.lastNameTH}</p>
                    <p>🌴 {LEAVE_TYPE_LABELS[reqItem.leaveType] ?? reqItem.leaveType} · {formatDate(reqItem.startDate)} – {formatDate(reqItem.endDate)}</p>
                    <p>สถานะปัจจุบัน: {STATUS_CONFIG[reqItem.status]?.label ?? reqItem.status}</p>
                </div>
            ),
            confirmLabel: 'ลบข้อมูล',
            variant: 'destructive',
        })
        if (!ok) return

        setActionLoading(reqItem.id)
        try {
            const res = await fetch('/api/hradmin/leave/force-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: reqItem.id, action: 'delete' }),
            })
            const data = await res.json()
            if (!res.ok) {
                showToast('error', data.error || 'เกิดข้อผิดพลาดในการลบ')
                return
            }
            showToast('success', 'ลบใบลาและปรับยอดวันลาคืนพนักงานสำเร็จ')
            fetchRequests()
        } catch {
            showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleExport() {
        setExportLoading(true)
        try {
            const params = new URLSearchParams({ year: String(year) })
            if (month !== '0') params.set('month', month)
            if (department) params.set('department', department)
            if (leaveType) params.set('leaveType', leaveType)
            if (status) params.set('status', status)

            const res = await fetch(`/api/leave/export?${params}`)
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `leave_report_${year}${month !== '0' ? `_${month}` : ''}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            showToast('error', 'ไม่สามารถ export ได้')
        } finally {
            setExportLoading(false)
        }
    }

    // Extract unique departments for filter
    const departments = Array.from(new Set(requests.map(r => r.employee.department))).sort()

    // Summary stats
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        totalDays: requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.totalDays, 0),
    }

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
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
            {hrRejectTarget && (
                <HrRejectModal
                    req={hrRejectTarget}
                    onConfirm={handleHrRejectConfirm}
                    onClose={() => setHrRejectTarget(null)}
                    loading={hrActionId === hrRejectTarget.id}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                            <ShieldCheck size={24} />
                            จัดการการลา (HR)
                        </h1>
                        <p className="text-white/70 dark:text-muted-foreground text-sm mt-1">
                            ดูและจัดการการลาของพนักงานทุกคน
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exportLoading || requests.length === 0}
                        className="flex items-center gap-2 bg-white text-primary hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow disabled:opacity-60"
                    >
                        {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        ส่งออก CSV
                    </button>
                </div>

                {/* View Mode Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('all')}
                        className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-colors border',
                            viewMode === 'all'
                                ? 'bg-primary text-primary-foreground border-primary shadow'
                                : 'bg-white dark:bg-card border-border text-foreground hover:bg-muted'
                        )}
                    >
                        รายการทั้งหมด
                    </button>
                    <button
                        onClick={() => setViewMode('hr_pending')}
                        className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border',
                            viewMode === 'hr_pending'
                                ? 'bg-amber-600 text-white border-amber-600 shadow'
                                : 'bg-white dark:bg-card border-border text-foreground hover:bg-muted'
                        )}
                    >
                        <Clock size={14} />
                        รออนุมัติโดย HR
                        {hrRequests.length > 0 && viewMode !== 'hr_pending' && (
                            <span className="bg-amber-100 text-amber-700 text-xs font-black px-1.5 py-0.5 rounded-full">
                                {hrRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* HR Pending View */}
                {viewMode === 'hr_pending' && (
                    <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <Clock size={16} className="text-amber-500" />
                                ใบลาที่รอ HR อนุมัติ
                            </h2>
                            <span className="text-xs text-muted-foreground">{hrRequests.length} รายการ</span>
                        </div>
                        {hrLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="animate-spin text-primary" size={24} />
                            </div>
                        ) : hrRequests.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">ไม่มีใบลาที่รอ HR อนุมัติ</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {hrRequests.map(req => (
                                    <HrLeaveCard
                                        key={req.id}
                                        req={req}
                                        onApprove={handleHrApprove}
                                        onReject={setHrRejectTarget}
                                        actionId={hrActionId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'all' && <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'รายการทั้งหมด', value: stats.total, cardClass: 'bg-white dark:bg-card border-border', valueClass: 'text-foreground', labelClass: 'text-muted-foreground' },
                        { label: 'รออนุมัติ', value: stats.pending, cardClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', valueClass: 'text-amber-700 dark:text-amber-300', labelClass: 'text-amber-700/75 dark:text-amber-200/75' },
                        { label: 'อนุมัติแล้ว', value: stats.approved, cardClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', valueClass: 'text-green-700 dark:text-green-300', labelClass: 'text-green-700/75 dark:text-green-200/75' },
                        { label: 'วันลา (อนุมัติ)', value: `${stats.totalDays} วัน`, cardClass: 'bg-rose-50 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800', valueClass: 'text-rose-700 dark:text-rose-300', labelClass: 'text-rose-700/75 dark:text-rose-200/75' },
                    ].map(({ label, value, cardClass, valueClass, labelClass }) => (
                        <div key={label} className={`${cardClass} rounded-xl border p-4`}>
                            <p className={`text-2xl font-black leading-none ${valueClass}`}>{value}</p>
                            <p className={`text-xs font-semibold mt-1 ${labelClass}`}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={16} className="text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">กรองข้อมูล</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <SelectFilter
                            value={String(year)}
                            onChange={v => setYear(parseInt(v))}
                            label="ปี"
                            options={[
                                { value: String(currentYear), label: `ปี ${currentYear + 543}` },
                                { value: String(currentYear - 1), label: `ปี ${currentYear - 1 + 543}` },
                            ]}
                        />
                        <SelectFilter
                            value={month}
                            onChange={setMonth}
                            label="เดือน"
                            options={[
                                { value: '0', label: 'ทุกเดือน' },
                                ...MONTHS.slice(1).map((m, i) => ({ value: String(i + 1), label: m })),
                            ]}
                        />
                        <SelectFilter
                            value={department}
                            onChange={setDepartment}
                            label="แผนก"
                            options={[
                                { value: '', label: 'ทุกแผนก' },
                                ...departments.map(d => ({ value: d, label: d })),
                            ]}
                        />
                        <SelectFilter
                            value={leaveType}
                            onChange={setLeaveType}
                            label="ประเภทลา"
                            options={[
                                { value: '', label: 'ทุกประเภท' },
                                ...Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
                            ]}
                        />
                        <SelectFilter
                            value={status}
                            onChange={setStatus}
                            label="สถานะ"
                            options={[
                                { value: '', label: 'ทุกสถานะ' },
                                { value: 'pending', label: 'รออนุมัติ' },
                                { value: 'approved', label: 'อนุมัติ' },
                                { value: 'rejected', label: 'ปฏิเสธ' },
                                { value: 'cancelled', label: 'ยกเลิก' },
                            ]}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h2 className="font-bold text-foreground">รายการลาทั้งหมด</h2>
                        <span className="text-xs text-muted-foreground">{requests.length} รายการ</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="animate-spin text-primary" size={28} />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">ไม่พบรายการลา</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">พนักงาน</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">แผนก</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ประเภทลา</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">วันที่</th>
                                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">จำนวน</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">สถานะ</th>
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(req => {
                                            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
                                            return (
                                                <tr key={req.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                <User size={14} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="font-medium text-foreground">{req.employee.firstNameTH} {req.employee.lastNameTH}</p>
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
                                                                <p className="text-xs text-muted-foreground">{req.employee.employeeCode}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{req.employee.department}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}>
                                                            {LEAVE_TYPE_LABELS[req.leaveType]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                        {formatDate(req.startDate)}<br />
                                                        <span className="text-xs">ถึง {formatDate(req.endDate)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-foreground">{req.totalDays}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                                                            {statusCfg.icon}
                                                            {statusCfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {req.status === 'pending' ? (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleApprove(req.id)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-60 transition-colors"
                                                                >
                                                                    {actionLoading === req.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                                                    อนุมัติ
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectTarget(req)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-60 transition-colors"
                                                                >
                                                                    <XCircle size={10} />
                                                                    ปฏิเสธ
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(req)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="flex items-center gap-1 bg-neutral-600 hover:bg-neutral-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-60 transition-colors"
                                                                    title="ลบใบลาถาวร"
                                                                >
                                                                    <Trash2 size={10} />
                                                                    ลบ
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">
                                                                    {req.approver?.name || '—'}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDelete(req)}
                                                                    disabled={actionLoading === req.id}
                                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                                    title="ลบใบลาถาวร"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="lg:hidden divide-y divide-border">
                                {requests.map(req => {
                                    const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
                                    return (
                                        <div key={req.id} className="p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <User size={14} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">{req.employee.firstNameTH} {req.employee.lastNameTH}</p>
                                                        <p className="text-xs text-muted-foreground">{req.employee.department}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}>
                                                        {LEAVE_TYPE_LABELS[req.leaveType]}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </span>
                                                    {req.status !== 'pending' && (
                                                        <button
                                                            onClick={() => handleDelete(req)}
                                                            disabled={actionLoading === req.id}
                                                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
                                                            title="ลบใบลาถาวร"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.totalDays} วัน)
                                            </p>
                                            {req.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(req.id)}
                                                        disabled={actionLoading === req.id}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60 transition-colors"
                                                    >
                                                        {actionLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                        อนุมัติ
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectTarget(req)}
                                                        disabled={actionLoading === req.id}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60 transition-colors"
                                                    >
                                                        <XCircle size={12} />
                                                        ปฏิเสธ
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req)}
                                                        disabled={actionLoading === req.id}
                                                        className="flex items-center justify-center bg-neutral-600 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                req.approver?.name && (
                                                    <p className="text-xs text-muted-foreground">
                                                        ผู้อนุมัติ: {req.approver.name}
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
                </>}
            </div>
        </>
    )
}
