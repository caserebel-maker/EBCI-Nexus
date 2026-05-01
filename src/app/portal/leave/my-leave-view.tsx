'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
    CalendarDays, Plus, CheckCircle2, XCircle, Clock, Ban, Loader2, AlertCircle,
    X, ChevronRight, ChevronLeft, UploadCloud, Paperclip, Info,
    Palmtree, User, Heart, GraduationCap, Cross, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ValidationToast } from '@/components/ui/validation-toast'
import { WORK_SCHEDULE, HALF_DAY_RULES } from '@/lib/leave-constants'

// ── Validation field IDs + Thai labels ────────────────────────────────────────
// Used by both validate() and the per-input red-border styling so the toast
// list and the highlighted inputs stay consistent without duplicating labels.
type FieldId = 'leaveType' | 'startDate' | 'endDate' | 'reason' | 'approver' | 'attachment'

const FIELD_LABEL: Record<FieldId, string> = {
    leaveType: 'ประเภทการลา',
    startDate: 'วันที่เริ่มลา',
    endDate: 'วันที่สิ้นสุดลา',
    reason: 'เหตุผลการลา',
    approver: 'ผู้บังคับบัญชา',
    attachment: 'เอกสารใบรับรองแพทย์',
}

const FIELD_STEP: Record<FieldId, 1 | 2 | 3> = {
    leaveType: 1,
    startDate: 2,
    endDate: 2,
    reason: 2,
    approver: 2,
    attachment: 3,
}

// ── Types (mirror API responses) ──────────────────────────────────────────────
interface BalanceEntry {
    leave_type_id: string
    name_th: string
    name_en: string | null
    icon: string | null
    color: string | null
    is_unlimited: boolean
    requires_attachment: boolean
    attachment_description: string | null
    advance_notice_days: number
    same_day_allowed: boolean
    display_order: number
    total_days: number
    used_days: number
    pending_days: number
    remaining_days: number
}

interface LeaveRequest {
    id: string
    reference_code: string
    leave_type_id: string
    start_date: string
    end_date: string
    total_days: number
    is_half_day: boolean | null
    half_day_period: string | null
    reason: string
    contact_during_leave: string | null
    attachment_url: string | null
    attachment_name: string | null
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancellation_requested'
    approver_id: string | null
    approver_name: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    submitted_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    /** Set when employee files §1.4 cancel-request on an approved leave. */
    cancellation_requested_at: string | null
    /** Reason supplied by the approver when resolving a cancel request. */
    cancellation_decision_reason: string | null
    created_at: string
}

type StatusFilter = 'all' | LeaveRequest['status']

// ── Leave-type icon map (DB.icon is just a hint; we use Lucide by id) ─────────
const LEAVE_ICON: Record<string, typeof Palmtree> = {
    annual: Palmtree,
    personal: User,
    sick: Heart,
    marriage: Heart,
    bereavement: Cross,
    training: GraduationCap,
}

function requiresAttachmentForSelection(type: BalanceEntry | null, totalDays: number): boolean {
    if (!type) return false
    if (type.leave_type_id === 'sick') return totalDays >= 3
    return !!type.requires_attachment
}

function attachmentHint(type: BalanceEntry, totalDays: number): string {
    if (type.leave_type_id === 'sick') {
        return totalDays >= 3
            ? 'ลาป่วยตั้งแต่ 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์'
            : 'ลาป่วยไม่เกิน 2 วัน แนบใบรับรองแพทย์ได้ถ้ามี แต่ไม่บังคับ'
    }
    if (type.requires_attachment) {
        return type.attachment_description
            ? `ต้องแนบเอกสาร — ${type.attachment_description}`
            : 'ประเภทนี้ต้องแนบเอกสารประกอบ'
    }
    return 'เอกสารแนบเป็น optional — ข้ามไปยังขั้นตอนถัดไปได้'
}

// ── Small style tokens ────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatThaiDateRange(start: string, end: string): string {
    return start === end ? formatThaiDate(start) : `${formatThaiDate(start)} – ${formatThaiDate(end)}`
}
function formatThaiDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function todayBangkokIso(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(0, 10)
}
function daysInclusive(start: string, end: string, half: boolean): number {
    if (half) return 0.5
    const s = new Date(start + 'T00:00:00').getTime()
    const e = new Date(end + 'T00:00:00').getTime()
    if (isNaN(s) || isNaN(e) || e < s) return 0
    return Math.round((e - s) / 86400000) + 1
}

// ── Main view ─────────────────────────────────────────────────────────────────
interface Props {
    year: number
}

export function MyLeaveView({ year }: Props) {
    const [balances, setBalances] = useState<BalanceEntry[]>([])
    const [requests, setRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [tab, setTab] = useState<StatusFilter>('all')
    const [filterType, setFilterType] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [detail, setDetail] = useState<LeaveRequest | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const loadAll = useCallback(async () => {
        setErr(null)
        setLoading(true)
        try {
            const [balRes, reqRes] = await Promise.all([
                fetch(`/api/leave/balance/${year}`, { cache: 'no-store' }),
                fetch('/api/leave/my', { cache: 'no-store' }),
            ])
            if (!balRes.ok) throw new Error('โหลดยอดวันลาไม่สำเร็จ')
            if (!reqRes.ok) throw new Error('โหลดประวัติการลาไม่สำเร็จ')
            const balJson = await balRes.json()
            const reqJson = await reqRes.json()
            setBalances((balJson.balances ?? []).sort((a: BalanceEntry, b: BalanceEntry) => a.display_order - b.display_order))
            setRequests(reqJson.items ?? [])
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }, [year])

    useEffect(() => { void loadAll() }, [loadAll])

    const counts = useMemo(() => {
        const c: Record<StatusFilter, number> = {
            all: requests.length,
            pending: 0, approved: 0, rejected: 0, cancelled: 0,
            cancellation_requested: 0,
        }
        for (const r of requests) c[r.status]++
        return c
    }, [requests])

    const visibleRequests = useMemo(() => {
        return requests.filter(r =>
            (tab === 'all' || r.status === tab)
            && (!filterType || r.leave_type_id === filterType)
        )
    }, [requests, tab, filterType])

    const filterTypeName: string | null = filterType
        ? balances.find(b => b.leave_type_id === filterType)?.name_th ?? null
        : null

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <CalendarDays size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">การลาของฉัน</h1>
                    <p className="text-sm text-white/50">ยื่นใบลา · ดูยอดคงเหลือและประวัติ · ปี {year + 543}</p>
                </div>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {/* Balance cards */}
            <BalanceGrid
                balances={balances}
                loading={loading}
                selectedId={filterType}
                onSelect={id => setFilterType(cur => cur === id ? null : id)}
            />

            {/* Action button */}
            <button
                type="button"
                onClick={() => setFormOpen(true)}
                disabled={loading || balances.length === 0}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-white font-bold shadow-lg shadow-[#882136]/40 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#561e23 0%,#ad5f6c 100%)' }}
            >
                <Plus size={17} />
                ยื่นใบลาใหม่
            </button>

            {/* Status tabs */}
            <StatusTabs tab={tab} onChange={setTab} counts={counts} filterTypeName={filterTypeName} onClearType={() => setFilterType(null)} />

            {/* Requests list */}
            <RequestsList
                loading={loading}
                requests={visibleRequests}
                balances={balances}
                onRowClick={setDetail}
            />

            {formOpen && (
                <NewLeaveModal
                    balances={balances}
                    onClose={() => setFormOpen(false)}
                    onSuccess={(msg) => {
                        setFormOpen(false)
                        setToast(msg)
                        void loadAll()
                        window.setTimeout(() => setToast(null), 5000)
                    }}
                />
            )}
            {detail && (
                <LeaveDetailModal
                    request={detail}
                    balance={balances.find(b => b.leave_type_id === detail.leave_type_id) ?? null}
                    onClose={() => setDetail(null)}
                    onCancelled={() => {
                        setDetail(null)
                        void loadAll()
                        setToast('ยกเลิกใบลาเรียบร้อย')
                        window.setTimeout(() => setToast(null), 4000)
                    }}
                />
            )}

            {toast && (
                <div
                    role="status"
                    className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl text-sm text-white font-semibold shadow-xl border border-emerald-400/40"
                    style={{ background: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)' }}
                >
                    <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                    {toast}
                </div>
            )}
        </div>
    )
}

// ── Balance grid ─────────────────────────────────────────────────────────────
function BalanceGrid({
    balances, loading, selectedId, onSelect,
}: {
    balances: BalanceEntry[]
    loading: boolean
    selectedId: string | null
    onSelect: (id: string) => void
}) {
    if (loading && balances.length === 0) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="p-4 h-28 animate-pulse" style={glass} />
                ))}
            </div>
        )
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {balances.map(b => {
                const Icon = LEAVE_ICON[b.leave_type_id] ?? CalendarDays
                const isSelected = selectedId === b.leave_type_id
                const percent = b.is_unlimited || b.total_days === 0
                    ? 0
                    : Math.min(100, ((b.used_days + b.pending_days) / b.total_days) * 100)
                return (
                    <button
                        key={b.leave_type_id}
                        type="button"
                        onClick={() => onSelect(b.leave_type_id)}
                        className={cn(
                            'p-3.5 text-left transition-all active:scale-[0.98]',
                            isSelected ? 'ring-2 ring-amber-300/70' : 'hover:bg-white/10',
                        )}
                        style={{
                            ...glass,
                            borderColor: isSelected ? 'rgba(252,211,77,0.6)' : glass.border as string,
                        }}
                    >
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <span
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
                                style={{ background: b.color ?? '#882136' }}
                            >
                                <Icon size={15} strokeWidth={2} />
                            </span>
                        </div>
                        <p className="text-xs font-bold text-white leading-tight">{b.name_th}</p>
                        <p className="mt-1.5 text-white tabular-nums">
                            {b.is_unlimited ? (
                                <span className="text-lg font-bold text-emerald-200">ไม่จำกัด</span>
                            ) : (
                                <>
                                    <span className="text-lg font-bold">{b.remaining_days}</span>
                                    <span className="text-white/50 text-xs ml-1">/ {b.total_days}</span>
                                </>
                            )}
                        </p>
                        {!b.is_unlimited && b.total_days > 0 && (
                            <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${percent}%`, background: b.color ?? '#ad5f6c' }}
                                />
                            </div>
                        )}
                        {b.pending_days > 0 && (
                            <p className="text-[10px] text-amber-200 mt-1">รอ {b.pending_days} วัน</p>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

// ── Tabs + type filter chip ──────────────────────────────────────────────────
function StatusTabs({
    tab, onChange, counts, filterTypeName, onClearType,
}: {
    tab: StatusFilter
    onChange: (t: StatusFilter) => void
    counts: Record<StatusFilter, number>
    filterTypeName: string | null
    onClearType: () => void
}) {
    const tabs: Array<{ key: StatusFilter; label: string; icon: typeof Clock }> = [
        { key: 'all', label: 'ทั้งหมด', icon: CalendarDays },
        { key: 'pending', label: 'รออนุมัติ', icon: Clock },
        { key: 'approved', label: 'อนุมัติแล้ว', icon: CheckCircle2 },
        { key: 'rejected', label: 'ปฏิเสธ', icon: XCircle },
        { key: 'cancelled', label: 'ยกเลิก', icon: Ban },
    ]
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5 w-full overflow-x-auto">
                {tabs.map(t => {
                    const isOn = tab === t.key
                    const Icon = t.icon
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onChange(t.key)}
                            className={cn(
                                'whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                isOn ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40' : 'text-white/65 hover:bg-white/5 hover:text-white',
                            )}
                        >
                            <Icon size={13} />
                            {t.label}
                            <span className={cn('text-[10px] font-bold px-1.5 rounded-md', isOn ? 'bg-white/20' : 'bg-white/10 text-white/60')}>
                                {counts[t.key]}
                            </span>
                        </button>
                    )
                })}
            </div>
            {filterTypeName && (
                <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-100 text-xs">
                    <Info size={12} />
                    กรอง: {filterTypeName}
                    <button type="button" onClick={onClearType} aria-label="ล้างตัวกรอง">
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Requests list ────────────────────────────────────────────────────────────
function RequestsList({
    loading, requests, balances, onRowClick,
}: {
    loading: boolean
    requests: LeaveRequest[]
    balances: BalanceEntry[]
    onRowClick: (r: LeaveRequest) => void
}) {
    if (loading) {
        return (
            <div className="p-10 text-center text-white/50" style={glass}>
                <Loader2 size={28} className="animate-spin mx-auto mb-2 text-white/40" />
                กำลังโหลด...
            </div>
        )
    }
    if (requests.length === 0) {
        return (
            <div className="p-10 text-center text-white/50" style={glass}>
                <CalendarDays size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ไม่มีใบลาในหมวดนี้</p>
            </div>
        )
    }
    return (
        <ul className="space-y-2">
            {requests.map(r => {
                const bal = balances.find(b => b.leave_type_id === r.leave_type_id)
                const Icon = LEAVE_ICON[r.leave_type_id] ?? CalendarDays
                return (
                    <li key={r.id}>
                        <button
                            type="button"
                            onClick={() => onRowClick(r)}
                            className="w-full text-left px-3 sm:px-4 py-3 rounded-xl flex items-center gap-3 transition-all active:scale-[0.995]"
                            style={glass}
                        >
                            <span
                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                                style={{ background: bal?.color ?? '#882136' }}
                            >
                                <Icon size={17} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-xs font-mono text-amber-200 tabular-nums">
                                        {r.reference_code}
                                    </span>
                                    <StatusBadge status={r.status} />
                                </div>
                                <p className="text-white font-semibold text-sm truncate">
                                    {bal?.name_th ?? r.leave_type_id} · {formatThaiDateRange(r.start_date, r.end_date)}
                                </p>
                                <p className="text-[11px] text-white/55 truncate">
                                    {r.total_days} วัน · ยื่น {formatThaiDateTime(r.submitted_at ?? r.created_at)}
                                    {r.approver_name ? ` · ผู้อนุมัติ ${r.approver_name}` : ''}
                                </p>
                            </div>
                            <ChevronRight size={14} className="text-white/40 shrink-0" />
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
    const meta = {
        pending:                { label: 'รออนุมัติ',   cls: 'bg-amber-500/25 text-amber-100',     icon: Clock },
        approved:               { label: 'อนุมัติแล้ว', cls: 'bg-emerald-500/25 text-emerald-200', icon: CheckCircle2 },
        rejected:               { label: 'ปฏิเสธ',      cls: 'bg-red-500/25 text-red-200',         icon: XCircle },
        cancelled:              { label: 'ยกเลิก',      cls: 'bg-white/10 text-white/60',          icon: Ban },
        cancellation_requested: { label: 'รอยกเลิก',    cls: 'bg-amber-500/15 text-amber-200',     icon: Ban },
    }[status]
    const Icon = meta.icon
    return (
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', meta.cls)}>
            <Icon size={10} />
            {meta.label}
        </span>
    )
}

// ── Detail modal ─────────────────────────────────────────────────────────────
function LeaveDetailModal({
    request, balance, onClose, onCancelled,
}: {
    request: LeaveRequest
    balance: BalanceEntry | null
    onClose: () => void
    onCancelled: () => void
}) {
    const [cancelling, setCancelling] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelError, setCancelError] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    const handleCancel = async () => {
        if (!confirm(`ยกเลิกใบลา ${request.reference_code} ใช่หรือไม่?`)) return
        setCancelling(true)
        setCancelError(null)
        try {
            const res = await fetch(`/api/leave/${request.id}/cancel`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ reason: cancelReason.trim() || null }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'ยกเลิกไม่สำเร็จ')
            onCancelled()
        } catch (e) {
            setCancelError(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ')
        } finally {
            setCancelling(false)
        }
    }

    /**
     * §1.4 — request-cancellation flow for ALREADY-APPROVED leave.
     * Different endpoint, different status transition (approved →
     * cancellation_requested), needs approver sign-off before the
     * row actually flips to 'cancelled'.
     */
    const handleRequestCancellation = async () => {
        if (!cancelReason.trim()) {
            setCancelError('กรุณาระบุเหตุผลในการขอยกเลิก')
            return
        }
        if (!confirm(`ส่งคำขอยกเลิกใบลา ${request.reference_code} ใช่หรือไม่? ผู้อนุมัติจะพิจารณาคำขอนี้`)) return
        setCancelling(true)
        setCancelError(null)
        try {
            const res = await fetch(`/api/leave/${request.id}/request-cancellation`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ reason: cancelReason.trim() }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'ส่งคำขอไม่สำเร็จ')
            onCancelled() // reuses the parent's "refresh + close" callback
        } catch (e) {
            setCancelError(e instanceof Error ? e.message : 'ส่งคำขอไม่สำเร็จ')
        } finally {
            setCancelling(false)
        }
    }

    const canCancel = request.status === 'pending'
    const canRequestCancellation = request.status === 'approved'
    const Icon = LEAVE_ICON[request.leave_type_id] ?? CalendarDays

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto relative"
                style={{ background: 'rgba(86,30,35,0.77)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center z-10" aria-label="ปิด">
                    <X size={17} />
                </button>
                <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <span className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: balance?.color ?? '#882136' }}>
                            <Icon size={19} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-mono text-amber-200 tabular-nums">{request.reference_code}</p>
                            <h2 className="text-lg font-bold text-white leading-tight">{balance?.name_th ?? request.leave_type_id}</h2>
                            <StatusBadge status={request.status} />
                        </div>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <Field label="วันที่ลา" value={formatThaiDateRange(request.start_date, request.end_date)} />
                        <Field label="จำนวนวัน" value={`${request.total_days} วัน${request.is_half_day ? ` (ครึ่งวัน - ${request.half_day_period === 'morning' ? 'เช้า' : 'บ่าย'})` : ''}`} />
                        <Field label="ยื่นเมื่อ" value={formatThaiDateTime(request.submitted_at ?? request.created_at)} />
                        <Field label="ผู้อนุมัติ" value={request.approver_name ?? '—'} />
                        {request.contact_during_leave && (
                            <Field label="ช่องทางติดต่อ" value={request.contact_during_leave} />
                        )}
                    </dl>

                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1">เหตุผล</p>
                        <p className="text-sm text-white/85 whitespace-pre-wrap">{request.reason}</p>
                    </div>

                    {request.attachment_url && (
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold mb-1.5">เอกสารแนบ</p>
                            <a
                                href={request.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/15"
                            >
                                <Paperclip size={14} />
                                {request.attachment_name ?? 'เปิดไฟล์แนบ'}
                            </a>
                        </div>
                    )}

                    {request.status === 'approved' && request.approval_notes && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <p className="text-xs font-bold text-emerald-200 mb-1">หมายเหตุจากผู้อนุมัติ</p>
                            <p className="text-sm text-emerald-100 whitespace-pre-wrap">{request.approval_notes}</p>
                        </div>
                    )}
                    {request.status === 'rejected' && request.rejection_reason && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-xs font-bold text-red-200 mb-1">เหตุผลที่ปฏิเสธ</p>
                            <p className="text-sm text-red-100 whitespace-pre-wrap">{request.rejection_reason}</p>
                        </div>
                    )}
                    {request.status === 'cancelled' && request.cancellation_reason && (
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-xs font-bold text-white/70 mb-1">เหตุผลยกเลิก</p>
                            <p className="text-sm text-white/80 whitespace-pre-wrap">{request.cancellation_reason}</p>
                        </div>
                    )}
                    {/* §1.4 — show pending-cancellation context. The status
                        is `cancellation_requested` (request filed but the
                        approver hasn't decided), or `approved` after a
                        rejection (cancellation_decision_reason is set
                        meaning the request was reviewed and turned down). */}
                    {request.status === 'cancellation_requested' && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <p className="text-xs font-bold text-amber-200 mb-1">รอผลการพิจารณายกเลิก</p>
                            <p className="text-sm text-amber-100">
                                คำขอยกเลิกถูกส่งไปยังผู้อนุมัติแล้ว · รอผลการพิจารณา
                            </p>
                            {request.cancellation_reason && (
                                <p className="mt-2 text-sm text-amber-100 whitespace-pre-wrap">
                                    เหตุผล: {request.cancellation_reason}
                                </p>
                            )}
                        </div>
                    )}
                    {request.status === 'approved' && request.cancellation_decision_reason && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-xs font-bold text-red-200 mb-1">คำขอยกเลิกถูกปฏิเสธ</p>
                            <p className="text-sm text-red-100 whitespace-pre-wrap">
                                เหตุผล: {request.cancellation_decision_reason}
                            </p>
                        </div>
                    )}

                    {canCancel && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                เหตุผลยกเลิก (ถ้ามี)
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                rows={2}
                                placeholder="เช่น เปลี่ยนแผน / ยื่นผิดวัน"
                                className="w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-amber-300/50"
                            />
                            {cancelError && <p className="text-red-300 text-sm">{cancelError}</p>}
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="w-full h-11 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-60 text-white font-bold inline-flex items-center justify-center gap-2"
                            >
                                {cancelling ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                                ยกเลิกใบลา
                            </button>
                        </div>
                    )}
                    {/* §1.4 — request-cancellation for ALREADY-approved leave.
                        Distinct CTA + reason required. The flow goes to the
                        approver, not to instant cancellation. */}
                    {canRequestCancellation && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                เหตุผลในการขอยกเลิก <span className="text-red-300">*</span>
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                rows={3}
                                placeholder="เช่น เปลี่ยนแผน / มีงานด่วน — ผู้อนุมัติจะพิจารณาคำขอนี้"
                                className="w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-amber-300/50"
                            />
                            {cancelError && <p className="text-red-300 text-sm">{cancelError}</p>}
                            <p className="text-[11px] text-white/55 leading-relaxed">
                                ใบลานี้อนุมัติแล้ว — ระบบจะส่งคำขอยกเลิกไปยังผู้อนุมัติเพื่อพิจารณา
                                ถ้าวันลายังไม่ถึง ระบบจะคืนวันลาให้อัตโนมัติเมื่ออนุมัติ
                            </p>
                            <button
                                type="button"
                                onClick={handleRequestCancellation}
                                disabled={cancelling || !cancelReason.trim()}
                                className="w-full h-11 rounded-lg bg-amber-500/85 hover:bg-amber-500 disabled:opacity-60 text-[#1a0a0d] font-bold inline-flex items-center justify-center gap-2"
                            >
                                {cancelling ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                                ส่งคำขอยกเลิก
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[11px] uppercase tracking-wider text-white/50 font-bold">{label}</dt>
            <dd className="text-sm text-white mt-0.5">{value}</dd>
        </div>
    )
}

// ── New leave modal (4 steps) ────────────────────────────────────────────────
type NewLeaveStep = 1 | 2 | 3 | 4

interface ApproverChainStep {
    id: string
    name: string
    role: 'supervisor' | 'manager' | 'hr' | 'md'
    role_label: string
}

function NewLeaveModal({
    balances, onClose, onSuccess,
}: {
    balances: BalanceEntry[]
    onClose: () => void
    onSuccess: (msg: string) => void
}) {
    const [step, setStep] = useState<NewLeaveStep>(1)
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isHalfDay, setIsHalfDay] = useState(false)
    const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning')
    const [reason, setReason] = useState('')
    const [contact, setContact] = useState('')
    const [attachment, setAttachment] = useState<File | null>(null)
    const [submitting, startSubmitTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    // Client-side validation state. errorFields drives the red border on
    // individual inputs; missingFields + validationOpen drive the centred
    // toast. Both stay in sync via validate() + clearFieldError().
    const [validationOpen, setValidationOpen] = useState(false)
    const [missingFields, setMissingFields] = useState<string[]>([])
    const [errorFields, setErrorFields] = useState<Set<FieldId>>(new Set())

    const clearFieldError = useCallback((id: FieldId) => {
        setErrorFields((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }, [])

    // Fetch the approval chain once when the modal opens. This is
    // read-only — the form just shows the user where the request will
    // route. The actual chain that fires at submit time is computed
    // server-side again in lib/leave-approval-actions; we don't trust
    // anything from the client about routing.
    const [approverChain, setApproverChain] = useState<ApproverChainStep[] | null>(null)
    useEffect(() => {
        let cancelled = false
        fetch('/api/leave/approver-chain', { cache: 'no-store' })
            .then(r => r.json())
            .then((data) => {
                if (cancelled) return
                if (Array.isArray(data?.chain)) setApproverChain(data.chain)
                else setApproverChain([])
            })
            .catch(() => { if (!cancelled) setApproverChain([]) })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    const selectedType = balances.find(b => b.leave_type_id === selectedTypeId) ?? null
    const totalDays = startDate && endDate ? daysInclusive(startDate, endDate, isHalfDay) : 0

    const canGoStep2 = !!selectedType && (selectedType.is_unlimited || selectedType.remaining_days > 0)
    const canGoStep3 = !!startDate && !!endDate && !!reason.trim() && totalDays > 0
    const attachmentRequired = requiresAttachmentForSelection(selectedType, totalDays)
    const canSubmit = canGoStep3 && (!attachmentRequired || !!attachment)

    /**
     * Run validation across the fields owned by `scope`.
     *  - 'submit'  → all fields, every step
     *  - step 1/2/3 → only fields owned by that step
     *
     * Returns a triple: {missing, errorIds, customMessages}. customMessages
     * are non-field errors (date order, balance overflow) that get pushed
     * into the toast list so they display alongside the missing fields,
     * still flagging the relevant input via errorIds.
     */
    const validate = useCallback((scope: 'submit' | 1 | 2 | 3): {
        ok: boolean
        missing: string[]
        errorIds: Set<FieldId>
    } => {
        const inScope = (id: FieldId) => scope === 'submit' || FIELD_STEP[id] === scope
        const missing: string[] = []
        const errorIds = new Set<FieldId>()

        const need = (id: FieldId, condition: boolean, label?: string) => {
            if (!inScope(id)) return
            if (condition) {
                errorIds.add(id)
                missing.push(label ?? FIELD_LABEL[id])
            }
        }

        need('leaveType', !selectedTypeId)
        need('startDate', !startDate)
        need('endDate', !endDate)
        need('reason', !reason.trim())

        // approverChain === null means "still loading" — don't block on it
        // (otherwise users on slow networks see a phantom error). Empty
        // array means HR genuinely hasn't wired the chain.
        if (inScope('approver') && approverChain !== null && approverChain.length === 0) {
            errorIds.add('approver')
            missing.push('ผู้บังคับบัญชา (กรุณาแจ้ง HR ตั้งผู้บังคับบัญชาก่อน)')
        }

        // End < start: surface as a custom message so it doesn't read as
        // "missing" in the toast (the field IS filled, just wrong order).
        if (inScope('endDate') && startDate && endDate && new Date(endDate) < new Date(startDate)) {
            errorIds.add('endDate')
            errorIds.add('startDate')
            missing.push('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม')
        }

        // Days exceed remaining balance.
        if (inScope('endDate') && selectedType && !selectedType.is_unlimited && totalDays > selectedType.remaining_days && totalDays > 0) {
            errorIds.add('startDate')
            errorIds.add('endDate')
            missing.push(`วันลาที่ขอเกินจำนวนที่เหลือ (เหลือ ${selectedType.remaining_days} วัน)`)
        }

        // Sick leave 3+ days requires attachment. Use scope===submit OR
        // step===3 so step-2 transition doesn't yell about a step-3 field.
        if ((scope === 'submit' || scope === 3) && attachmentRequired && !attachment) {
            errorIds.add('attachment')
            if (selectedType?.leave_type_id === 'sick' && totalDays >= 3) {
                missing.push('ลาป่วย 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์')
            } else {
                missing.push(FIELD_LABEL.attachment)
            }
        }

        return { ok: missing.length === 0, missing, errorIds }
    }, [selectedTypeId, startDate, endDate, reason, approverChain, selectedType, totalDays, attachmentRequired, attachment])

    /** After a failed validate(): apply the red borders, open the toast,
     *  and scroll/focus the first errored field after a tick (so the
     *  step-jump renders before we look up its DOM). */
    const showValidationFailure = useCallback((missing: string[], errorIds: Set<FieldId>) => {
        setErrorFields(errorIds)
        setMissingFields(missing)
        setValidationOpen(true)
        // Find the first field by step order so we jump to the lowest-step
        // missing field — same heuristic the user expects when reading the
        // toast top-to-bottom.
        const order: FieldId[] = ['leaveType', 'startDate', 'endDate', 'reason', 'approver', 'attachment']
        const first = order.find(id => errorIds.has(id))
        if (!first) return
        const targetStep = FIELD_STEP[first]
        setStep(targetStep as NewLeaveStep)
        // Wait two frames: one for the step swap, one for the input mount.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`)
            if (!el) return
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const focusable = el.matches('input,textarea,select,button')
                ? el
                : el.querySelector<HTMLElement>('input,textarea,select,button')
            focusable?.focus({ preventScroll: true })
        }))
    }, [])

    const handleNext = () => {
        const result = validate(step as 1 | 2 | 3)
        if (!result.ok) {
            showValidationFailure(result.missing, result.errorIds)
            return
        }
        setStep((s) => (s < 4 ? ((s + 1) as NewLeaveStep) : s))
    }

    const handleSubmit = () => {
        const result = validate('submit')
        if (!result.ok) {
            showValidationFailure(result.missing, result.errorIds)
            return
        }
        if (!selectedType) return
        setErr(null)
        const form = new FormData()
        form.append('leave_type_id', selectedType.leave_type_id)
        form.append('start_date', startDate)
        form.append('end_date', endDate)
        form.append('is_half_day', String(isHalfDay))
        if (isHalfDay) form.append('half_day_period', halfDayPeriod)
        form.append('reason', reason.trim())
        if (contact.trim()) form.append('contact_during_leave', contact.trim())
        if (attachment) form.append('attachment', attachment)

        startSubmitTransition(async () => {
            try {
                const res = await fetch('/api/leave/submit', { method: 'POST', body: form })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'บันทึกใบลาไม่สำเร็จ')
                onSuccess(`ยื่นใบลาเรียบร้อย · รหัส ${json.reference_code}`)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'บันทึกใบลาไม่สำเร็จ')
            }
        })
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto relative"
                style={{ background: 'rgba(86,30,35,0.77)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-gradient-to-b from-[#15040a] to-[#15040aee] px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">ใบลาใหม่ · ขั้นตอน {step} / 4</p>
                        <h2 className="text-lg font-bold text-white">
                            {step === 1 && 'เลือกประเภทการลา'}
                            {step === 2 && 'วันที่และรายละเอียด'}
                            {step === 3 && 'เอกสารแนบ'}
                            {step === 4 && 'ตรวจสอบและยืนยัน'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center" aria-label="ปิด">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-4 pt-3">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {step === 1 && (
                        <Step1TypePicker
                            balances={balances}
                            selectedId={selectedTypeId}
                            onSelect={(id) => { setSelectedTypeId(id); clearFieldError('leaveType') }}
                            errored={errorFields.has('leaveType')}
                        />
                    )}
                    {step === 2 && selectedType && (
                        <Step2Dates
                            type={selectedType}
                            startDate={startDate}
                            setStartDate={(v) => { setStartDate(v); clearFieldError('startDate'); clearFieldError('endDate') }}
                            endDate={endDate}
                            setEndDate={(v) => { setEndDate(v); clearFieldError('endDate') }}
                            isHalfDay={isHalfDay} setIsHalfDay={setIsHalfDay}
                            halfDayPeriod={halfDayPeriod} setHalfDayPeriod={setHalfDayPeriod}
                            reason={reason}
                            setReason={(v) => { setReason(v); clearFieldError('reason') }}
                            contact={contact} setContact={setContact}
                            totalDays={totalDays}
                            approverChain={approverChain}
                            errorFields={errorFields}
                        />
                    )}
                    {step === 3 && selectedType && (
                        <Step3Attachment
                            type={selectedType}
                            totalDays={totalDays}
                            file={attachment}
                            onFile={(f) => { setAttachment(f); if (f) clearFieldError('attachment') }}
                            errored={errorFields.has('attachment')}
                        />
                    )}
                    {step === 4 && selectedType && (
                        <Step4Review
                            type={selectedType}
                            startDate={startDate} endDate={endDate}
                            isHalfDay={isHalfDay} halfDayPeriod={halfDayPeriod}
                            reason={reason} contact={contact}
                            attachment={attachment}
                            totalDays={totalDays}
                        />
                    )}

                    {err && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {err}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-gradient-to-t from-[#15040a] to-transparent p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => setStep((s) => (s > 1 ? ((s - 1) as NewLeaveStep) : s))}
                        disabled={step === 1 || submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white text-sm font-semibold"
                    >
                        <ChevronLeft size={14} />
                        ย้อนกลับ
                    </button>
                    {step < 4 ? (
                        <button
                            type="button"
                            // No `disabled` here — the validate-on-click flow
                            // surfaces a toast with the missing fields, which
                            // is far clearer than a silently disabled button
                            // (the original ปุ๊ bug).
                            onClick={handleNext}
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-sm font-bold active:scale-95"
                        >
                            ถัดไป
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            // Same reasoning as the ถัดไป button: keep the
                            // submit clickable so validate() can run and tell
                            // the user exactly what's missing.
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-sm font-bold active:scale-95"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            ยื่นใบลา
                        </button>
                    )}
                </div>
            </div>

            <ValidationToast
                open={validationOpen}
                onClose={() => setValidationOpen(false)}
                title="กรอกข้อมูลยังไม่ครบ"
                missingFields={missingFields}
            />
        </div>
    )
}

// ── Step 1: type picker ──────────────────────────────────────────────────────
function Step1TypePicker({
    balances, selectedId, onSelect, errored,
}: {
    balances: BalanceEntry[]
    selectedId: string | null
    onSelect: (id: string) => void
    /** When true, the dropdown gets a red border so the user sees they
     *  need to pick a type before continuing. Cleared as soon as one
     *  is picked. */
    errored?: boolean
}) {
    // Selected type details panel below the dropdown — shows the same
    // info the old grid did (color chip, balance, requirements) but
    // only for the picked type, so the form stays compact even with
    // 11 categories instead of 6.
    const selected = balances.find(b => b.leave_type_id === selectedId) ?? null
    const SelectedIcon = selected ? (LEAVE_ICON[selected.leave_type_id] ?? CalendarDays) : null

    return (
        <div className="space-y-3">
            <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                    ประเภทการลา <span className="text-red-300">*</span>
                </span>
                <select
                    data-field="leaveType"
                    value={selectedId ?? ''}
                    onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        const target = balances.find(b => b.leave_type_id === id)
                        // Block selection when balance is exhausted (same
                        // rule as the old grid's `disabled` state).
                        if (!target) return
                        if (!target.is_unlimited && target.remaining_days <= 0) return
                        onSelect(id)
                    }}
                    className={cn(
                        'mt-1.5 w-full h-12 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none transition-colors appearance-none',
                        // Trailing chevron via inline background-image so the
                        // native arrow doesn't render in the white square
                        // some browsers show on dark backgrounds.
                        errored
                            ? 'border-2 border-red-500 focus:border-red-400'
                            : 'border border-white/15 focus:border-amber-300/50',
                    )}
                    style={{
                        ...(errored ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : {}),
                        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%23ffffff99\' viewBox=\'0 0 16 16\'><path d=\'M4 6l4 4 4-4\'/></svg>")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '14px 14px',
                        paddingRight: 36,
                    }}
                >
                    <option value="" disabled className="text-black">
                        — เลือกประเภทการลา —
                    </option>
                    {balances.map(b => {
                        const exhausted = !b.is_unlimited && b.remaining_days <= 0
                        const remainingLabel = b.is_unlimited
                            ? 'ไม่จำกัด'
                            : `เหลือ ${b.remaining_days} / ${b.total_days} วัน`
                        return (
                            <option
                                key={b.leave_type_id}
                                value={b.leave_type_id}
                                disabled={exhausted}
                                className="text-black"
                            >
                                {b.name_th} · {remainingLabel}
                                {exhausted ? ' (วันลาหมดแล้ว)' : ''}
                            </option>
                        )
                    })}
                </select>
            </label>

            {selected && SelectedIcon && (
                <div
                    className="p-4 rounded-xl border-2 transition-all"
                    style={{
                        borderColor: 'rgba(252,211,77,0.45)',
                        background: 'rgba(252,211,77,0.08)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <span
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ background: selected.color ?? '#882136' }}
                        >
                            <SelectedIcon size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-[15px] leading-tight">{selected.name_th}</p>
                            <p className="text-xs text-white/65 mt-0.5">
                                {selected.is_unlimited ? (
                                    <>คงเหลือ: <span className="text-emerald-200 font-semibold">ไม่จำกัด</span></>
                                ) : (
                                    <>เหลือ <span className="text-white font-semibold">{selected.remaining_days}</span> / {selected.total_days} วัน</>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2.5 space-y-1">
                        {selected.advance_notice_days > 0 && (
                            <p className="text-[11px] text-amber-200">ขอล่วงหน้า ≥ {selected.advance_notice_days} วัน</p>
                        )}
                        {!selected.same_day_allowed && selected.leave_type_id === 'sick' && (
                            <p className="text-[11px] text-rose-200">ต้องเป็นวันที่ผ่านไปแล้ว</p>
                        )}
                        {selected.leave_type_id === 'sick' ? (
                            <p className="text-[11px] text-sky-200 inline-flex items-center gap-1">
                                <Paperclip size={10} /> ใบรับรองแพทย์เมื่อป่วย ≥ 3 วัน
                            </p>
                        ) : selected.requires_attachment && (
                            <p className="text-[11px] text-sky-200 inline-flex items-center gap-1">
                                <Paperclip size={10} /> ต้องแนบเอกสาร
                            </p>
                        )}
                    </div>
                </div>
            )}

            <a
                href="/portal/leave-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-300/70 hover:text-amber-300 transition-colors"
            >
                ดูนโยบายการลา →
            </a>
        </div>
    )
}

// ── Step 2: date + reason ────────────────────────────────────────────────────
function Step2Dates({
    type, startDate, setStartDate, endDate, setEndDate,
    isHalfDay, setIsHalfDay, halfDayPeriod, setHalfDayPeriod,
    reason, setReason, contact, setContact, totalDays,
    approverChain, errorFields,
}: {
    type: BalanceEntry
    startDate: string
    setStartDate: (v: string) => void
    endDate: string
    setEndDate: (v: string) => void
    isHalfDay: boolean
    setIsHalfDay: (v: boolean) => void
    halfDayPeriod: 'morning' | 'afternoon'
    setHalfDayPeriod: (v: 'morning' | 'afternoon') => void
    reason: string
    setReason: (v: string) => void
    contact: string
    setContact: (v: string) => void
    totalDays: number
    approverChain: ApproverChainStep[] | null
    /** Per-field validation errors. Drives the red border on each input
     *  and lets the parent's scroll target [data-field] queries hit. */
    errorFields: Set<FieldId>
}) {
    const today = todayBangkokIso()
    const minDate = type.leave_type_id === 'sick'
        ? undefined // sick leave must be past
        : today
    const maxDate = type.leave_type_id === 'sick' ? today : undefined

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-100 text-xs inline-flex items-start gap-2 w-full">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                    <strong>{type.name_th}</strong>
                    {type.advance_notice_days > 0 && ` · ขอล่วงหน้าอย่างน้อย ${type.advance_notice_days} วัน`}
                    {type.leave_type_id === 'sick' && ' · ต้องเป็นวันที่ผ่านไปแล้ว'}
                    {!type.is_unlimited && ` · คงเหลือ ${type.remaining_days} / ${type.total_days} วัน`}
                </span>
            </div>

            {/* Approver routing — purely informational so the user knows
                where the request will go before submitting. The actual
                chain is computed again server-side at submit time, so
                this is a read-only preview. */}
            <ApproverChainBox chain={approverChain} errored={errorFields.has('approver')} />


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                    label="วันที่เริ่ม"
                    fieldId="startDate"
                    value={startDate}
                    onChange={(v) => { setStartDate(v); if (isHalfDay) setEndDate(v) }}
                    min={minDate} max={maxDate}
                    errored={errorFields.has('startDate')}
                />
                <DateField
                    label="วันที่สิ้นสุด"
                    fieldId="endDate"
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || minDate} max={maxDate}
                    disabled={isHalfDay}
                    errored={errorFields.has('endDate')}
                />
            </div>

            {startDate && endDate && (
                <p className="text-sm text-white/70">
                    รวม <span className="text-white font-bold">{totalDays}</span> วัน
                </p>
            )}

            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isHalfDay}
                        onChange={(e) => {
                            setIsHalfDay(e.target.checked)
                            if (e.target.checked && startDate) setEndDate(startDate)
                        }}
                        className="h-4 w-4 accent-amber-400"
                    />
                    <span className="text-sm text-white">ลาครึ่งวัน</span>
                </label>
                {isHalfDay && (
                    <div className="mt-3 space-y-2.5">
                        <div className="flex gap-2">
                            {(['morning', 'afternoon'] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setHalfDayPeriod(p)}
                                    className={cn(
                                        'flex-1 h-10 rounded-lg text-sm font-semibold transition-all',
                                        halfDayPeriod === p ? 'bg-amber-400 text-black' : 'bg-black/25 text-white/75 border border-white/15',
                                    )}
                                >
                                    {p === 'morning' ? 'เช้า' : 'บ่าย'}
                                </button>
                            ))}
                        </div>
                        {/* §3.16p2 — contextual tip explaining check-in rules for
                            the selected half-day period so employees know what
                            to expect before submitting. */}
                        <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-400/20 text-xs text-orange-100 flex items-start gap-2">
                            <Info size={12} className="mt-0.5 shrink-0 text-orange-200" />
                            <span>
                                {halfDayPeriod === 'morning'
                                    ? `ลาเช้า (${WORK_SCHEDULE.morningStart}-${WORK_SCHEDULE.morningEnd}) — ไม่ต้องเช็คอินตอนเช้า แต่ต้องเช็คอินตอนบ่ายก่อน ${HALF_DAY_RULES.afternoonCheckinDeadline} น.`
                                    : `ลาบ่าย (${WORK_SCHEDULE.afternoonStart}-${WORK_SCHEDULE.afternoonEnd}) — เช็คอินตอนเช้าตามปกติ ไม่ต้องเช็คอินตอนบ่าย`
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                    เหตุผลในการลา <span className="text-red-300">*</span>
                </span>
                <textarea
                    data-field="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="ระบุเหตุผลประกอบการขอลา"
                    className={cn(
                        'mt-1.5 w-full rounded-lg bg-black/25 text-white text-sm px-3 py-2 focus:outline-none transition-colors',
                        errorFields.has('reason')
                            ? 'border-2 border-red-500 focus:border-red-400'
                            : 'border border-white/15 focus:border-amber-300/50',
                    )}
                    style={errorFields.has('reason') ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : undefined}
                />
            </label>

            <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                    ช่องทางติดต่อระหว่างลา (ถ้ามี)
                </span>
                <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="เช่น เบอร์มือถือ / LINE"
                    className="mt-1.5 w-full h-11 rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 focus:outline-none focus:border-amber-300/50"
                />
            </label>
        </div>
    )
}

function ApproverChainBox({ chain, errored }: { chain: ApproverChainStep[] | null; errored?: boolean }) {
    // Loading: show a quiet placeholder so the form doesn't jump as
    // soon as the modal opens. We never block the user on this fetch.
    if (chain === null) {
        return (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/55">
                กำลังโหลดผู้อนุมัติ…
            </div>
        )
    }

    // Empty chain = HR hasn't wired this employee's approver yet.
    // We surface this as a warning so the user nudges HR before
    // submitting (otherwise the request will route to no one).
    if (chain.length === 0) {
        return (
            <div
                data-field="approver"
                className={cn(
                    'p-3 rounded-lg text-xs inline-flex items-start gap-2 w-full',
                    errored
                        ? 'bg-red-500/15 border-2 border-red-500 text-red-100'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-100',
                )}
                style={errored ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : undefined}
            >
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>
                    <strong>ยังไม่มีผู้อนุมัติในระบบ</strong> — กรุณาแจ้งฝ่ายบุคคล (HR) ตั้งผู้บังคับบัญชาให้ก่อนยื่นใบลา ไม่เช่นนั้นระบบจะไม่รู้ว่าจะส่งใบลาไปหาใคร
                </span>
            </div>
        )
    }

    return (
        <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/25">
            <p className="text-[11px] uppercase tracking-wider text-emerald-200/85 font-bold mb-2 inline-flex items-center gap-1.5">
                <Send size={11} />
                ใบลานี้จะส่งไปที่
            </p>
            <ol className="space-y-1.5">
                {chain.map((step, i) => (
                    <li
                        key={step.id}
                        className="flex items-center gap-2.5 text-[0.85rem]"
                    >
                        <span className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                            {i + 1}
                        </span>
                        <span className="text-white font-semibold">{step.name}</span>
                        <span className="text-white/55 text-[0.78rem]">· {step.role_label}</span>
                    </li>
                ))}
            </ol>
            <p className="mt-2.5 text-[11px] text-white/45 leading-relaxed">
                หากผู้อนุมัติคนแรกอนุมัติ ระบบจะส่งต่อไปยังคนถัดไปอัตโนมัติ — ใบลาจะถือว่าสมบูรณ์เมื่อ HR อนุมัติเป็นขั้นสุดท้าย
            </p>
            <p className="mt-1 text-[11px] text-white/40">
                * หากชื่อนี้ไม่ถูกต้อง กรุณาแจ้งฝ่ายบุคคลให้แก้ไขผู้บังคับบัญชาในโปรไฟล์
            </p>
        </div>
    )
}

function DateField({
    label, fieldId, value, onChange, min, max, disabled, errored,
}: {
    label: string
    fieldId?: string
    value: string
    onChange: (v: string) => void
    min?: string
    max?: string
    disabled?: boolean
    errored?: boolean
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">{label}</span>
            <input
                type="date"
                data-field={fieldId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                disabled={disabled}
                className={cn(
                    'mt-1.5 w-full h-11 px-3 rounded-lg bg-black/25 text-white text-sm focus:outline-none disabled:opacity-60 transition-colors',
                    errored
                        ? 'border-2 border-red-500 focus:border-red-400'
                        : 'border border-white/15 focus:border-amber-300/50',
                )}
                style={errored ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : undefined}
            />
        </label>
    )
}

// ── Step 3: attachment ───────────────────────────────────────────────────────
function Step3Attachment({
    type, totalDays, file, onFile, errored,
}: {
    type: BalanceEntry
    totalDays: number
    file: File | null
    onFile: (f: File | null) => void
    errored?: boolean
}) {
    const ref = useRef<HTMLInputElement>(null)
    const required = requiresAttachmentForSelection(type, totalDays)
    return (
        <div className="space-y-3">
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-100 text-xs inline-flex items-start gap-2 w-full">
                <Paperclip size={13} className="mt-0.5 shrink-0" />
                <span>
                    {required ? (
                        <>ประเภทนี้ <strong>ต้องแนบเอกสาร</strong> — {attachmentHint(type, totalDays)}</>
                    ) : (
                        <>{attachmentHint(type, totalDays)}</>
                    )}
                </span>
            </div>

            <input
                ref={ref}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const ext = (f.name.split('.').pop() ?? '').toLowerCase()
                    if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
                        alert('รองรับเฉพาะ PDF, JPG, PNG, WEBP, HEIC หรือ HEIF')
                        e.currentTarget.value = ''
                        return
                    }
                    if (f.size > 5 * 1024 * 1024) {
                        alert('ไฟล์ใหญ่เกิน 5 MB')
                        e.currentTarget.value = ''
                        return
                    }
                    onFile(f)
                }}
            />
            {file ? (
                <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-3">
                    <Paperclip className="text-emerald-200 shrink-0" size={18} />
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{file.name}</p>
                        <p className="text-[11px] text-emerald-200">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { onFile(null); if (ref.current) ref.current.value = '' }}
                        className="text-white/70 hover:text-white"
                        aria-label="ลบไฟล์"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    data-field="attachment"
                    onClick={() => ref.current?.click()}
                    className={cn(
                        'w-full p-6 rounded-lg border-2 border-dashed bg-white/5 text-white/70 text-sm flex flex-col items-center gap-2 transition-all',
                        errored
                            ? 'border-red-500 hover:border-red-400'
                            : 'border-white/20 hover:border-amber-300/40',
                    )}
                    style={errored ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : undefined}
                >
                    <UploadCloud size={24} />
                    คลิกเพื่อเลือกไฟล์
                    <span className="text-[11px] text-white/45">PDF / JPG / PNG / WEBP / HEIC · ไม่เกิน 5 MB</span>
                </button>
            )}
        </div>
    )
}

// ── Step 4: review ───────────────────────────────────────────────────────────
function Step4Review({
    type, startDate, endDate, isHalfDay, halfDayPeriod, reason, contact, attachment, totalDays,
}: {
    type: BalanceEntry
    startDate: string
    endDate: string
    isHalfDay: boolean
    halfDayPeriod: 'morning' | 'afternoon'
    reason: string
    contact: string
    attachment: File | null
    totalDays: number
}) {
    const Icon = LEAVE_ICON[type.leave_type_id] ?? CalendarDays
    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <span className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ background: type.color ?? '#882136' }}>
                        <Icon size={16} />
                    </span>
                    <div>
                        <p className="text-white font-bold">{type.name_th}</p>
                        <p className="text-xs text-white/55">{type.is_unlimited ? 'ไม่จำกัดวัน' : `คงเหลือ ${type.remaining_days} / ${type.total_days} วัน`}</p>
                    </div>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Field label="วันที่ลา" value={formatThaiDateRange(startDate, endDate)} />
                    <Field label="จำนวนวัน" value={`${totalDays} วัน${isHalfDay ? ` (ครึ่งวัน - ${halfDayPeriod === 'morning' ? 'เช้า' : 'บ่าย'})` : ''}`} />
                    <Field label="เหตุผล" value={reason} />
                    {contact && <Field label="ติดต่อระหว่างลา" value={contact} />}
                    <Field label="เอกสารแนบ" value={attachment ? attachment.name : '— ไม่แนบ'} />
                </dl>
            </div>
            <p className="text-[11px] text-white/50 px-2">
                กดยืนยันเพื่อส่งใบลาให้ผู้อนุมัติ · ระบบจะส่ง email ยืนยันให้คุณและผู้อนุมัติอัตโนมัติ
            </p>
        </div>
    )
}
