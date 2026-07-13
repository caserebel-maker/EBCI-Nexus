import Link from 'next/link'
import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Home,
    MessageSquareText,
    UserRound,
    XCircle,
} from 'lucide-react'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
    WFH_STATUS_BADGE,
    WFH_STATUS_LABEL,
    type WfhStatus,
} from '@/lib/wfh-shared'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type WfhRow = {
    id: string
    reference_code: string | null
    employee_id: string
    start_date: string
    end_date: string
    total_days: number | string
    reason: string | null
    contact_during_wfh: string | null
    status: WfhStatus | string
    approver_id: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    submitted_at: string | null
    cancelled_at: string | null
    cancellation_reason: string | null
    created_at: string | null
    updated_at: string | null
}

type EmployeeRow = {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    photo_url: string | null
}

type PageProps = {
    params: Promise<{ id: string }>
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    const dateOnly = iso.slice(0, 10)
    const d = new Date(`${dateOnly}T00:00:00+07:00`)
    if (Number.isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

function formatThaiDateTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${formatThaiDate(d.toISOString())} ${d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
    })} น.`
}

function formatRange(start: string, end: string): string {
    if (start === end) return formatThaiDate(start)
    return `${formatThaiDate(start)} - ${formatThaiDate(end)}`
}

function employeeName(employee: EmployeeRow | null): string {
    if (!employee) return 'ไม่พบข้อมูลพนักงาน'
    const fullName = [employee.first_name_th, employee.last_name_th].filter(Boolean).join(' ').trim()
    return fullName || employee.nickname || employee.employee_code || 'พนักงาน'
}

function statusBadge(status: string) {
    if (status in WFH_STATUS_BADGE) {
        const typed = status as WfhStatus
        return {
            label: WFH_STATUS_LABEL[typed],
            className: WFH_STATUS_BADGE[typed],
        }
    }
    return {
        label: status,
        className: 'text-white/70 bg-white/5 border-white/15',
    }
}

export default async function HrWfhRequestDetailPage({ params }: PageProps) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/dashboard')

    const { id } = await params
    const { data: request, error } = await supabaseAdmin
        .from('wfh_requests')
        .select(`
            id,
            reference_code,
            employee_id,
            start_date,
            end_date,
            total_days,
            reason,
            contact_during_wfh,
            status,
            approver_id,
            approved_at,
            approval_notes,
            rejection_reason,
            submitted_at,
            cancelled_at,
            cancellation_reason,
            created_at,
            updated_at
        `)
        .eq('id', id)
        .maybeSingle()

    if (error) {
        console.error('[hr-wfh-detail] request lookup failed:', error)
    }
    if (!request) notFound()

    const r = request as WfhRow
    const employeeIds = Array.from(new Set([r.employee_id, r.approver_id].filter(Boolean))) as string[]
    const employeeMap = new Map<string, EmployeeRow>()

    if (employeeIds.length > 0) {
        const { data: employees, error: employeesError } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, photo_url')
            .in('id', employeeIds)
        if (employeesError) {
            console.error('[hr-wfh-detail] employee lookup failed:', employeesError)
        }
        for (const e of (employees ?? []) as EmployeeRow[]) {
            employeeMap.set(e.id, e)
        }
    }

    const applicant = employeeMap.get(r.employee_id) ?? null
    const approver = r.approver_id ? employeeMap.get(r.approver_id) ?? null : null
    const badge = statusBadge(r.status)
    const reference = r.reference_code ?? 'WFH'
    const employeeProfileHref = applicant
        ? `/hradmin/employees/${encodeURIComponent(applicant.employee_code || applicant.id)}`
        : '/hradmin/employees'

    return (
        <div className="max-w-5xl mx-auto pb-10 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/hradmin/notifications"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    aria-label="กลับ"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-200">
                    <Home size={20} />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-200/80">WFH REQUEST</p>
                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">รายละเอียดคำขอ Work From Home</h1>
                    <p className="text-sm text-white/55">เปิดจากการแจ้งเตือนของ HR Admin · {reference}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/20 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-white/10 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold', badge.className)}>
                                {badge.label}
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-mono text-white/60">
                                {reference}
                            </span>
                        </div>
                        <h2 className="mt-4 text-2xl font-black text-white">{employeeName(applicant)}</h2>
                        <p className="text-sm text-white/55">
                            {[applicant?.employee_code, applicant?.department, applicant?.position].filter(Boolean).join(' · ') || '—'}
                        </p>
                    </div>
                    <Link
                        href={employeeProfileHref}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10"
                    >
                        <UserRound size={16} />
                        เปิดโปรไฟล์พนักงาน
                    </Link>
                </div>

                <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 space-y-5">
                        <InfoLine
                            icon={<CalendarDays size={18} />}
                            label="วันที่ขอ WFH"
                            value={`${formatRange(r.start_date, r.end_date)} · ${Number(r.total_days)} วัน`}
                        />
                        <InfoLine
                            icon={<MessageSquareText size={18} />}
                            label="เหตุผล"
                            value={r.reason || '—'}
                        />
                        <InfoLine
                            icon={<Home size={18} />}
                            label="ช่องทางติดต่อระหว่าง WFH"
                            value={r.contact_during_wfh || '—'}
                        />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-5 space-y-4">
                        <InfoLine
                            icon={<UserRound size={18} />}
                            label="ผู้อนุมัติ"
                            value={employeeName(approver)}
                        />
                        <InfoLine
                            icon={<Clock3 size={18} />}
                            label="เวลาส่งคำขอ"
                            value={formatThaiDateTime(r.submitted_at ?? r.created_at)}
                        />
                        {r.approved_at && (
                            <InfoLine
                                icon={<CheckCircle2 size={18} />}
                                label="เวลาอนุมัติ"
                                value={formatThaiDateTime(r.approved_at)}
                            />
                        )}
                        {r.cancelled_at && (
                            <InfoLine
                                icon={<XCircle size={18} />}
                                label="เวลายกเลิก"
                                value={formatThaiDateTime(r.cancelled_at)}
                            />
                        )}
                    </div>
                </div>

                {(r.approval_notes || r.rejection_reason || r.cancellation_reason) && (
                    <div className="px-5 sm:px-6 pb-6">
                        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
                            {r.approval_notes && <p><strong>หมายเหตุอนุมัติ:</strong> {r.approval_notes}</p>}
                            {r.rejection_reason && <p><strong>เหตุผลปฏิเสธ:</strong> {r.rejection_reason}</p>}
                            {r.cancellation_reason && <p><strong>เหตุผลยกเลิก:</strong> {r.cancellation_reason}</p>}
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}

function InfoLine({
    icon,
    label,
    value,
}: {
    icon: ReactNode
    label: string
    value: string
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-amber-200">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-white">{value}</p>
            </div>
        </div>
    )
}
