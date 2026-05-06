'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
    Inbox, Filter, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle,
    Loader2, AlertCircle, ChevronDown, Paperclip, Phone, Building2,
    Sparkles, X, Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'

// ── Types (match /api/leave/inbox response) ───────────────────────────────
interface InboxItem {
    id: string
    reference_code: string
    /** API now surfaces both pending decisions and cancellation requests
     *  in one queue — the action set differs per status. */
    status: 'pending' | 'cancellation_requested'
    leave_type_id: string
    start_date: string
    end_date: string
    total_days: string | number
    is_half_day: boolean | null
    half_day_period: string | null
    reason: string
    contact_during_leave: string | null
    attachment_url: string | null
    attachment_name: string | null
    /** Reason the employee gave when filing a cancellation request. */
    cancellation_reason: string | null
    cancellation_requested_at: string | null
    submitted_at: string | null
    created_at: string
    employee_id: string
    applicant: {
        id: string
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        department: string | null
        position: string | null
        photo_url: string | null
        email: string | null
    } | null
    leave_type: {
        id: string
        name_th: string | null
        icon: string | null
        color: string | null
        is_unlimited: boolean
    } | null
    balance: {
        total_days: number
        used_days: number
        pending_days: number
        remaining_days: number
    }
}

type FilterKey = 'all' | 'oldest' | 'today'

// ── Styles ───────────────────────────────────────────────────────────────
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
function formatTimeAgo(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const diffMs = Date.now() - d.getTime()
    const min = Math.floor(diffMs / 60000)
    if (min < 1) return 'เมื่อสักครู่'
    if (min < 60) return `${min} นาทีที่แล้ว`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr} ชม.ที่แล้ว`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day} วันที่แล้ว`
    return formatThaiDate(iso.slice(0, 10))
}
function fullApplicantName(item: InboxItem): string {
    const a = item.applicant
    if (!a) return 'ไม่ระบุผู้สมัคร'
    const base = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
    return a.nickname ? `${base || 'ไม่ระบุ'} (${a.nickname})` : base || 'ไม่ระบุ'
}
function initialsFrom(item: InboxItem): string {
    const a = item.applicant
    return (a?.first_name_th?.[0] ?? a?.nickname?.[0] ?? '?').toUpperCase()
}

// ── Main view ────────────────────────────────────────────────────────────
export function InboxView() {
    const [items, setItems] = useState<InboxItem[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [filter, setFilter] = useState<FilterKey>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [approveTarget, setApproveTarget] = useState<InboxItem | null>(null)
    const [rejectTarget, setRejectTarget] = useState<InboxItem | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const load = useCallback(async () => {
        setErr(null); setLoading(true)
        try {
            const res = await fetch('/api/leave/inbox', { cache: 'no-store' })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            const json = await res.json()
            setItems(json.items ?? [])
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { void load() }, [load])

    const showToast = (msg: string) => {
        setToast(msg)
        window.setTimeout(() => setToast(null), 4500)
    }

    // Remove card optimistically after approve/reject
    const handleResolved = (id: string, verb: 'อนุมัติ' | 'ปฏิเสธ') => {
        setItems(cur => cur.filter(it => it.id !== id))
        setExpandedId(cur => (cur === id ? null : cur))
        showToast(`${verb}ใบลาเรียบร้อย`)
    }

    // Filter logic
    const todayStart = useMemo(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d.getTime()
    }, [])
    const visible = useMemo(() => {
        let list = items
        if (filter === 'today') {
            list = list.filter(it => {
                const t = new Date(it.submitted_at ?? it.created_at).getTime()
                return t >= todayStart
            })
        } else if (filter === 'oldest') {
            list = [...list].sort((a, b) => {
                const ta = new Date(a.submitted_at ?? a.created_at).getTime()
                const tb = new Date(b.submitted_at ?? b.created_at).getTime()
                return ta - tb
            })
        }
        return list
    }, [items, filter, todayStart])

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <Inbox size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white inline-flex items-center gap-2">
                        ใบลารอการอนุมัติ
                        {items.length > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black">
                                {items.length}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-white/55">คำขอที่ส่งให้คุณพิจารณา</p>
                </div>
            </div>

            {err && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {err}
                </div>
            )}

            {/* Filters */}
            {items.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={13} className="text-white/45" />
                    {([
                        { key: 'all',    label: 'ทั้งหมด' },
                        { key: 'oldest', label: 'รอนานสุดก่อน' },
                        { key: 'today',  label: 'ของวันนี้' },
                    ] as const).map(f => {
                        const active = filter === f.key
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                className={cn(
                                    'text-xs px-3 py-1.5 rounded-full font-semibold transition-all',
                                    active
                                        ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10',
                                )}
                            >
                                {f.label}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Content */}
            {loading && items.length === 0 ? (
                <div className="p-10 text-center text-white/50" style={glass}>
                    <Loader2 size={26} className="mx-auto mb-2 animate-spin text-white/40" />
                    กำลังโหลด…
                </div>
            ) : visible.length === 0 ? (
                <EmptyState />
            ) : (
                <ul className="space-y-3">
                    {visible.map(item => (
                        <li key={item.id}>
                            <RequestCard
                                item={item}
                                expanded={expandedId === item.id}
                                onToggleExpand={() => setExpandedId(cur => cur === item.id ? null : item.id)}
                                onApproveClick={() => setApproveTarget(item)}
                                onRejectClick={() => setRejectTarget(item)}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {/* Modals */}
            {approveTarget && (
                <ApproveDialog
                    item={approveTarget}
                    onClose={() => setApproveTarget(null)}
                    onDone={() => {
                        const id = approveTarget.id
                        setApproveTarget(null)
                        handleResolved(id, 'อนุมัติ')
                    }}
                />
            )}
            {rejectTarget && (
                <RejectDialog
                    item={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onDone={() => {
                        const id = rejectTarget.id
                        setRejectTarget(null)
                        handleResolved(id, 'ปฏิเสธ')
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

// ── Empty state ──────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="p-10 text-center text-white/55" style={glass}>
            <Sparkles size={32} className="mx-auto mb-3 text-amber-200/60" />
            <p className="font-semibold text-white/80 mb-1">ไม่มีใบลารอการอนุมัติ</p>
            <p className="text-sm text-white/50">
                เมื่อมีใบลาจากทีมของคุณเข้ามา รายการจะแสดงที่นี่โดยอัตโนมัติ
            </p>
        </div>
    )
}

// ── Request card (collapsed + expanded) ──────────────────────────────────
function RequestCard({
    item, expanded, onToggleExpand, onApproveClick, onRejectClick,
}: {
    item: InboxItem
    expanded: boolean
    onToggleExpand: () => void
    onApproveClick: () => void
    onRejectClick: () => void
}) {
    const a = item.applicant
    const lt = item.leave_type
    const typeColor = lt?.color ?? '#882136'
    const totalDays = Number(item.total_days)
    const halfDayLabel = item.is_half_day
        ? ` (ครึ่งวัน - ${item.half_day_period === 'morning' ? 'เช้า' : 'บ่าย'})`
        : ''

    return (
        <div style={glass} className="overflow-hidden">
            {/* Collapsed body */}
            <div
                className="p-4 cursor-pointer select-none"
                onClick={onToggleExpand}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand() } }}
                aria-expanded={expanded}
            >
                <div className="flex items-start gap-3 flex-wrap">
                    {/* Photo / initials */}
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                        {a?.photo_url ? (
                            <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/70 font-bold">
                                {initialsFrom(item)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold truncate">{fullApplicantName(item)}</p>
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: `${typeColor}33`, color: typeColor.replace(/^#/, '') ? typeColor : '#fff' }}
                            >
                                {lt?.name_th ?? item.leave_type_id}
                            </span>
                            {item.status === 'cancellation_requested' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/90 text-black inline-flex items-center gap-1">
                                    <Ban size={10} />
                                    ขอยกเลิก
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/85 text-black">
                                    PENDING
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-white/80 mt-0.5">
                            {formatThaiDateRange(item.start_date, item.end_date)}
                            <span className="text-white/40 mx-1.5">·</span>
                            <span className="tabular-nums">{totalDays} วัน{halfDayLabel}</span>
                        </p>
                        {a?.department && (
                            <p className="text-[12px] text-white/55 truncate mt-0.5 inline-flex items-center gap-1">
                                <Building2 size={11} />
                                {a.department}{a.position ? ` · ${a.position}` : ''}
                            </p>
                        )}
                        <p className="text-[13px] text-white/75 mt-1.5 line-clamp-2">
                            &ldquo;{item.reason}&rdquo;
                        </p>
                        {item.status === 'cancellation_requested' && item.cancellation_reason && (
                            <p className="text-[12px] text-amber-200/90 mt-1 line-clamp-2 inline-flex items-start gap-1">
                                <Ban size={11} className="mt-0.5 shrink-0" />
                                <span>เหตุผลขอยกเลิก: <span className="text-amber-100">{item.cancellation_reason}</span></span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                        <span className="text-[11px] text-white/45 hidden sm:inline">
                            <Clock size={10} className="inline -mt-0.5 mr-1" />
                            {formatTimeAgo(item.submitted_at ?? item.created_at)}
                        </span>
                        <ChevronDown
                            size={16}
                            className={cn('text-white/40 transition-transform', expanded && 'rotate-180')}
                        />
                    </div>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailField label="เหตุผลเต็ม" value={item.reason} multiline />
                        <DetailField label="ช่องทางติดต่อขณะลา" value={item.contact_during_leave ?? null} icon={<Phone size={11} />} />
                        <DetailField label="ส่งคำขอเมื่อ" value={
                            item.submitted_at
                                ? `${formatTimeAgo(item.submitted_at)} (${new Date(item.submitted_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })})`
                                : '—'
                        } />
                        {a?.email && (
                            <DetailField label="Email" value={a.email} />
                        )}
                    </div>

                    {/* Balance summary */}
                    <BalanceBar item={item} />

                    {/* Attachment */}
                    {item.attachment_url && (
                        <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/15 text-white text-sm font-semibold border border-white/10"
                        >
                            <Paperclip size={13} />
                            {item.attachment_name ?? 'เปิดไฟล์แนบ'}
                        </a>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/5 mt-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRejectClick() }}
                            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-bold text-sm transition-all active:scale-95"
                        >
                            <XCircle size={14} />
                            ปฏิเสธ
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onApproveClick() }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 h-10 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white font-bold text-sm transition-all active:scale-95"
                        >
                            <CheckCircle2 size={14} />
                            อนุมัติ
                        </button>
                    </div>
                </div>
            )}

            {/* Collapsed footer (buttons always reachable) */}
            {!expanded && (
                <div className="flex items-stretch border-t border-white/5">
                    <button
                        type="button"
                        onClick={onRejectClick}
                        className="flex-1 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/10 transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                        <XCircle size={14} />
                        ปฏิเสธ
                    </button>
                    <div className="w-px bg-white/10" />
                    <button
                        type="button"
                        onClick={onApproveClick}
                        className="flex-[2] py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10 transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                        <CheckCircle2 size={14} />
                        อนุมัติ
                    </button>
                </div>
            )}
        </div>
    )
}

function DetailField({
    label, value, icon, multiline,
}: {
    label: string
    value: string | null
    icon?: React.ReactNode
    multiline?: boolean
}) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold inline-flex items-center gap-1">
                {icon} {label}
            </p>
            <p className={cn(
                'text-sm mt-0.5',
                value ? 'text-white/85' : 'text-white/35 italic',
                multiline && 'whitespace-pre-wrap',
            )}>
                {value ?? '—'}
            </p>
        </div>
    )
}

function BalanceBar({ item }: { item: InboxItem }) {
    const lt = item.leave_type
    const b = item.balance
    const total = b.total_days
    const used = b.used_days + b.pending_days
    const thisReq = Number(item.total_days)
    const remainingBeforeApproval = b.remaining_days
    const remainingAfterApproval = Math.max(0, remainingBeforeApproval - thisReq)

    if (lt?.is_unlimited) {
        return (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-200 inline-flex items-center gap-1.5">
                    <CalendarIcon size={12} /> {lt?.name_th ?? item.leave_type_id}: ประเภทนี้ไม่จำกัดจำนวนวัน
                </p>
            </div>
        )
    }

    const pct = total > 0 ? Math.min(100, ((used + thisReq) / total) * 100) : 0
    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-white/55 font-semibold">
                    ยอด {lt?.name_th ?? item.leave_type_id}
                </span>
                <span className="text-white/75 tabular-nums">
                    ใช้ไป {b.used_days} · รอ {b.pending_days} · คงเหลือ <span className="text-white font-bold">{remainingBeforeApproval}</span> / {total} วัน
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: lt?.color ?? '#ad5f6c' }}
                />
            </div>
            <p className="text-[11px] text-white/55">
                ถ้าอนุมัติ จะเหลือ <span className="text-white font-semibold tabular-nums">{remainingAfterApproval}</span> วัน
                {remainingAfterApproval === 0 && ' (ใช้ครบแล้ว)'}
            </p>
        </div>
    )
}

// ── Approve dialog ───────────────────────────────────────────────────────
function ApproveDialog({
    item, onClose, onDone,
}: {
    item: InboxItem
    onClose: () => void
    onDone: () => void
}) {
    const [notes, setNotes] = useState('')
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onClose])

    const submit = () => {
        setErr(null)
        startTransition(async () => {
            try {
                // §1.4 — for cancellation_requested rows the action is
                // "approve the cancellation". Same dialog UX, different
                // endpoint + payload shape.
                const isCancelReq = item.status === 'cancellation_requested'
                const url = isCancelReq
                    ? `/api/leave/${item.id}/cancellation-decision`
                    : `/api/leave/${item.id}/approve`
                const body = isCancelReq
                    ? { decision: 'approve', reason: notes.trim() || null }
                    : { notes: notes.trim() || null }
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'อนุมัติไม่สำเร็จ')
                onDone()
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'อนุมัติไม่สำเร็จ')
            }
        })
    }

    const isCancelReq = item.status === 'cancellation_requested'

    return (
        <DialogShell onClose={onClose}>
            <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-200">
                    <CheckCircle2 size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">
                        {isCancelReq ? 'อนุมัติคำขอยกเลิกใบลา' : 'ยืนยันการอนุมัติใบลา'}
                    </h2>
                    <p className="text-xs text-white/55 mt-0.5">{item.reference_code} · {fullApplicantName(item)}</p>
                </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                <p className="text-sm text-white/85">
                    {item.leave_type?.name_th ?? item.leave_type_id}
                    {' · '}
                    {formatThaiDateRange(item.start_date, item.end_date)}
                    {' · '}
                    <span className="tabular-nums">{Number(item.total_days)} วัน</span>
                </p>
                {isCancelReq && item.cancellation_reason && (
                    <p className="text-sm text-amber-200/90 mt-2">
                        เหตุผลขอยกเลิก: <span className="text-amber-100">{item.cancellation_reason}</span>
                    </p>
                )}
            </div>
            <label className="block mb-4">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">หมายเหตุ (optional)</span>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="เช่น คำแนะนำเพิ่มเติม / จัดงานทดแทน"
                    className="mt-1.5 w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-emerald-300/50"
                />
                <span className="text-[10px] text-white/40 mt-1 inline-block">
                    หมายเหตุจะแนบไปใน email ของผู้ขอ
                </span>
            </label>
            {err && (
                <p className="text-red-300 text-sm mb-3 inline-flex items-center gap-1.5">
                    <AlertCircle size={12} /> {err}
                </p>
            )}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={pending}
                    className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 px-5 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-lg shadow-emerald-500/30"
                >
                    {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    ยืนยันอนุมัติ
                </button>
            </div>
        </DialogShell>
    )
}

// ── Reject dialog ────────────────────────────────────────────────────────
function RejectDialog({
    item, onClose, onDone,
}: {
    item: InboxItem
    onClose: () => void
    onDone: () => void
}) {
    const confirm = useConfirmDialog()
    const [reason, setReason] = useState('')
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onClose])

    const tooShort = reason.trim().length < 10
    const isCancelReq = item.status === 'cancellation_requested'
    const submit = async () => {
        if (tooShort) {
            setErr('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร')
            return
        }
        const ok = await confirm({
            title: isCancelReq ? 'ยืนยันปฏิเสธคำขอยกเลิกใบลา?' : 'ยืนยันปฏิเสธใบลา?',
            body: isCancelReq
                ? 'ใบลาจะยังคงสถานะอนุมัติเดิม และผู้ขอจะได้รับแจ้งผล'
                : 'ผู้ขอลาจะได้รับ email แจ้งผล และระบบจะคืนวันลาที่จองไว้ในสถานะ pending',
            summary: (
                <div className="space-y-1">
                    <p>👤 {fullApplicantName(item)}</p>
                    <p>🌴 {item.leave_type?.name_th ?? item.leave_type_id} · {formatThaiDateRange(item.start_date, item.end_date)}</p>
                    <p>📝 {item.reason.length > 90 ? `${item.reason.slice(0, 90)}…` : item.reason}</p>
                </div>
            ),
            confirmLabel: 'ปฏิเสธ',
            variant: 'destructive',
        })
        if (!ok) return

        setErr(null)
        startTransition(async () => {
            try {
                // §1.4 — for cancellation_requested rows, "reject" means
                // "reject the cancellation request" (leave stays approved).
                const url = isCancelReq
                    ? `/api/leave/${item.id}/cancellation-decision`
                    : `/api/leave/${item.id}/reject`
                const body = isCancelReq
                    ? { decision: 'reject', reason: reason.trim() }
                    : { rejection_reason: reason.trim() }
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'ปฏิเสธไม่สำเร็จ')
                onDone()
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'ปฏิเสธไม่สำเร็จ')
            }
        })
    }

    return (
        <DialogShell onClose={onClose}>
            <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-200">
                    <XCircle size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">
                        {isCancelReq ? 'ปฏิเสธคำขอยกเลิกใบลา' : 'ปฏิเสธใบลา'}
                    </h2>
                    <p className="text-xs text-white/55 mt-0.5">{item.reference_code} · {fullApplicantName(item)}</p>
                </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                <p className="text-sm text-white/85">
                    {item.leave_type?.name_th ?? item.leave_type_id}
                    {' · '}
                    {formatThaiDateRange(item.start_date, item.end_date)}
                    {' · '}
                    <span className="tabular-nums">{Number(item.total_days)} วัน</span>
                </p>
                {isCancelReq && item.cancellation_reason && (
                    <p className="text-sm text-amber-200/90 mt-2">
                        เหตุผลขอยกเลิก: <span className="text-amber-100">{item.cancellation_reason}</span>
                    </p>
                )}
            </div>
            <label className="block mb-4">
                <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                    {isCancelReq ? 'เหตุผลที่ไม่อนุมัติให้ยกเลิก' : 'เหตุผลการปฏิเสธ'} <span className="text-red-300">*</span>
                </span>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={4}
                    placeholder={isCancelReq ? 'เช่น มีงานสำคัญที่ต้องการให้ทำตามแผนเดิม' : 'ระบุเหตุผลที่ไม่สามารถอนุมัติได้'}
                    className="mt-1.5 w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-red-300/50"
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/40">อย่างน้อย 10 ตัวอักษร</span>
                    <span className={cn('text-[10px] tabular-nums', tooShort ? 'text-red-300' : 'text-white/45')}>
                        {reason.trim().length} / 10+
                    </span>
                </div>
            </label>
            {err && (
                <p className="text-red-300 text-sm mb-3 inline-flex items-center gap-1.5">
                    <AlertCircle size={12} /> {err}
                </p>
            )}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={pending}
                    className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={pending || tooShort}
                    className="inline-flex items-center gap-1.5 px-5 h-10 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-red-500/30"
                >
                    {pending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                    ยืนยันปฏิเสธ
                </button>
            </div>
        </DialogShell>
    )
}

function DialogShell({
    children, onClose,
}: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[85vh] overflow-y-auto relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-5 sm:p-6"
                style={{
                    background: 'rgba(86,30,35,0.77)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '20px',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center"
                    aria-label="ปิด"
                >
                    <X size={16} />
                </button>
                {children}
            </div>
        </div>
    )
}
