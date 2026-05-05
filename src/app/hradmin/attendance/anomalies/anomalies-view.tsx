'use client'

import { useState, useTransition } from 'react'
import { Clock, AlertTriangle, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBangkokTime, formatBangkokDateTime } from '@/lib/datetime'
import {
    closeOpenSessionManually,
    type AnomaliesData,
    type OpenSessionRow,
    type LateCheckinRow,
} from './actions'

interface Props {
    initial: AnomaliesData
}

// Format Xh Ym (or just Ym for < 60min)
function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} นาที`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`
}

const TYPE_LABEL: Record<string, string> = {
    office: 'ออฟฟิศ', wfh: 'WFH', field: 'ภาคสนาม',
}

export function AnomaliesView({ initial }: Props) {
    const [data, setData] = useState<AnomaliesData>(initial)
    const [closingId, setClosingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const handleManualClose = (row: OpenSessionRow) => {
        const proceed = confirm(
            `ปิดเช็คอินของ ${row.nickname ?? row.nameTh} ?\n\n`
            + `เช็คอินเมื่อ ${formatBangkokDateTime(row.checkedInAtIso)}\n`
            + `เปิดมา ${formatDuration(row.minutesOpen)}\n\n`
            + `ระบบจะบันทึกเวลาเช็คเอาท์ = เช็คอิน + 9 ชม. (มาตรฐาน 1 วันทำงาน)\n`
            + `และ mark ว่า "ปิดโดยระบบ" ใน timesheet`,
        )
        if (!proceed) return

        setClosingId(row.checkinId)
        startTransition(async () => {
            const res = await closeOpenSessionManually(row.checkinId, null)
            setClosingId(null)
            if ('error' in res) {
                showToast('error', res.error)
                return
            }
            showToast('success', `ปิดเช็คอินของ ${row.nickname ?? row.nameTh} แล้ว`)
            // Optimistically remove the row from local state.
            setData(d => ({
                ...d,
                openSessions: d.openSessions.filter(o => o.checkinId !== row.checkinId),
            }))
        })
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-bold text-white">ความผิดปกติของเช็คอิน</h1>
                <p className="text-sm text-white/60">
                    เซสชั่นที่เปิดค้าง + การมาสายของเดือน {data.monthIso}
                </p>
            </header>

            {/* Toast */}
            {toast && (
                <div
                    role="alertdialog"
                    className={cn(
                        'fixed top-4 right-4 z-[80] px-4 py-3 rounded-xl border shadow-lg max-w-sm',
                        toast.type === 'success'
                            ? 'bg-emerald-500/90 border-emerald-400/40 text-white'
                            : 'bg-rose-500/90 border-rose-400/40 text-white',
                    )}
                >
                    <p className="text-sm font-semibold">{toast.msg}</p>
                </div>
            )}

            {/* Section 1 — Open sessions */}
            <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-amber-300" />
                        <h2 className="text-base font-bold text-white">
                            เซสชั่นเปิดค้าง <span className="text-white/45 font-normal">({data.openSessions.length})</span>
                        </h2>
                    </div>
                    <span className="text-[11px] text-white/40">
                        ระบบปิดอัตโนมัติทุก 18:30 (เกิน 12 ชม. ตั้งแต่เช็คอิน)
                    </span>
                </header>
                {data.openSessions.length === 0 ? (
                    <div className="p-8 text-center text-white/45 text-sm flex flex-col items-center gap-2">
                        <CheckCircle2 size={28} className="text-emerald-400/70" />
                        ไม่มีเซสชั่นเปิดค้าง — ทุกคนเช็คเอาท์แล้ว
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-white/55 border-b border-white/10">
                                    <th className="px-4 py-2.5 font-semibold">พนักงาน</th>
                                    <th className="px-4 py-2.5 font-semibold">แผนก</th>
                                    <th className="px-4 py-2.5 font-semibold">ประเภท</th>
                                    <th className="px-4 py-2.5 font-semibold">เช็คอินเมื่อ</th>
                                    <th className="px-4 py-2.5 font-semibold">เปิดมา</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.openSessions.map(row => (
                                    <OpenRow
                                        key={row.checkinId}
                                        row={row}
                                        closing={closingId === row.checkinId && isPending}
                                        onClose={() => handleManualClose(row)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Section 2 — Late check-ins this month */}
            <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-300" />
                        <h2 className="text-base font-bold text-white">
                            มาสายเดือน {data.monthIso} <span className="text-white/45 font-normal">({data.lateCheckins.length})</span>
                        </h2>
                    </div>
                    <span className="text-[11px] text-white/40">
                        เริ่มงาน 08:30 · เกิน 60 นาทีหัวหน้าจะได้ 🔔
                    </span>
                </header>
                {data.lateCheckins.length === 0 ? (
                    <div className="p-8 text-center text-white/45 text-sm flex flex-col items-center gap-2">
                        <CheckCircle2 size={28} className="text-emerald-400/70" />
                        ไม่มีคนมาสายเดือนนี้
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-white/55 border-b border-white/10">
                                    <th className="px-4 py-2.5 font-semibold">พนักงาน</th>
                                    <th className="px-4 py-2.5 font-semibold">แผนก</th>
                                    <th className="px-4 py-2.5 font-semibold">ประเภท</th>
                                    <th className="px-4 py-2.5 font-semibold">วันที่/เวลา</th>
                                    <th className="px-4 py-2.5 font-semibold">สาย</th>
                                    <th className="px-4 py-2.5 font-semibold">เหตุผล</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.lateCheckins.map(row => (
                                    <LateRow key={row.checkinId} row={row} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

function OpenRow({ row, closing, onClose }: { row: OpenSessionRow; closing: boolean; onClose: () => void }) {
    return (
        <tr className="border-b border-white/5 hover:bg-white/[.02]">
            <td className="px-4 py-3">
                <div className="text-white font-medium">
                    {row.nickname ? `${row.nickname} (${row.nameTh})` : row.nameTh}
                </div>
                <div className="text-xs text-white/45 mt-0.5">รหัส {row.employeeCode}</div>
            </td>
            <td className="px-4 py-3 text-white/70">{row.department ?? '—'}</td>
            <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-xs">
                    {TYPE_LABEL[row.type] ?? row.type}
                </span>
            </td>
            <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                {formatBangkokTime(row.checkedInAtIso)}
                {row.lateMinutes ? <span className="ml-1.5 text-rose-300 text-xs">(สาย {row.lateMinutes} นาที)</span> : null}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={cn(
                    'font-semibold',
                    row.minutesOpen > 12 * 60 ? 'text-rose-300' : 'text-amber-300',
                )}>
                    {formatDuration(row.minutesOpen)}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={onClose}
                    disabled={closing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/85 hover:bg-amber-500 disabled:opacity-50 text-[#1a0a0d] text-xs font-bold"
                >
                    {closing ? <Loader2 size={12} className="animate-spin" /> : null}
                    ปิดเซสชั่น
                </button>
            </td>
        </tr>
    )
}

function LateRow({ row }: { row: LateCheckinRow }) {
    return (
        <tr className="border-b border-white/5 hover:bg-white/[.02]">
            <td className="px-4 py-3">
                <div className="text-white font-medium">
                    {row.nickname ? `${row.nickname} (${row.nameTh})` : row.nameTh}
                </div>
                <div className="text-xs text-white/45 mt-0.5">รหัส {row.employeeCode}</div>
            </td>
            <td className="px-4 py-3 text-white/70">{row.department ?? '—'}</td>
            <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-xs">
                    {TYPE_LABEL[row.type] ?? row.type}
                </span>
            </td>
            <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                {formatBangkokDateTime(row.checkedInAtIso)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={cn(
                    'font-semibold',
                    row.lateMinutes > 60 ? 'text-rose-300' : row.lateMinutes > 30 ? 'text-amber-300' : 'text-amber-200/80',
                )}>
                    {row.lateMinutes} นาที
                </span>
            </td>
            <td className="px-4 py-3 text-white/70 max-w-md">
                {row.lateReason
                    ? <span className="inline-flex items-start gap-1.5"><MessageSquare size={12} className="mt-1 shrink-0 text-white/40" /> {row.lateReason}</span>
                    : <span className="text-white/35">—</span>}
            </td>
        </tr>
    )
}
