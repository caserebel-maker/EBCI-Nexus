'use client'

import Link from 'next/link'
import { Activity, CheckCircle, Clock, XCircle, Ban, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RecentItem {
    id: string
    reference_code: string | null
    status: string
    start_date: string
    end_date: string
    total_days: number
    submitted_at: string | null
    created_at: string
    updated_at: string | null
    leave_type: { id: string; name_th: string; color: string | null } | null
    employee: {
        id: string
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        department: string | null
        photo_url: string | null
    } | null
}

interface Props {
    items: RecentItem[]
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
    pending:   { label: 'รออนุมัติ',  color: '#fcd34d', bg: 'rgba(251,191,36,0.18)', icon: Clock },
    approved:  { label: 'อนุมัติแล้ว', color: '#6ee7b7', bg: 'rgba(52,211,153,0.18)', icon: CheckCircle },
    rejected:  { label: 'ปฏิเสธ',      color: '#fca5a5', bg: 'rgba(239,68,68,0.18)',  icon: XCircle },
    cancelled: { label: 'ยกเลิก',      color: '#cbd5e1', bg: 'rgba(255,255,255,0.10)', icon: Ban },
}

function formatRelativeTh(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const sec = Math.floor(diffMs / 1000)
    if (sec < 60) return 'เมื่อสักครู่'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} นาทีที่แล้ว`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr} ชม.ที่แล้ว`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day} วันที่แล้ว`
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function formatDateShort(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    } catch {
        return iso
    }
}

function initials(emp: NonNullable<RecentItem['employee']>): string {
    const a = (emp.nickname ?? emp.first_name_th ?? '').trim().charAt(0)
    const b = (emp.last_name_th ?? '').trim().charAt(0)
    return (a + b) || '?'
}

export function RecentActivityList({ items }: Props) {
    return (
        <div className="p-4 sm:p-5 h-full flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-white/70" />
                    <h3 className="text-white font-bold text-sm sm:text-base">
                        กิจกรรมล่าสุด
                    </h3>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-white/40">
                    <Activity size={28} className="mb-2 opacity-50" />
                    <p className="text-sm">ยังไม่มีกิจกรรม</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 divide-y divide-white/5 -mx-2">
                        {items.map(r => {
                            const meta = STATUS_META[r.status] ?? STATUS_META.pending
                            const StatusIcon = meta.icon
                            const emp = r.employee
                            const activityTs = r.updated_at ?? r.submitted_at ?? r.created_at
                            const dateLabel = r.start_date === r.end_date
                                ? formatDateShort(r.start_date)
                                : `${formatDateShort(r.start_date)} – ${formatDateShort(r.end_date)}`
                            return (
                                <div
                                    key={r.id}
                                    className={cn(
                                        'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors',
                                        'hover:bg-white/5',
                                    )}
                                    title={r.reference_code ?? undefined}
                                >
                                    {/* Avatar */}
                                    <div className="shrink-0 h-10 w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/10">
                                        {emp?.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={emp.photo_url}
                                                alt={emp.nickname ?? ''}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-white/70 text-xs font-bold">
                                                {emp ? initials(emp) : '?'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-sm font-semibold truncate">
                                            {emp?.nickname ?? emp?.first_name_th ?? 'ไม่ทราบชื่อ'}
                                            <span className="text-white/50 font-normal ml-1">
                                                {r.status === 'approved' && 'ได้รับอนุมัติ'}
                                                {r.status === 'rejected' && 'ถูกปฏิเสธ'}
                                                {r.status === 'pending' && 'ยื่นคำขอ'}
                                                {r.status === 'cancelled' && 'ยกเลิก'}
                                                {!['approved', 'rejected', 'pending', 'cancelled'].includes(r.status) && r.status}
                                            </span>
                                        </p>
                                        <p className="text-xs text-white/60 truncate">
                                            {r.leave_type?.name_th ?? 'ลา'} · {dateLabel} · {r.total_days} วัน
                                        </p>
                                        <p className="text-[11px] text-white/40 mt-0.5">
                                            {formatRelativeTh(activityTs)}
                                        </p>
                                    </div>

                                    {/* Status pill */}
                                    <span
                                        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0"
                                        style={{ background: meta.bg, color: meta.color }}
                                    >
                                        <StatusIcon size={11} />
                                        {meta.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 text-center">
                        <Link
                            href="/hradmin/leave/admin"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                        >
                            ดูทั้งหมด
                            <ChevronRight size={13} />
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
