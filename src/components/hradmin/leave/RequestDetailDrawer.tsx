'use client'

import { useEffect } from 'react'
import {
    X, Calendar, Clock, User, Paperclip, Phone, CheckCircle2, XCircle, Ban,
    FileText, MessageCircle,
} from 'lucide-react'
import { STATUS_META, type LeaveRequestItem } from './types'

interface Props {
    item: LeaveRequestItem | null
    onClose: () => void
    onForceAction: (action: 'approve' | 'reject' | 'cancel') => void
}

/**
 * Slide-in drawer that shows the full leave request detail. All fields
 * are read-only here; mutations happen through the force-action buttons
 * at the bottom, which call the same handler as the row dropdown.
 *
 * ESC closes; click-outside closes (overlay has its own handler).
 */
export function RequestDetailDrawer({ item, onClose, onForceAction }: Props) {
    useEffect(() => {
        if (!item) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [item, onClose])

    if (!item) return null

    const meta = STATUS_META[item.status] ?? STATUS_META.pending
    const emp = item.employee
    const approver = item.approver
    const typeColor = item.leave_type?.color ?? '#f9c5cd'
    const canApprove = item.status !== 'approved'
    const canReject = item.status !== 'rejected'
    const canCancel = item.status !== 'cancelled'

    return (
        <div className="fixed inset-0 z-[80]">
            {/* Overlay */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60"
                aria-hidden="true"
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-labelledby="drawer-title"
                className="absolute inset-y-0 right-0 w-full sm:max-w-md md:max-w-lg flex flex-col overflow-hidden shadow-2xl border-l border-white/10"
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.98) 0%, rgba(60,15,20,0.98) 60%, rgba(86,30,35,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                {/* Header */}
                <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <h2 id="drawer-title" className="text-white font-bold text-base leading-tight truncate">
                            รายละเอียดใบลา
                        </h2>
                        <p className="text-[11px] text-white/45 font-mono mt-0.5">{item.reference_code ?? '—'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="ปิด"
                    >
                        <X size={17} />
                    </button>
                </header>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {/* Status pill */}
                    <div>
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: meta.bg, color: meta.color, boxShadow: `0 0 0 1px ${meta.ring}` }}
                        >
                            {meta.label}
                        </span>
                    </div>

                    {/* Applicant card */}
                    <Section title="พนักงาน" icon={User}>
                        <div className="flex items-center gap-3">
                            {emp?.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={emp.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                            ) : (
                                <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold">
                                    {emp?.nickname?.[0] ?? '?'}
                                </span>
                            )}
                            <div className="min-w-0">
                                <p className="text-white font-semibold truncate">
                                    {[emp?.first_name_th, emp?.last_name_th].filter(Boolean).join(' ')
                                        + (emp?.nickname ? ` (${emp.nickname})` : '')}
                                </p>
                                <p className="text-xs text-white/55 truncate">{emp?.position ?? '—'} · {emp?.department ?? '—'}</p>
                                {emp?.email && <p className="text-[11px] text-white/40 truncate mt-0.5">{emp.email}</p>}
                            </div>
                        </div>
                    </Section>

                    {/* Leave type + dates */}
                    <Section title="ประเภท & ช่วงเวลา" icon={Calendar}>
                        <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold mb-2"
                            style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}33` }}
                        >
                            {item.leave_type?.name_th ?? '—'}
                        </div>
                        <Field label="ตั้งแต่">{formatThaiDate(item.start_date)}</Field>
                        <Field label="ถึง">{formatThaiDate(item.end_date)}</Field>
                        <Field label="จำนวนวัน">
                            {item.total_days} วัน{item.is_half_day ? ` (ครึ่งวัน - ${item.half_day_period === 'morning' ? 'เช้า' : 'บ่าย'})` : ''}
                        </Field>
                    </Section>

                    {/* Reason */}
                    <Section title="เหตุผล" icon={MessageCircle}>
                        <p className="text-sm text-white/85 whitespace-pre-wrap break-words">
                            {item.reason || <em className="text-white/45">ไม่ระบุ</em>}
                        </p>
                    </Section>

                    {/* Contact */}
                    {item.contact_during_leave && (
                        <Section title="ติดต่อระหว่างลา" icon={Phone}>
                            <p className="text-sm text-white/85">{item.contact_during_leave}</p>
                        </Section>
                    )}

                    {/* Attachment */}
                    {item.attachment_url && (
                        <Section title="เอกสารแนบ" icon={Paperclip}>
                            <a
                                href={item.attachment_url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/85 hover:text-white transition-colors"
                            >
                                <FileText size={14} className="shrink-0" />
                                <span className="truncate max-w-[240px]">{item.attachment_name ?? 'เปิดไฟล์'}</span>
                            </a>
                        </Section>
                    )}

                    {/* Approver */}
                    <Section title="ผู้อนุมัติ" icon={User}>
                        {approver ? (
                            <div className="flex items-center gap-2">
                                {approver.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={approver.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                ) : (
                                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                                        {approver.nickname?.[0] ?? '?'}
                                    </span>
                                )}
                                <span className="text-sm text-white/85">
                                    {[approver.first_name_th, approver.last_name_th].filter(Boolean).join(' ')
                                        + (approver.nickname ? ` (${approver.nickname})` : '')}
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-white/45">ยังไม่กำหนด</p>
                        )}
                    </Section>

                    {/* Approval notes (HR audit trail) */}
                    {item.approval_notes && (
                        <Section title="บันทึกการอนุมัติ" icon={MessageCircle}>
                            <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 rounded-lg p-3 border border-white/10">
                                {item.approval_notes}
                            </pre>
                        </Section>
                    )}

                    {/* Rejection reason */}
                    {item.rejection_reason && (
                        <Section title="เหตุผลการปฏิเสธ / ยกเลิก" icon={XCircle}>
                            <p className="text-sm text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                                {item.rejection_reason}
                            </p>
                        </Section>
                    )}

                    {/* Timeline */}
                    <Section title="Timeline" icon={Clock}>
                        <Field label="ยื่นเมื่อ">{formatFull(item.submitted_at ?? item.created_at)}</Field>
                        {item.approved_at && (
                            <Field label={item.status === 'approved' ? 'อนุมัติเมื่อ' : 'จัดการเมื่อ'}>
                                {formatFull(item.approved_at)}
                            </Field>
                        )}
                        {item.updated_at && (
                            <Field label="อัพเดตล่าสุด">{formatFull(item.updated_at)}</Field>
                        )}
                    </Section>
                </div>

                {/* Sticky action bar */}
                <footer
                    className="px-4 py-3 border-t border-white/10 shrink-0 grid grid-cols-3 gap-2"
                    style={{ background: 'rgba(20,5,8,0.95)' }}
                >
                    <ActionButton
                        icon={CheckCircle2}
                        label="อนุมัติ"
                        tone="green"
                        disabled={!canApprove}
                        onClick={() => onForceAction('approve')}
                    />
                    <ActionButton
                        icon={XCircle}
                        label="ปฏิเสธ"
                        tone="red"
                        disabled={!canReject}
                        onClick={() => onForceAction('reject')}
                    />
                    <ActionButton
                        icon={Ban}
                        label="ยกเลิก"
                        tone="gray"
                        disabled={!canCancel}
                        onClick={() => onForceAction('cancel')}
                    />
                </footer>
            </aside>
        </div>
    )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} className="text-white/45" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">{title}</h3>
            </div>
            <div className="text-sm space-y-1">{children}</div>
        </section>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-white/50 text-xs">{label}</span>
            <span className="text-white/90 text-right">{children}</span>
        </div>
    )
}

function ActionButton({
    icon: Icon, label, tone, disabled, onClick,
}: {
    icon: typeof CheckCircle2
    label: string
    tone: 'green' | 'red' | 'gray'
    disabled: boolean
    onClick: () => void
}) {
    const toneClass = disabled
        ? 'bg-white/[0.03] text-white/25 cursor-not-allowed'
        : tone === 'green'
            ? 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 border border-emerald-400/30'
            : tone === 'red'
                ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-400/30'
                : 'bg-white/10 text-white/75 hover:bg-white/15 border border-white/15'
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${toneClass}`}
        >
            <Icon size={14} />
            {label}
        </button>
    )
}

// ─── Formatters ────────────────────────────────────────────────────────────

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

function formatFull(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    return `${date} ${time}`
}
