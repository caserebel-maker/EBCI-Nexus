'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    CalendarDays, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
    ChevronDown, X, Loader2, FileText
} from 'lucide-react'

// ---- Types ----
interface LeaveBalance {
    leaveType: string
    year: number
    entitledDays: number
    usedDays: number
    remainingDays: number
}

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
    pending: {
        label: 'รออนุมัติ',
        color: 'bg-amber-100 text-amber-700',
        icon: <Clock size={14} />,
    },
    approved: {
        label: 'อนุมัติแล้ว',
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle2 size={14} />,
    },
    rejected: {
        label: 'ปฏิเสธ',
        color: 'bg-red-100 text-red-700',
        icon: <XCircle size={14} />,
    },
    cancelled: {
        label: 'ยกเลิก',
        color: 'bg-gray-100 text-gray-600',
        icon: <X size={14} />,
    },
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

// ---- Balance Card Component ----
function BalanceCard({ balance }: { balance: LeaveBalance }) {
    const pct = balance.entitledDays > 0
        ? Math.min(100, (balance.usedDays / balance.entitledDays) * 100)
        : 0
    const color = LEAVE_TYPE_COLORS[balance.leaveType] || 'bg-gray-100 text-gray-700'

    return (
        <div className="bg-white dark:bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
                    {LEAVE_TYPE_LABELS[balance.leaveType]}
                </span>
                <span className="text-xs text-muted-foreground">ปี {balance.year}</span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-bold text-foreground">{balance.remainingDays}</p>
                    <p className="text-xs text-muted-foreground">วันคงเหลือ</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                    <p>ใช้ไป {balance.usedDays} / {balance.entitledDays} วัน</p>
                </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
                <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

// ---- Leave Request Row ----
function LeaveRow({ req }: { req: LeaveRequest }) {
    const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEAVE_TYPE_COLORS[req.leaveType] || 'bg-gray-100 text-gray-700'}`}>
                        {LEAVE_TYPE_LABELS[req.leaveType]}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.icon}
                        {status.label}
                    </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    <span className="ml-2 text-xs text-muted-foreground">({req.totalDays} วัน)</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.reason}</p>
                {req.status === 'rejected' && req.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">
                        เหตุผล: {req.rejectionReason}
                    </p>
                )}
                {req.status === 'approved' && req.approver?.name && (
                    <p className="text-xs text-green-700 mt-1">
                        อนุมัติโดย: {req.approver.name}
                    </p>
                )}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
                ยื่นเมื่อ {formatDate(req.createdAt)}
            </div>
        </div>
    )
}

// ---- Main Page ----
export default function EmployeeLeavePage() {
    const [balances, setBalances] = useState<LeaveBalance[]>([])
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Form state
    const [leaveType, setLeaveType] = useState('sick')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [balRes, reqRes] = await Promise.all([
                fetch('/api/leave/balances'),
                fetch('/api/leave/requests'),
            ])
            const [balData, reqData] = await Promise.all([balRes.json(), reqRes.json()])
            if (balData.data) setBalances(balData.data)
            if (reqData.data) setRequests(reqData.data)
        } catch {
            setError('ไม่สามารถโหลดข้อมูลได้')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!leaveType || !startDate || !endDate || !reason.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน')
            return
        }
        setSubmitting(true)
        setError('')
        try {
            const res = await fetch('/api/leave/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveType, startDate, endDate, reason }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด')
                return
            }
            setSuccessMsg('ยื่นใบลาสำเร็จ! รอการอนุมัติจากหัวหน้า')
            setShowForm(false)
            setLeaveType('sick')
            setStartDate('')
            setEndDate('')
            setReason('')
            fetchData()
            setTimeout(() => setSuccessMsg(''), 5000)
        } catch {
            setError('เกิดข้อผิดพลาดในการส่งข้อมูล')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                        <CalendarDays size={24} />
                        การลาของฉัน
                    </h1>
                    <p className="text-white/70 dark:text-muted-foreground text-sm mt-1">
                        ยื่นใบลา ดูโควตา และประวัติการลา
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setError('') }}
                    className="flex items-center gap-2 bg-white text-primary hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow"
                >
                    <Plus size={16} />
                    ยื่นใบลา
                </button>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">
                    <CheckCircle2 size={16} />
                    {successMsg}
                </div>
            )}

            {/* Leave Request Form */}
            {showForm && (
                <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="font-bold text-foreground flex items-center gap-2">
                            <FileText size={18} />
                            ยื่นใบลา
                        </h2>
                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Leave Type */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                ประเภทการลา <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={leaveType}
                                    onChange={e => setLeaveType(e.target.value)}
                                    className="w-full appearance-none bg-background border border-input rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                            {/* Show remaining balance for selected type */}
                            {(() => {
                                const bal = balances.find(b => b.leaveType === leaveType)
                                if (bal) return (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        คงเหลือ: <span className="font-semibold text-foreground">{bal.remainingDays}</span> วัน
                                        (ใช้ไปแล้ว {bal.usedDays}/{bal.entitledDays} วัน)
                                    </p>
                                )
                            })()}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    วันที่เริ่มลา <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    วันที่สิ้นสุด <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate || new Date().toISOString().split('T')[0]}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                เหตุผล <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="กรุณาระบุเหตุผลในการลา"
                                rows={3}
                                className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                {submitting ? 'กำลังส่ง...' : 'ยื่นใบลา'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError('') }}
                                className="px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Leave Balances */}
            <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-foreground">โควตาการลาปีนี้</h2>
                </div>
                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {balances.map(bal => (
                        <BalanceCard key={bal.leaveType} balance={bal} />
                    ))}
                </div>
            </div>

            {/* Leave History */}
            <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold text-foreground">ประวัติการลา</h2>
                    <span className="text-xs text-muted-foreground">{requests.length} รายการ</span>
                </div>
                <div className="px-6">
                    {requests.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">ยังไม่มีรายการลา</p>
                        </div>
                    ) : (
                        requests.map(req => <LeaveRow key={req.id} req={req} />)
                    )}
                </div>
            </div>
        </div>
    )
}
