'use client'

import Link from 'next/link'
import {
    CalendarDays, BarChart3, Users, CalendarRange,
    FileText, Clock, CheckCircle, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatsCard } from '@/components/hradmin/leave/StatsCard'
import { MonthlyTrendChart } from '@/components/hradmin/leave/MonthlyTrendChart'
import { LeaveTypePie } from '@/components/hradmin/leave/LeaveTypePie'
import { DepartmentBarChart } from '@/components/hradmin/leave/DepartmentBarChart'
import { RecentActivityList, type RecentItem } from '@/components/hradmin/leave/RecentActivityList'
import { YearSelector } from '@/components/hradmin/leave/YearSelector'

interface LeaveType {
    id: string
    name_th: string
    color: string | null
    icon: string | null
    display_order: number | null
}

interface PieSlice {
    leave_type_id: string
    name_th: string
    color: string | null
    count: number
}

interface DepartmentBar {
    department: string
    total_days: number
}

interface Stats {
    total: number
    pending: number
    approved: number
    rejected: number
    approvedPct: number
    pendingPct: number
    yoyDelta: number | null
    utilizationRate: number
    avgAnnualUsed: number
}

interface Props {
    year: number
    stats: Stats
    monthly: Array<Record<string, number | string>>
    pie: PieSlice[]
    departments: DepartmentBar[]
    recent: RecentItem[]
    leaveTypes: LeaveType[]
}

type TabKey = 'overview' | 'requests' | 'balances' | 'calendar'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3; href?: string; comingSoon?: boolean }> = [
    { key: 'overview',  label: 'ภาพรวม',        Icon: BarChart3,     href: '/hradmin/leave' },
    { key: 'requests',  label: 'ใบลาทั้งหมด',    Icon: FileText,      href: '/hradmin/leave?tab=requests' },
    { key: 'balances',  label: 'วันลาพนักงาน',   Icon: Users,         href: '/hradmin/leave?tab=balances' },
    { key: 'calendar',  label: 'ปฏิทิน',         Icon: CalendarRange, href: '/hradmin/leave?tab=calendar' },
]

const GLASS_STYLE: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '20px',
}

/**
 * Overview = Tab 1 of HR Leave Management. Ships alone this iteration;
 * tabs 2-4 are visible but disabled with a "ในเร็วๆ นี้" tooltip.
 *
 * Year selector drives the whole page via ?year=... querystring, which
 * triggers a full server re-fetch (force-dynamic) — simpler than
 * duplicating all aggregation logic client-side.
 */
export function OverviewView({
    year, stats, monthly, pie, departments, recent, leaveTypes,
}: Props) {
    const activeTab: TabKey = 'overview'

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-[#882136]/50 border border-[#ad5f6c]/25 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-[#f9c5cd]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-white dark:text-foreground leading-tight">
                            จัดการการลา
                        </h1>
                        <p className="text-sm text-white/60 dark:text-muted-foreground mt-0.5">
                            ภาพรวมการลาของพนักงานทั้งบริษัท
                        </p>
                    </div>
                </div>
                <YearSelector currentYear={year} />
            </div>

            {/* Tabs — only overview is enabled this iteration */}
            <div
                role="tablist"
                className="flex gap-1 p-1 rounded-xl border border-white/10 overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
            >
                {TABS.map(({ key, label, Icon, href, comingSoon }) => {
                    const active = activeTab === key
                    if (comingSoon) {
                        return (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={false}
                                aria-disabled="true"
                                title="ในเร็วๆ นี้"
                                disabled
                                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white/40 cursor-not-allowed relative group"
                            >
                                <Icon size={15} className="shrink-0" />
                                <span className="truncate">{label}</span>
                                <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider bg-amber-300/20 border border-amber-300/30 text-amber-200 rounded-full px-1.5 py-0.5 leading-none opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block">
                                    ในเร็วๆ นี้
                                </span>
                            </button>
                        )
                    }
                    return (
                        <Link
                            key={key}
                            href={href ?? '#'}
                            role="tab"
                            aria-selected={active}
                            className={cn(
                                'flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all',
                                active
                                    ? 'bg-amber-400 text-[#561e23] shadow'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                            )}
                        >
                            <Icon size={15} className="shrink-0" />
                            <span className="truncate">{label}</span>
                        </Link>
                    )
                })}
            </div>

            {/* Section 1: Stats cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatsCard
                    label="ใบลาทั้งหมด"
                    value={stats.total}
                    icon={FileText}
                    color="maroon"
                    hint={
                        stats.yoyDelta === null
                            ? 'ปีแรกที่ใช้งาน'
                            : stats.yoyDelta > 0
                                ? `↑ ${stats.yoyDelta}% จากปีที่แล้ว`
                                : stats.yoyDelta < 0
                                    ? `↓ ${Math.abs(stats.yoyDelta)}% จากปีที่แล้ว`
                                    : 'เท่าปีที่แล้ว'
                    }
                    hintTone={stats.yoyDelta === null
                        ? 'neutral'
                        : stats.yoyDelta > 0 ? 'up' : stats.yoyDelta < 0 ? 'down' : 'neutral'}
                />
                <StatsCard
                    label="รอการอนุมัติ"
                    value={stats.pending}
                    icon={Clock}
                    color="amber"
                    hint={stats.pending > 0 ? 'ควรตรวจสอบ' : 'ไม่มี'}
                    hintTone={stats.pending > 0 ? 'warning' : 'neutral'}
                />
                <StatsCard
                    label="อนุมัติแล้ว"
                    value={stats.approved}
                    icon={CheckCircle}
                    color="green"
                    hint={stats.total > 0 ? `${stats.approvedPct}% ของทั้งหมด` : 'ยังไม่มีข้อมูล'}
                    hintTone="neutral"
                />
                <StatsCard
                    label="อัตราการใช้สิทธิ์"
                    value={`${stats.utilizationRate}%`}
                    icon={TrendingUp}
                    color="blue"
                    hint={`ลาพักร้อนเฉลี่ย ${stats.avgAnnualUsed} วัน`}
                    hintTone="neutral"
                />
            </div>

            {/* Section 2 + 3 grid — monthly on the left (2 cols), pie on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2" style={GLASS_STYLE}>
                    <MonthlyTrendChart
                        data={monthly}
                        leaveTypes={leaveTypes}
                    />
                </div>
                <div style={GLASS_STYLE}>
                    <LeaveTypePie data={pie} />
                </div>
            </div>

            {/* Section 4 + 5 grid — dept bars + recent */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3" style={GLASS_STYLE}>
                    <DepartmentBarChart data={departments} />
                </div>
                <div className="lg:col-span-2" style={GLASS_STYLE}>
                    <RecentActivityList items={recent} />
                </div>
            </div>

        </div>
    )
}
