'use client'

import { useState } from 'react'
import { X, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react'

interface Announcement {
    id: string
    headline: string
    content: string
    imagePath: string | null
    priority: string
    publishDate: string
}

interface LeaveRequest {
    id: string
    leaveType: string
    startDate: string
    endDate: string
    totalDays: number
    reason: string
    status: string
    createdAt: string
    approvedAt: string | null
    rejectionReason: string | null
    approverName: string | null
}

interface Props {
    announcements: Announcement[]
    leaveRequests: LeaveRequest[]
}

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
}

const LEAVE_LABEL: Record<string, string> = {
    annual:       'ลาพักร้อน',
    sick:         'ลาป่วย',
    personal:     'ลากิจ',
    compensation: 'ลาหยุดชดเชย',
    maternity:    'ลาคลอด',
    ordination:   'ลาบวช',
}

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    emergency: { label: 'ด่วนมาก',         bg: 'rgba(239,68,68,0.25)',  text: '#FCA5A5' },
    internal:  { label: 'ประกาศภายใน',    bg: 'rgba(255,255,255,0.12)', text: '#CBD5E1' },
    promote:   { label: 'ประชาสัมพันธ์',   bg: 'rgba(96,165,250,0.2)',  text: '#93C5FD' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending:   { label: 'รอการอนุมัติ', color: '#FBBF24', icon: Clock },
    approved:  { label: 'อนุมัติแล้ว',  color: '#34D399', icon: CheckCircle },
    rejected:  { label: 'ปฏิเสธ',      color: '#F87171', icon: XCircle },
    cancelled: { label: 'ยกเลิก',      color: '#94A3B8', icon: XCircle },
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function formatDateShort(iso: string) {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function NotificationsClient({ announcements, leaveRequests }: Props) {
    const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null)

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">

            {/* Section 1: ประกาศจาก HR */}
            <div style={glass} className="p-4">
                <p className="text-white font-bold mb-3" style={{ fontSize: '16px' }}>ประกาศจาก HR</p>

                {announcements.length === 0 ? (
                    <p className="text-white/40 text-center py-6" style={{ fontSize: '14px' }}>ไม่มีประกาศ</p>
                ) : (
                    <div className="space-y-2">
                        {announcements.map((ann) => {
                            const pCfg = PRIORITY_CONFIG[ann.priority] ?? PRIORITY_CONFIG.internal
                            return (
                                <button
                                    key={ann.id}
                                    onClick={() => setSelectedAnn(ann)}
                                    className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98]"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                    style={{ background: pCfg.bg, color: pCfg.text }}>
                                                    {pCfg.label}
                                                </span>
                                                {ann.priority === 'emergency' && (
                                                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                                )}
                                            </div>
                                            <p className="text-white font-semibold leading-snug line-clamp-2"
                                                style={{ fontSize: '14px' }}>
                                                {ann.headline}
                                            </p>
                                            <p className="text-white/40 mt-0.5" style={{ fontSize: '12px' }}>
                                                {formatDate(ann.publishDate)}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-white/30 shrink-0 mt-1" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Section 2: สถานะใบลา */}
            <div style={glass} className="p-4">
                <p className="text-white font-bold mb-3" style={{ fontSize: '16px' }}>สถานะใบลา</p>

                {leaveRequests.length === 0 ? (
                    <p className="text-white/40 text-center py-6" style={{ fontSize: '14px' }}>ไม่มีประวัติการลา</p>
                ) : (
                    <div className="space-y-3">
                        {leaveRequests.map((req) => {
                            const sCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
                            const StatusIcon = sCfg.icon
                            return (
                                <div key={req.id}
                                    className="rounded-xl p-3"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>

                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div>
                                            <p className="text-white font-semibold" style={{ fontSize: '14px' }}>
                                                {LEAVE_LABEL[req.leaveType] ?? req.leaveType}
                                            </p>
                                            <p className="text-white/50" style={{ fontSize: '12px' }}>
                                                {formatDateShort(req.startDate)} – {formatDateShort(req.endDate)}
                                                {' '}({req.totalDays} วัน)
                                            </p>
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full shrink-0"
                                            style={{ background: `${sCfg.color}22`, color: sCfg.color }}>
                                            <StatusIcon size={12} />
                                            {sCfg.label}
                                        </span>
                                    </div>

                                    {/* Timeline */}
                                    <div className="flex items-center gap-0">
                                        {/* Step 1: ยื่นคำขอ */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ background: 'rgba(52,211,153,0.2)' }}>
                                                <CheckCircle size={14} className="text-emerald-400" />
                                            </div>
                                            <p className="text-white/50 mt-1 text-center" style={{ fontSize: '10px' }}>
                                                ยื่นคำขอ
                                            </p>
                                            <p className="text-white/30 text-center" style={{ fontSize: '10px' }}>
                                                {formatDateShort(req.createdAt)}
                                            </p>
                                        </div>

                                        {/* Connector */}
                                        <div className="flex-1 h-px mx-1 mt-[-18px]"
                                            style={{ background: req.status !== 'pending' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }} />

                                        {/* Step 2: ผลการอนุมัติ */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ background: `${sCfg.color}22` }}>
                                                <StatusIcon size={14} style={{ color: sCfg.color }} />
                                            </div>
                                            <p className="text-white/50 mt-1 text-center" style={{ fontSize: '10px' }}>
                                                {sCfg.label}
                                            </p>
                                            <p className="text-white/30 text-center" style={{ fontSize: '10px' }}>
                                                {req.approvedAt ? formatDateShort(req.approvedAt) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rejection reason */}
                                    {req.status === 'rejected' && req.rejectionReason && (
                                        <p className="mt-2 px-2 py-1.5 rounded-lg text-red-300"
                                            style={{ fontSize: '12px', background: 'rgba(239,68,68,0.1)' }}>
                                            เหตุผล: {req.rejectionReason}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Announcement Modal */}
            {selectedAnn && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                    onClick={() => setSelectedAnn(null)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        style={{ ...glass, background: 'rgba(15,4,7,0.94)', borderRadius: '20px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedAnn.imagePath && (
                            <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9', borderRadius: '20px 20px 0 0' }}>
                                <img src={selectedAnn.imagePath} alt={selectedAnn.headline} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(() => {
                                        const pCfg = PRIORITY_CONFIG[selectedAnn.priority] ?? PRIORITY_CONFIG.internal
                                        return (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: pCfg.bg, color: pCfg.text }}>
                                                {pCfg.label}
                                            </span>
                                        )
                                    })()}
                                </div>
                                <button onClick={() => setSelectedAnn(null)} className="text-white/50 hover:text-white transition-colors shrink-0">
                                    <X size={20} />
                                </button>
                            </div>
                            <h2 className="text-white font-bold mb-1" style={{ fontSize: '18px', lineHeight: 1.3 }}>
                                {selectedAnn.headline}
                            </h2>
                            <p className="text-white/35 mb-3" style={{ fontSize: '12px' }}>
                                {formatDate(selectedAnn.publishDate)}
                            </p>
                            <p className="text-white/70 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '14px' }}>
                                {selectedAnn.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
