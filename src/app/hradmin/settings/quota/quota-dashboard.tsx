'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    Activity, Database, HardDrive, Users, RefreshCw, Loader2, ExternalLink,
    AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, Server, Github,
    Globe, Sparkles, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'ok' | 'warning' | 'critical'

interface BucketEntry {
    name: string
    count: number
    size_mb: number
    size_bytes: number
    percent_of_storage: number
    public: boolean
}

interface TableEntry {
    name: string
    rows: number
    size_mb: number
    size_bytes: number
}

interface QuotaPayload {
    database: { size_mb: number; size_bytes: number; limit_mb: number; percent_used: number; status: Status }
    storage: {
        total_mb: number
        total_bytes: number
        limit_mb: number
        percent_used: number
        status: Status
        growth_30d_mb: number
        months_until_full: number | null
        buckets: BucketEntry[]
    }
    auth: { users: number; users_growth_30d: number; limit: number; percent_used: number; status: Status }
    tables: TableEntry[]
    total_rows: number
    services: {
        vercel: { plan: string; status: string; cost_thb: number; note: string | null }
        supabase: { plan: string; status: string; cost_thb: number; note: string | null }
        github: { plan: string; status: string; cost_thb: number; note: string | null }
        domain: { plan: string; status: string; cost_thb: number | null; note: string | null }
    }
    recommendation: {
        level: Status
        headline: string
        body: string
        action?: { label: string; href: string } | null
    }
    computed_at: string
}

const STATUS_META: Record<Status, { label: string; chip: string; text: string; bar: string; icon: typeof CheckCircle2 }> = {
    ok:       { label: 'ปกติ',       chip: 'bg-emerald-500/20 text-emerald-200', text: 'text-emerald-300', bar: 'from-emerald-400 to-emerald-500',  icon: CheckCircle2 },
    warning:  { label: 'ควรระวัง',   chip: 'bg-amber-500/25 text-amber-100',     text: 'text-amber-300',   bar: 'from-amber-400 to-amber-500',      icon: AlertTriangle },
    critical: { label: 'วิกฤต',      chip: 'bg-red-500/25 text-red-200',         text: 'text-red-300',     bar: 'from-red-500 to-red-600',          icon: AlertCircle },
}

const glass = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
} as const

function formatMB(mb: number): string {
    if (mb < 0.01) return '0 MB'
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`
    return `${mb.toFixed(2)} MB`
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return formatMB(bytes / (1024 * 1024))
}

function formatDateTime(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

// ─── Reusable metric card ────────────────────────────────────────────────────
function MetricCard({
    icon: Icon, label, valueDisplay, limitDisplay, percent, status, trend,
}: {
    icon: typeof Database
    label: string
    valueDisplay: string
    limitDisplay: string
    percent: number
    status: Status
    trend?: string | null
}) {
    const meta = STATUS_META[status]
    const StatusIcon = meta.icon
    return (
        <div className="p-5" style={glass}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/80">
                        <Icon size={18} />
                    </div>
                    <p className="text-white/75 text-sm font-semibold">{label}</p>
                </div>
                <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', meta.chip)}>
                    <StatusIcon size={11} />
                    {meta.label}
                </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-bold text-white tabular-nums">{valueDisplay}</p>
                <p className="text-white/50 text-sm">{limitDisplay}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-white/55 mb-2">
                <span className="tabular-nums font-semibold">{percent.toFixed(percent < 1 ? 3 : 1)}%</span>
                {trend && <span>{trend}</span>}
            </div>

            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-500 bg-gradient-to-r', meta.bar)}
                    style={{ width: `${Math.min(100, Math.max(0.5, percent)).toFixed(2)}%` }}
                />
            </div>
        </div>
    )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function Skeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-5 h-[160px]" style={glass}>
                        <div className="h-10 w-10 rounded-xl bg-white/10 mb-4" />
                        <div className="h-8 w-28 bg-white/10 rounded mb-2" />
                        <div className="h-2 bg-white/10 rounded-full" />
                    </div>
                ))}
            </div>
            <div className="h-64 rounded-2xl bg-white/5" />
        </div>
    )
}

// ─── Main dashboard ──────────────────────────────────────────────────────────
export function QuotaDashboard() {
    const [data, setData] = useState<QuotaPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setErr(null)
        try {
            const res = await fetch('/api/hradmin/system/quota', { cache: 'no-store' })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            const json = await res.json()
            setData(json)
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">ระบบและทรัพยากร</h1>
                        <p className="text-sm text-white/50">
                            ติดตามการใช้พื้นที่และทรัพยากร เพื่อวางแผนการอัปเกรด
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => load(true)}
                    disabled={loading || refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg border border-white/15 transition-all active:scale-95 disabled:opacity-60"
                >
                    {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    รีเฟรช
                </button>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
                    โหลดข้อมูลไม่สำเร็จ: {err}
                </div>
            )}

            {loading ? <Skeleton /> : data && (
                <>
                    {/* ─── Section 1: 3 metric cards ────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard
                            icon={Database}
                            label="ฐานข้อมูล"
                            valueDisplay={formatMB(data.database.size_mb)}
                            limitDisplay={`/ ${formatMB(data.database.limit_mb)}`}
                            percent={data.database.percent_used}
                            status={data.database.status}
                            trend={`รวม ${data.total_rows.toLocaleString()} แถว`}
                        />
                        <MetricCard
                            icon={HardDrive}
                            label="พื้นที่เก็บไฟล์"
                            valueDisplay={formatMB(data.storage.total_mb)}
                            limitDisplay={`/ ${formatMB(data.storage.limit_mb)}`}
                            percent={data.storage.percent_used}
                            status={data.storage.status}
                            trend={
                                data.storage.growth_30d_mb > 0
                                    ? `+${data.storage.growth_30d_mb.toFixed(2)} MB / 30 วัน`
                                    : 'ยังไม่มีไฟล์ใหม่ใน 30 วัน'
                            }
                        />
                        <MetricCard
                            icon={Users}
                            label="ผู้ใช้ระบบ"
                            valueDisplay={data.auth.users.toLocaleString()}
                            limitDisplay={`/ ${data.auth.limit.toLocaleString()}`}
                            percent={data.auth.percent_used}
                            status={data.auth.status}
                            trend={
                                data.auth.users_growth_30d > 0
                                    ? `+${data.auth.users_growth_30d} / 30 วัน`
                                    : 'คงที่'
                            }
                        />
                    </div>

                    {/* ─── Section 5: Recommendation ────────────────────────────── */}
                    <RecommendationCard recommendation={data.recommendation} storageMonthsLeft={data.storage.months_until_full} />

                    {/* ─── Section 2: Storage buckets ───────────────────────────── */}
                    <section className="p-5 sm:p-6" style={glass}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
                                <HardDrive size={16} />
                                พื้นที่เก็บไฟล์ แยกตาม bucket
                            </h2>
                            <span className="text-xs text-white/50 tabular-nums">
                                รวม {formatMB(data.storage.total_mb)}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {data.storage.buckets.map(b => (
                                <div key={b.name} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-white/5 last:border-0">
                                    <div className="col-span-12 sm:col-span-4 min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{b.name}</p>
                                        <p className="text-[11px] text-white/45">{b.public ? 'public' : 'private'}</p>
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-white/70 text-sm tabular-nums">
                                        {b.count.toLocaleString()} ไฟล์
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-white/70 text-sm tabular-nums">
                                        {formatMB(b.size_mb)}
                                    </div>
                                    <div className="col-span-4 sm:col-span-4 flex items-center gap-2">
                                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#ad5f6c] to-[#882136] transition-all duration-500"
                                                style={{ width: `${Math.max(b.percent_of_storage, b.count === 0 ? 0 : 1)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/50 tabular-nums w-10 text-right">{b.percent_of_storage.toFixed(0)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─── Section 3: Tables ────────────────────────────────────── */}
                    <section className="p-5 sm:p-6" style={glass}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
                                <Database size={16} />
                                ข้อมูลในระบบ (แยกตาม table)
                            </h2>
                            <span className="text-xs text-white/50 tabular-nums">
                                รวม {data.total_rows.toLocaleString()} แถว
                            </span>
                        </div>
                        <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-sm">
                                <thead className="text-white/55">
                                    <tr className="text-left">
                                        <th className="py-2 px-2 font-semibold">Table</th>
                                        <th className="py-2 px-2 font-semibold text-right">จำนวน rows</th>
                                        <th className="py-2 px-2 font-semibold text-right">ขนาด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.tables.map(t => (
                                        <tr key={t.name} className="border-t border-white/5">
                                            <td className="py-2 px-2 font-mono text-white/85 text-[13px]">{t.name}</td>
                                            <td className="py-2 px-2 text-right text-white tabular-nums">{t.rows.toLocaleString()}</td>
                                            <td className="py-2 px-2 text-right text-white/70 tabular-nums">{formatBytes(t.size_bytes)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ─── Section 4: Service status ────────────────────────────── */}
                    <section>
                        <h2 className="text-base font-bold text-white mb-3 inline-flex items-center gap-2">
                            <Server size={16} />
                            สถานะบริการที่ใช้
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <ServiceCard
                                icon={Sparkles}
                                title="Vercel"
                                plan={data.services.vercel.plan}
                                status={data.services.vercel.status}
                                cost={`${data.services.vercel.cost_thb.toLocaleString()} บาท/เดือน`}
                                note={data.services.vercel.note}
                                href="https://vercel.com/dashboard"
                            />
                            <ServiceCard
                                icon={Database}
                                title="Supabase"
                                plan={data.services.supabase.plan}
                                status={data.services.supabase.status}
                                cost={`${data.services.supabase.cost_thb.toLocaleString()} บาท/เดือน`}
                                note={`ใช้ไป ${data.database.percent_used.toFixed(1)}% ของ limit`}
                                href="https://supabase.com/dashboard"
                            />
                            <ServiceCard
                                icon={Github}
                                title="GitHub"
                                plan={data.services.github.plan}
                                status={data.services.github.status}
                                cost={`${data.services.github.cost_thb.toLocaleString()} บาท/เดือน`}
                                note={null}
                                href="https://github.com"
                            />
                            <ServiceCard
                                icon={Globe}
                                title="Domain"
                                plan={data.services.domain.plan}
                                status={data.services.domain.status}
                                cost="จัดการแยก"
                                note={data.services.domain.note}
                                href={null}
                            />
                        </div>
                    </section>

                    {/* Footer */}
                    <p className="text-center text-[11px] text-white/35 inline-flex items-center justify-center gap-1.5 w-full pt-2 pb-4">
                        <Clock size={11} />
                        ข้อมูลอัปเดตล่าสุด {formatDateTime(data.computed_at)}
                    </p>
                </>
            )}
        </div>
    )
}

// ─── Recommendation card ─────────────────────────────────────────────────────
function RecommendationCard({
    recommendation, storageMonthsLeft,
}: {
    recommendation: QuotaPayload['recommendation']
    storageMonthsLeft: number | null
}) {
    const meta = STATUS_META[recommendation.level]
    const Icon = meta.icon
    const borderClass = recommendation.level === 'ok'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : recommendation.level === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-red-500/40 bg-red-500/10'
    return (
        <section className={cn('p-5 sm:p-6 rounded-2xl border flex items-start gap-4', borderClass)}>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', meta.chip)}>
                <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-[17px] mb-1.5">{recommendation.headline}</h2>
                <p className="text-white/75 text-sm leading-relaxed">{recommendation.body}</p>
                {recommendation.level === 'ok' && storageMonthsLeft !== null && storageMonthsLeft < 24 && (
                    <p className="text-white/50 text-xs mt-2 inline-flex items-center gap-1.5">
                        <TrendingUp size={12} />
                        พื้นที่เก็บไฟล์คาดว่าเต็มใน ~{storageMonthsLeft} เดือน ที่อัตรารับไฟล์ปัจจุบัน
                    </p>
                )}
                {recommendation.action && (
                    <a
                        href={recommendation.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all"
                    >
                        {recommendation.action.label}
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>
        </section>
    )
}

// ─── Service card ────────────────────────────────────────────────────────────
function ServiceCard({
    icon: Icon, title, plan, status, cost, note, href,
}: {
    icon: typeof Sparkles
    title: string
    plan: string
    status: string
    cost: string
    note: string | null
    href: string | null
}) {
    return (
        <div className="p-4" style={glass}>
            <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/85">
                    <Icon size={15} />
                </div>
                <p className="text-white font-bold text-sm">{title}</p>
            </div>
            <p className="text-white/70 text-[13px]">{plan}</p>
            <p className="text-[11px] uppercase tracking-wider font-bold mt-1">
                <span className={cn('inline-block px-1.5 py-0.5 rounded',
                    status === 'active' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60')}>
                    {status}
                </span>
            </p>
            <p className="text-white/80 text-sm font-semibold mt-2">{cost}</p>
            {note && <p className="text-[11px] text-white/45 mt-1.5 leading-relaxed">{note}</p>}
            {href && (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2.5 text-[11px] text-white/60 hover:text-white font-semibold"
                >
                    เปิด dashboard
                    <ExternalLink size={10} />
                </a>
            )}
        </div>
    )
}
