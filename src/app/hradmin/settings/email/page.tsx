import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, MailCheck, MailWarning, Send } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
    canManageSystem,
    canViewAuditLog,
    getAuth,
    isLegacyHrAdmin,
} from '@/lib/route-auth'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100
const STATUSES = [
    'all',
    'sent',
    'delivered',
    'delivery_delayed',
    'bounced',
    'failed',
    'suppressed',
    'complained',
] as const

type StatusFilter = typeof STATUSES[number]

interface SearchParams {
    status?: string
}

interface EmailLogRow {
    id: string
    resend_email_id: string | null
    status: string
    sender_key: string | null
    from_address: string
    to_addresses: string[]
    subject: string
    category: string | null
    reference_code: string | null
    last_event_type: string | null
    last_event_at: string | null
    sent_at: string | null
    delivered_at: string | null
    alerted_at: string | null
    created_at: string
}

const STATUS_LABEL: Record<string, string> = {
    mock: 'Mock',
    queued: 'รอส่ง',
    sending: 'กำลังส่ง',
    sent: 'ส่งออกแล้ว',
    delivered: 'ปลายทางรับแล้ว',
    opened: 'เปิดอ่าน',
    clicked: 'คลิกลิงก์',
    delivery_delayed: 'ล่าช้า',
    bounced: 'ตีกลับ',
    complained: 'Spam complaint',
    failed: 'ล้มเหลว',
    suppressed: 'ถูกระงับ',
    unknown: 'ไม่ทราบ',
}

const STATUS_TONE: Record<string, string> = {
    mock: 'bg-white/10 text-white/60 border-white/15',
    queued: 'bg-sky-400/10 text-sky-200 border-sky-400/25',
    sending: 'bg-sky-400/10 text-sky-200 border-sky-400/25',
    sent: 'bg-blue-400/10 text-blue-200 border-blue-400/25',
    delivered: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/25',
    opened: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/25',
    clicked: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/25',
    delivery_delayed: 'bg-amber-400/10 text-amber-200 border-amber-400/25',
    bounced: 'bg-red-400/10 text-red-200 border-red-400/25',
    complained: 'bg-red-400/10 text-red-200 border-red-400/25',
    failed: 'bg-red-400/10 text-red-200 border-red-400/25',
    suppressed: 'bg-red-400/10 text-red-200 border-red-400/25',
    unknown: 'bg-white/10 text-white/60 border-white/15',
}

function formatWhen(value: string | null): string {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function statusLabel(status: string): string {
    return STATUS_LABEL[status] ?? status
}

function statusTone(status: string): string {
    return STATUS_TONE[status] ?? STATUS_TONE.unknown
}

function recipientLabel(recipients: string[]): string {
    if (recipients.length <= 2) return recipients.join(', ') || '—'
    return `${recipients.slice(0, 2).join(', ')} +${recipients.length - 2}`
}

function filterHref(status: StatusFilter): string {
    return status === 'all'
        ? '/hradmin/settings/email'
        : `/hradmin/settings/email?status=${status}`
}

export default async function EmailAuditPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canViewAuditLog(auth) && !canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        redirect('/hradmin/dashboard')
    }

    const sp = await searchParams
    const status = STATUSES.includes(sp.status as StatusFilter)
        ? sp.status as StatusFilter
        : 'all'

    let query = supabaseAdmin
        .from('email_delivery_logs')
        .select('id, resend_email_id, status, sender_key, from_address, to_addresses, subject, category, reference_code, last_event_type, last_event_at, sent_at, delivered_at, alerted_at, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

    if (status !== 'all') query = query.eq('status', status)

    const sinceDate = new Date()
    sinceDate.setUTCDate(sinceDate.getUTCDate() - 7)
    const since = sinceDate.toISOString()
    const [{ data: rows, error }, { data: recentRows }] = await Promise.all([
        query,
        supabaseAdmin
            .from('email_delivery_logs')
            .select('status')
            .gte('created_at', since)
            .limit(1000),
    ])

    const logs = (rows ?? []) as EmailLogRow[]
    const stats = (recentRows ?? []).reduce<Record<string, number>>((acc, row) => {
        const s = String((row as { status: string }).status)
        acc[s] = (acc[s] ?? 0) + 1
        acc.all = (acc.all ?? 0) + 1
        return acc
    }, { all: 0 })
    const issues = ['delivery_delayed', 'bounced', 'complained', 'failed', 'suppressed']
        .reduce((sum, s) => sum + (stats[s] ?? 0), 0)

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 flex items-center justify-center">
                            <MailWarning size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Email Audit</h1>
                            <p className="text-sm text-white/50">สถานะการส่งอีเมลระบบล่าสุดจาก Resend</p>
                        </div>
                    </div>
                </div>
                <div className="text-xs text-white/45">
                    Webhook: <code className="text-white/70">/api/webhooks/resend</code>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Stat icon={Send} label="7 วันล่าสุด" value={stats.all ?? 0} tone="blue" />
                <Stat icon={CheckCircle2} label="Delivered" value={stats.delivered ?? 0} tone="green" />
                <Stat icon={Clock} label="Delayed" value={stats.delivery_delayed ?? 0} tone="amber" />
                <Stat icon={AlertTriangle} label="ต้องดูแล" value={issues} tone={issues > 0 ? 'red' : 'green'} />
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                    <Link
                        key={s}
                        href={filterHref(s)}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                            status === s
                                ? 'border-white/35 bg-white/15 text-white'
                                : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80',
                        )}
                    >
                        {s === 'all' ? 'ทั้งหมด' : statusLabel(s)}
                    </Link>
                ))}
            </div>

            {error ? (
                <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
                    โหลด Email Audit ไม่สำเร็จ: {error.message}
                </div>
            ) : logs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                    <MailCheck className="mx-auto mb-2 text-emerald-200" size={28} />
                    <p className="text-sm text-white/65">ยังไม่มีรายการอีเมลในตัวกรองนี้</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/45">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">สถานะ</th>
                                    <th className="px-4 py-3 font-semibold">ผู้รับ</th>
                                    <th className="px-4 py-3 font-semibold">หัวข้อ</th>
                                    <th className="px-4 py-3 font-semibold">Ref</th>
                                    <th className="px-4 py-3 font-semibold">Event ล่าสุด</th>
                                    <th className="px-4 py-3 font-semibold">เวลา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {logs.map(row => (
                                    <tr key={row.id} className="hover:bg-white/[0.03]">
                                        <td className="px-4 py-3 align-top">
                                            <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', statusTone(row.status))}>
                                                {statusLabel(row.status)}
                                            </span>
                                            {row.alerted_at && (
                                                <p className="mt-1 text-[11px] text-amber-200/70">แจ้ง HR แล้ว</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top text-white/75">
                                            {recipientLabel(row.to_addresses)}
                                            <p className="mt-1 text-[11px] text-white/35">{row.from_address}</p>
                                        </td>
                                        <td className="max-w-md px-4 py-3 align-top text-white/85">
                                            <p className="line-clamp-2">{row.subject}</p>
                                            <p className="mt-1 text-[11px] text-white/35">{row.category ?? row.sender_key ?? 'system'}</p>
                                        </td>
                                        <td className="px-4 py-3 align-top text-white/60">
                                            {row.reference_code ?? row.resend_email_id ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 align-top text-white/60">
                                            {row.last_event_type ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 align-top text-white/60">
                                            {formatWhen(row.last_event_at ?? row.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function Stat({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Send
    label: string
    value: number
    tone: 'blue' | 'green' | 'amber' | 'red'
}) {
    const palette = {
        blue: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
        green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
        amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
        red: 'border-red-400/20 bg-red-500/10 text-red-200',
    }[tone]

    return (
        <div className={cn('rounded-xl border p-4', palette)}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white/55">{label}</p>
                <Icon size={16} />
            </div>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
    )
}
