'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    ShieldCheck, Download, Filter, CheckCircle2, XCircle,
    Clock, CalendarDays, User, Loader2, X, AlertCircle, ChevronDown
} from 'lucide-react'

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

// ---- Main Page ----
export default function LeaveAdminPage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [exportLoading, setExportLoading] = useState(false)

    // Filters
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(currentYear)
    const [month, setMonth] = useState('0')
    const [department, setDepartment] = useState('')
    const [leaveType, setLeaveType] = useState('')
    const [status, setStatus] = useState('')

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

    async function handleApprove(id: string) {
        setActionLoading(id)
        try {
            const res = await fetch(`/api/leave/requests/${id}/approve`, { method: 'POST' })
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
        setActionLoading(rejectTarget.id)
        try {
            const res = await fetch(`/api/leave/requests/${rejectTarget.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: reason }),
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

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'รายการทั้งหมด', value: stats.total, color: 'bg-white dark:bg-card border-border' },
                        { label: 'รออนุมัติ', value: stats.pending, color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' },
                        { label: 'อนุมัติแล้ว', value: stats.approved, color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
                        { label: 'วันลา (อนุมัติ)', value: `${stats.totalDays} วัน`, color: 'bg-primary/5 dark:bg-primary/10 border-primary/20 text-primary' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className={`${color} rounded-xl border p-4`}>
                            <p className="text-2xl font-bold">{value}</p>
                            <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
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
                                                                <p className="font-medium text-foreground">{req.employee.firstNameTH} {req.employee.lastNameTH}</p>
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
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                {req.approver?.name || '—'}
                                                            </span>
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
                                                <div className="flex gap-2">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}>
                                                        {LEAVE_TYPE_LABELS[req.leaveType]}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.totalDays} วัน)
                                            </p>
                                            {req.status === 'pending' && (
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
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
