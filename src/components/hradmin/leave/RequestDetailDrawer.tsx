'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    X, ChevronLeft, Calendar, Clock, User, Paperclip, Phone,
    CheckCircle2, XCircle, Ban, FileText, MessageCircle,
} from 'lucide-react'
import { formatEmployeeName } from '@/lib/format-employee-name'
import { STATUS_META, type LeaveRequestItem } from './types'

interface Props {
    item: LeaveRequestItem | null
    onClose: () => void
    onForceAction: (action: 'approve' | 'reject' | 'cancel') => void
}

/**
 * Request detail sheet.
 *
 *   • Mobile (<768px) — portal to body, full-viewport takeover with
 *     its own back-button header + sticky action footer. z-index 80
 *     covers both the sticky topbar (z-40) and bottom nav (z-50);
 *     safe-area insets keep controls clear of the iPhone notch and
 *     home indicator.
 *   • Desktop (≥768px) — right-slide drawer ~480px wide, X button in
 *     header, backdrop dims the rest of the page.
 *
 * Portal matters: a `position: fixed` element inside a transformed
 * ancestor would be trapped by that ancestor's viewport. Mounting to
 * document.body guarantees the drawer always sits at the page root.
 */
export function RequestDetailDrawer({ item, onClose, onForceAction }: Props) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // SSR-safe portal gate — only render into document.body once we're
        // on the client.
        setMounted(true)
    }, [])

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

    if (!mounted || !item) return null

    const meta = STATUS_META[item.status] ?? STATUS_META.pending
    const emp = item.employee
    const approver = item.approver
    const typeColor = item.leave_type?.color ?? '#f9c5cd'

    // Conditional action set by current status — HR override = prefix
    // "บังคับ" to make the consequence obvious. The pending case is a
    // regular approve/reject/cancel flow.
    const actions = buildActions(item.status)

    const content = (
        <>
            {/* Backdrop — desktop only; mobile is a full takeover */}
            <div
                onClick={onClose}
                aria-hidden="true"
                className="absolute inset-0 bg-black/70 hidden md:block"
            />

            {/* Panel — mobile fills the viewport, desktop slides from the right */}
            <aside
                role="dialog"
                aria-labelledby="drawer-title"
                className="
                    absolute bg-no-repeat flex flex-col overflow-hidden shadow-2xl
                    inset-0
                    md:inset-y-0 md:right-0 md:left-auto md:w-[480px] lg:w-[520px]
                    md:border-l md:border-white/10
                "
                style={{
                    background: 'linear-gradient(160deg, rgba(20,5,8,0.99) 0%, rgba(60,15,20,0.99) 60%, rgba(86,30,35,0.98) 100%)',
                }}
            >
                {/* Sticky mobile header — back arrow + title + ref.
                    Desktop gets the same markup with an X button instead of
                    the back arrow for pattern recognition. */}
                <header
                    className="shrink-0 flex items-center gap-2 px-2 md:px-4 border-b border-white/10"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
                        paddingBottom: '6px',
                        minHeight: '56px',
                    }}
                >
                    <button
                        onClick={onClose}
                        aria-label="ปิด"
                        className="h-12 w-12 md:h-10 md:w-10 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors shrink-0"
                    >
                        {/* Back on mobile, X on desktop — same action, different affordance */}
                        <span className="md:hidden"><ChevronLeft size={22} /></span>
                        <span className="hidden md:inline"><X size={18} /></span>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h2 id="drawer-title" className="text-white font-bold text-base leading-tight truncate">
                            รายละเอียดใบลา
                        </h2>
                        <p className="text-[11px] text-white/55 font-mono mt-0.5 truncate">
                            {item.reference_code ?? '—'}
                        </p>
                    </div>
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                        style={{ background: meta.bg, color: meta.color, boxShadow: `0 0 0 1px ${meta.ring}` }}
                    >
                        {meta.label}
                    </span>
                </header>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                                    {formatEmployeeName(emp)}
                                </p>
                                <p className="text-xs text-white/55 truncate">{emp?.position ?? '—'} · {emp?.department ?? '—'}</p>
                                {emp?.email && <p className="text-[11px] text-white/40 truncate mt-0.5">{emp.email}</p>}
                            </div>
                        </div>
                    </Section>

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

                    <Section title="เหตุผล" icon={MessageCircle}>
                        <p className="text-sm text-white/85 whitespace-pre-wrap break-words">
                            {item.reason || <em className="text-white/45">ไม่ระบุ</em>}
                        </p>
                    </Section>

                    {item.contact_during_leave && (
                        <Section title="ติดต่อระหว่างลา" icon={Phone}>
                            <p className="text-sm text-white/85">{item.contact_during_leave}</p>
                        </Section>
                    )}

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
                                    {formatEmployeeName(approver)}
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-white/45">ยังไม่กำหนด</p>
                        )}
                    </Section>

                    <Section title="ผู้อนุมัติร่วม / แทน" icon={User}>
                        {item.backupApprover ? (
                            <div className="flex items-center gap-2">
                                {item.backupApprover.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.backupApprover.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                ) : (
                                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                                        {item.backupApprover.nickname?.[0] ?? '?'}
                                    </span>
                                )}
                                <span className="text-sm text-white/85">
                                    {formatEmployeeName(item.backupApprover)}
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-white/45">(ยังไม่ระบุผู้อนุมัติร่วม)</p>
                        )}
                    </Section>

                    {item.approval_notes && (
                        <Section title="บันทึกการอนุมัติ" icon={MessageCircle}>
                            <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 rounded-lg p-3 border border-white/10">
                                {item.approval_notes}
                            </pre>
                        </Section>
                    )}

                    {item.rejection_reason && (
                        <Section title="เหตุผลการปฏิเสธ / ยกเลิก" icon={XCircle}>
                            <p className="text-sm text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                                {item.rejection_reason}
                            </p>
                        </Section>
                    )}

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

                {/* Sticky action footer — only renders actions that are valid
                    for the current status; prefixes "บังคับ" on non-pending
                    states so HR sees they're overriding.
                    Bottom inset keeps buttons above the iPhone home indicator
                    and (on mobile) above the bottom nav bar when the drawer
                    is closed; the drawer itself has z-[80] which sits above
                    the nav, but the padding future-proofs against z-stack
                    changes. */}
                {actions.length > 0 && (
                    <footer
                        className="shrink-0 grid gap-2 border-t border-white/10 px-3 sm:px-4 pt-3"
                        style={{
                            gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
                            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
                            background: 'rgba(20,5,8,0.95)',
                        }}
                    >
                        {actions.map(a => (
                            <ActionButton
                                key={a.action}
                                icon={a.icon}
                                label={a.label}
                                tone={a.tone}
                                onClick={() => onForceAction(a.action)}
                            />
                        ))}
                    </footer>
                )}
            </aside>
        </>
    )

    return createPortal(
        <div className="fixed inset-0 z-[80]">{content}</div>,
        document.body,
    )
}

// ─── Action set per status ─────────────────────────────────────────────────

type ActionSpec = {
    action: 'approve' | 'reject' | 'cancel'
    label: string
    tone: 'green' | 'red' | 'gray'
    icon: typeof CheckCircle2
}

/**
 * Return the actions that make sense for the current status. A status
 * never offers its own transition back to itself — no "approve" button
 * on an already-approved row, etc. Non-pending transitions wear the
 * "บังคับ" prefix so HR sees it's an override, not a normal flow.
 */
function buildActions(status: string): ActionSpec[] {
    const approve: ActionSpec = { action: 'approve', label: 'อนุมัติ',  tone: 'green', icon: CheckCircle2 }
    const reject:  ActionSpec = { action: 'reject',  label: 'ปฏิเสธ',   tone: 'red',   icon: XCircle }
    const cancel:  ActionSpec = { action: 'cancel',  label: 'ยกเลิก',    tone: 'gray',  icon: Ban }
    const force = (a: ActionSpec): ActionSpec => ({ ...a, label: `บังคับ${a.label}` })

    switch (status) {
        case 'pending':   return [reject, cancel, approve]
        case 'approved':  return [force(reject), force(cancel)]
        case 'rejected':  return [force(approve), force(cancel)]
        case 'cancelled': return [force(approve), force(reject)]
        case 'cancellation_requested':
            return [
                { action: 'approve', label: 'ปฏิเสธคำขอยกเลิก', tone: 'gray', icon: Ban },
                { action: 'cancel', label: 'อนุมัติยกเลิกใบลา', tone: 'green', icon: CheckCircle2 },
            ]
        default:          return [force(approve), force(reject), force(cancel)]
    }
}

// ─── Presentational helpers ────────────────────────────────────────────────

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
    icon: Icon, label, tone, onClick,
}: {
    icon: typeof CheckCircle2
    label: string
    tone: 'green' | 'red' | 'gray'
    onClick: () => void
}) {
    const toneClass = tone === 'green'
        ? 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 border border-emerald-400/30 active:bg-emerald-500/40'
        : tone === 'red'
            ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-400/30 active:bg-red-500/40'
            : 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/15 active:bg-white/20'
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-sm font-bold transition-all ${toneClass}`}
        >
            <Icon size={15} />
            <span className="truncate">{label}</span>
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
