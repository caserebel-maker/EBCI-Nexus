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
        vercel: {
            plan: string
            status: string
            cost_thb: number
            note: string | null
            usage?: {
                project: {
                    id: string
                    name: string
                    framework: string | null
                    latest_deployment_at: string | null
                    latest_deployment_state: string | null
                    latest_deployment_url: string | null
                } | null
                deployments: {
                    last_30_days: number
                    last_7_days: number
                    success_rate_30d: number
                    failed_30d: number
                } | null
            } | null
        }
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
    forecast?: {
        storage: {
            daily_growth_mb: number
            monthly_growth_mb: number
            months_until_full: number | null
            year_projection_mb: number
            year_projection_percent: number
        }
        database: {
            daily_growth_mb: number | null
            monthly_growth_mb: number | null
            months_until_full: number | null
        }
        auth: {
            monthly_growth: number
            months_until_full: number | null
        }
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

                    {/* ─── Section 5b: Forecast / projections ─────────────────────
                        Projects storage / DB / auth users use into the next year
                        based on the 30-day growth rate. DB growth isn't tracked
                        yet (would need a daily snapshot table) — the card shows
                        an empty state for that one until the snapshot lands. */}
                    {data.forecast && <ForecastSection forecast={data.forecast} storageLimit={data.storage.limit_mb} />}

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

                        {/* Vercel deployment stats — only renders when
                            VERCEL_API_TOKEN is set + project metadata fetched. */}
                        {data.services.vercel.usage?.deployments && (
                            <VercelUsageCard
                                project={data.services.vercel.usage.project}
                                deployments={data.services.vercel.usage.deployments}
                            />
                        )}

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

// ─── Forecast section ───────────────────────────────────────────────────────
// Three projection cards based on 30-day growth rate. Storage has rich
// telemetry (RPC reports growth_30d_bytes); DB has none yet — its card
// renders an empty state until a daily snapshot table feeds the API.
function ForecastSection({
    forecast, storageLimit,
}: {
    forecast: NonNullable<QuotaPayload['forecast']>
    storageLimit: number
}) {
    return (
        <section className="p-5 sm:p-6" style={glass}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white inline-flex items-center gap-2">
                    <TrendingUp size={16} />
                    คาดการณ์การใช้งาน 12 เดือนข้างหน้า
                </h2>
                <span className="text-[11px] text-white/45">
                    คำนวณจากอัตราการเติบโตในช่วง 30 วันล่าสุด
                </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Storage — full data */}
                <ForecastCard
                    icon={HardDrive}
                    label="พื้นที่เก็บไฟล์"
                    daily={`${forecast.storage.daily_growth_mb.toFixed(2)} MB/วัน`}
                    monthly={`${forecast.storage.monthly_growth_mb.toFixed(2)} MB/เดือน`}
                    yearProjection={`~${(forecast.storage.year_projection_mb / 1024).toFixed(2)} GB ใน 12 เดือน`}
                    yearProjectionPercent={forecast.storage.year_projection_percent}
                    monthsUntilFull={forecast.storage.months_until_full}
                    storageLimit={storageLimit}
                />

                {/* Database — telemetry pending */}
                <ForecastCard
                    icon={Database}
                    label="ฐานข้อมูล"
                    daily={null}
                    monthly={null}
                    yearProjection={null}
                    yearProjectionPercent={null}
                    monthsUntilFull={null}
                    storageLimit={null}
                    emptyMessage="ยังไม่มี telemetry รายวัน — รอ snapshot table"
                />

                {/* Auth users */}
                <ForecastCard
                    icon={Users}
                    label="ผู้ใช้ระบบ"
                    daily={null}
                    monthly={`+${forecast.auth.monthly_growth} คน/เดือน`}
                    yearProjection={null}
                    yearProjectionPercent={null}
                    monthsUntilFull={forecast.auth.months_until_full}
                    storageLimit={null}
                    emptyMessage={forecast.auth.monthly_growth === 0 ? 'ไม่มีผู้ใช้ใหม่ใน 30 วันล่าสุด' : undefined}
                />
            </div>
        </section>
    )
}

function ForecastCard({
    icon: Icon, label, daily, monthly, yearProjection, yearProjectionPercent,
    monthsUntilFull, storageLimit, emptyMessage,
}: {
    icon: typeof Database
    label: string
    daily: string | null
    monthly: string | null
    yearProjection: string | null
    yearProjectionPercent: number | null
    monthsUntilFull: number | null
    storageLimit: number | null
    emptyMessage?: string
}) {
    const hasData = daily !== null || monthly !== null || yearProjection !== null
    const tone = monthsUntilFull === null ? 'ok'
        : monthsUntilFull < 6 ? 'critical'
        : monthsUntilFull < 12 ? 'warning'
        : 'ok'
    const meta = STATUS_META[tone]

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <Icon size={13} className="text-white/75" />
                </span>
                <span className="text-white/85 text-sm font-bold">{label}</span>
            </div>

            {!hasData && emptyMessage && (
                <p className="text-[11px] text-white/40 leading-relaxed py-2">{emptyMessage}</p>
            )}

            {hasData && (
                <div className="space-y-1.5 text-[12px]">
                    {daily && (
                        <Row label="ต่อวัน" value={daily} />
                    )}
                    {monthly && (
                        <Row label="ต่อเดือน" value={monthly} />
                    )}
                    {yearProjection && (
                        <Row label="ใน 12 เดือน" value={yearProjection} />
                    )}
                    {yearProjectionPercent !== null && storageLimit !== null && (
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-white/45 uppercase tracking-wider">
                                    คาดการณ์ % ของ limit
                                </span>
                                <span className={cn(
                                    'text-[11px] font-bold tabular-nums',
                                    yearProjectionPercent > 80 ? 'text-red-300'
                                        : yearProjectionPercent > 50 ? 'text-amber-200'
                                        : 'text-emerald-200',
                                )}>
                                    {yearProjectionPercent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className={cn(
                                        'h-full rounded-full bg-gradient-to-r',
                                        meta.bar,
                                    )}
                                    style={{ width: `${Math.min(100, yearProjectionPercent)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {monthsUntilFull !== null && (
                <div className={cn(
                    'mt-3 px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1',
                    meta.chip,
                )}>
                    <Clock size={11} />
                    เต็มในอีก {monthsUntilFull} เดือน
                </div>
            )}
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-white/55">{label}</span>
            <span className="text-white/90 font-semibold tabular-nums">{value}</span>
        </div>
    )
}

// ─── Vercel usage card ──────────────────────────────────────────────────────
function VercelUsageCard({
    project, deployments,
}: {
    project: NonNullable<QuotaPayload['services']['vercel']['usage']>['project']
    deployments: NonNullable<NonNullable<QuotaPayload['services']['vercel']['usage']>['deployments']>
}) {
    const successPct = (deployments.success_rate_30d * 100).toFixed(1)
    const failureBadge = deployments.failed_30d > 0
    const lastDeployIso = project?.latest_deployment_at
    const lastDeployRel = lastDeployIso ? formatRelative(lastDeployIso) : '—'
    const stateColor = (project?.latest_deployment_state ?? '').toUpperCase() === 'READY'
        ? 'text-emerald-300'
        : 'text-amber-300'

    return (
        <div className="mb-3 p-4 rounded-xl border border-white/10 bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-200" />
                    <span className="text-sm font-bold text-white">Vercel — deployment activity</span>
                    {project?.name && <span className="text-[11px] text-white/45 font-mono">{project.name}</span>}
                </div>
                {project?.latest_deployment_url && (
                    <a
                        href={project.latest_deployment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-white/55 hover:text-white inline-flex items-center gap-1"
                    >
                        ดู deployment ล่าสุด
                        <ExternalLink size={10} />
                    </a>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <Stat label="30 วันล่าสุด" value={String(deployments.last_30_days)} />
                <Stat label="7 วันล่าสุด"  value={String(deployments.last_7_days)} />
                <Stat
                    label="Success rate"
                    value={`${successPct}%`}
                    tone={deployments.success_rate_30d >= 0.9 ? 'green' : 'amber'}
                />
                <Stat
                    label="Failed"
                    value={String(deployments.failed_30d)}
                    tone={failureBadge ? 'red' : 'neutral'}
                />
            </div>
            <p className="mt-3 text-[11px] text-white/45 inline-flex items-center gap-1.5">
                <Clock size={11} />
                deployment ล่าสุด:
                <span className={cn('font-semibold', stateColor)}>
                    {project?.latest_deployment_state ?? '—'}
                </span>
                <span className="text-white/40">· {lastDeployRel}</span>
            </p>
        </div>
    )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'green' | 'amber' | 'red' | 'neutral' }) {
    const toneClass = tone === 'green' ? 'text-emerald-200'
        : tone === 'amber' ? 'text-amber-200'
        : tone === 'red'   ? 'text-red-200'
        : 'text-white'
    return (
        <div>
            <p className={cn('text-2xl font-bold tabular-nums', toneClass)}>{value}</p>
            <p className="text-[10px] text-white/55 uppercase tracking-wider">{label}</p>
        </div>
    )
}

function formatRelative(iso: string): string {
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
