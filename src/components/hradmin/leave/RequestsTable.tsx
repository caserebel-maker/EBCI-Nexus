'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, CheckCircle2, XCircle, Ban, Eye, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_META, type LeaveRequestItem } from './types'

interface Props {
    items: LeaveRequestItem[]
    onRowClick: (item: LeaveRequestItem) => void
    onForceAction: (item: LeaveRequestItem, action: 'approve' | 'reject' | 'cancel') => void
}

/**
 * Responsive request list.
 *   • sm+ desktop → table (8 columns + actions)
 *   • mobile      → stacked card rows (same data, vertical layout)
 *
 * Row click opens the detail drawer; a trailing ⋯ menu exposes the
 * force-action transitions per row (handled by the parent view).
 */
export function RequestsTable({ items, onRowClick, onForceAction }: Props) {
    if (items.length === 0) {
        return (
            <div
                className="rounded-2xl border border-white/10 p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}
            >
                <FileText size={32} className="mx-auto text-white/25 mb-3" />
                <p className="text-white/70 font-semibold">ไม่พบใบลาที่ตรงกับตัวกรอง</p>
                <p className="text-white/45 text-xs mt-1">ลองล้างตัวกรองหรือเปลี่ยนช่วงวันที่</p>
            </div>
        )
    }

    return (
        <>
            {/* Desktop table */}
            <div
                className="hidden sm:block rounded-2xl border border-white/10 overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.95) 0%, rgba(86,30,35,0.92) 100%)',
                }}
            >
                <table className="w-full text-sm">
                    <thead className="text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10">
                        <tr>
                            <th className="text-left px-4 py-3">Ref</th>
                            <th className="text-left px-4 py-3">พนักงาน</th>
                            <th className="text-left px-4 py-3">ประเภท</th>
                            <th className="text-left px-4 py-3">วันที่</th>
                            <th className="text-left px-4 py-3">สถานะ</th>
                            <th className="text-left px-4 py-3">ยื่นเมื่อ</th>
                            <th className="text-left px-4 py-3">ผู้อนุมัติ</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <RequestRow
                                key={item.id}
                                item={item}
                                onRowClick={onRowClick}
                                onForceAction={onForceAction}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {items.map(item => (
                    <RequestCard
                        key={item.id}
                        item={item}
                        onRowClick={onRowClick}
                        onForceAction={onForceAction}
                    />
                ))}
            </div>
        </>
    )
}

// ─── Desktop row ───────────────────────────────────────────────────────────

function RequestRow({
    item, onRowClick, onForceAction,
}: {
    item: LeaveRequestItem
    onRowClick: (item: LeaveRequestItem) => void
    onForceAction: (item: LeaveRequestItem, action: 'approve' | 'reject' | 'cancel') => void
}) {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending
    const emp = item.employee
    const approver = item.approver
    const leaveType = item.leave_type
    const typeColor = leaveType?.color ?? '#f9c5cd'

    return (
        <tr
            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
            onClick={() => onRowClick(item)}
        >
            <td className="px-4 py-3">
                <span className="font-mono text-[11px] text-white/75">{item.reference_code ?? '—'}</span>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar emp={emp} />
                    <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate max-w-[180px]">
                            {emp?.nickname ?? emp?.first_name_th ?? '—'}
                        </p>
                        <p className="text-[11px] text-white/45 truncate max-w-[180px]">
                            {emp?.department ?? '—'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold"
                    style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}33` }}
                >
                    {leaveType?.name_th ?? '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                <p className="text-white/85 text-xs">{formatDateRange(item.start_date, item.end_date)}</p>
                <p className="text-[11px] text-white/45">{item.total_days} วัน{item.is_half_day ? ' (ครึ่งวัน)' : ''}</p>
            </td>
            <td className="px-4 py-3">
                <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: meta.bg, color: meta.color, boxShadow: `0 0 0 1px ${meta.ring}` }}
                >
                    {meta.label}
                </span>
            </td>
            <td className="px-4 py-3 text-xs text-white/55">
                {formatRelative(item.submitted_at ?? item.created_at)}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar emp={approver} size={24} />
                    <span className="text-xs text-white/75 truncate max-w-[120px]">
                        {approver?.nickname ?? approver?.first_name_th ?? '—'}
                    </span>
                </div>
            </td>
            <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                <RowActions item={item} onRowClick={onRowClick} onForceAction={onForceAction} />
            </td>
        </tr>
    )
}

// ─── Mobile card ───────────────────────────────────────────────────────────

function RequestCard({
    item, onRowClick, onForceAction,
}: {
    item: LeaveRequestItem
    onRowClick: (item: LeaveRequestItem) => void
    onForceAction: (item: LeaveRequestItem, action: 'approve' | 'reject' | 'cancel') => void
}) {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending
    const emp = item.employee
    const typeColor = item.leave_type?.color ?? '#f9c5cd'

    return (
        <div
            onClick={() => onRowClick(item)}
            className="rounded-xl border border-white/10 p-3 active:scale-[0.99] transition-transform cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)' }}
        >
            <div className="flex items-start gap-3">
                <Avatar emp={emp} size={40} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate">
                                {emp?.nickname ?? emp?.first_name_th ?? '—'}
                            </p>
                            <p className="text-[11px] text-white/45 truncate">{emp?.department ?? '—'}</p>
                        </div>
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                            style={{ background: meta.bg, color: meta.color }}
                        >
                            {meta.label}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: `${typeColor}18`, color: typeColor }}
                        >
                            {item.leave_type?.name_th ?? '—'}
                        </span>
                        <span className="text-white/65">{formatDateRange(item.start_date, item.end_date)}</span>
                        <span className="text-white/45">· {item.total_days} วัน</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-white/40 font-mono">{item.reference_code ?? '—'}</span>
                        <span className="text-white/40">{formatRelative(item.submitted_at ?? item.created_at)}</span>
                    </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <RowActions item={item} onRowClick={onRowClick} onForceAction={onForceAction} />
                </div>
            </div>
        </div>
    )
}

// ─── Row-action menu ───────────────────────────────────────────────────────

function RowActions({
    item, onRowClick, onForceAction,
}: {
    item: LeaveRequestItem
    onRowClick: (item: LeaveRequestItem) => void
    onForceAction: (item: LeaveRequestItem, action: 'approve' | 'reject' | 'cancel') => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        window.addEventListener('mousedown', onClick)
        return () => window.removeEventListener('mousedown', onClick)
    }, [open])

    const canApprove = item.status !== 'approved'
    const canReject = item.status !== 'rejected'
    const canCancel = item.status !== 'cancelled'

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                    'hover:bg-white/10 text-white/55 hover:text-white',
                    open && 'bg-white/15 text-white',
                )}
                aria-label="เมนู"
            >
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div
                    className="absolute top-full right-0 mt-1 z-30 w-52 rounded-xl border border-white/15 shadow-2xl overflow-hidden"
                    style={{ background: 'rgba(20,5,8,0.98)', backdropFilter: 'blur(14px)' }}
                >
                    <MenuItem
                        icon={Eye}
                        label="ดูรายละเอียด"
                        onClick={() => { setOpen(false); onRowClick(item) }}
                    />
                    <div className="h-px bg-white/10" />
                    {canApprove && (
                        <MenuItem
                            icon={CheckCircle2}
                            label="บังคับอนุมัติ"
                            onClick={() => { setOpen(false); onForceAction(item, 'approve') }}
                            tone="green"
                        />
                    )}
                    {canReject && (
                        <MenuItem
                            icon={XCircle}
                            label="บังคับปฏิเสธ"
                            onClick={() => { setOpen(false); onForceAction(item, 'reject') }}
                            tone="red"
                        />
                    )}
                    {canCancel && (
                        <MenuItem
                            icon={Ban}
                            label="ยกเลิกใบลา"
                            onClick={() => { setOpen(false); onForceAction(item, 'cancel') }}
                            tone="gray"
                        />
                    )}
                </div>
            )}
        </div>
    )
}

function MenuItem({
    icon: Icon, label, onClick, tone = 'neutral',
}: {
    icon: typeof Eye
    label: string
    onClick: () => void
    tone?: 'neutral' | 'green' | 'red' | 'gray'
}) {
    const toneClass = tone === 'green' ? 'text-emerald-200 hover:bg-emerald-400/10'
        : tone === 'red' ? 'text-red-200 hover:bg-red-400/10'
        : tone === 'gray' ? 'text-white/60 hover:bg-white/5'
        : 'text-white/85 hover:bg-white/5'
    return (
        <button
            onClick={onClick}
            className={cn('flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors', toneClass)}
        >
            <Icon size={15} className="shrink-0" />
            <span>{label}</span>
        </button>
    )
}

// ─── Avatar ───────────────────────────────────────────────────────────────

function Avatar({ emp, size = 32 }: { emp: { photo_url: string | null; nickname: string | null; first_name_th: string | null; last_name_th: string | null } | null; size?: number }) {
    if (!emp) return <span className="block rounded-full bg-white/10" style={{ width: size, height: size }} />
    const initials = [emp.nickname?.[0], emp.first_name_th?.[0]].filter(Boolean).join('').toUpperCase() || '?'
    return (
        <span
            className="rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border border-white/10"
            style={{ width: size, height: size }}
        >
            {emp.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.photo_url} alt={emp.nickname ?? ''} className="h-full w-full object-cover" />
            ) : (
                <span className="text-white/75 text-[10px] font-bold">{initials}</span>
            )}
        </span>
    )
}

// ─── Formatters ────────────────────────────────────────────────────────────

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`
}

function formatDateRange(start: string, end: string): string {
    return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`
}

function formatRelative(iso: string | null | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const diff = Date.now() - d.getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'เมื่อสักครู่'
    if (min < 60) return `${min} นาทีที่แล้ว`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr} ชม.ที่แล้ว`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day} วันที่แล้ว`
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// (unused import guard — keep Clock in case table grows)
export const _clock = Clock
