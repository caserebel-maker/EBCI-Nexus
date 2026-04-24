'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    CalendarDays, BarChart3, Users, CalendarRange, FileText, Plus, Download,
    RefreshCw, ChevronLeft, ChevronRight, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RequestFilters } from '@/components/hradmin/leave/RequestFilters'
import { RequestsTable } from '@/components/hradmin/leave/RequestsTable'
import { RequestDetailDrawer } from '@/components/hradmin/leave/RequestDetailDrawer'
import { ForceActionDialog } from '@/components/hradmin/leave/ForceActionDialog'
import { CreateOnBehalfModal } from '@/components/hradmin/leave/CreateOnBehalfModal'
import { YearSelector } from '@/components/hradmin/leave/YearSelector'
import type {
    LeaveRequestItem, LeaveTypeLite,
    RequestsFilterState, RequestsPagination,
} from '@/components/hradmin/leave/types'

type TabKey = 'overview' | 'requests' | 'balances' | 'calendar'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3; href: string; comingSoon?: boolean }> = [
    { key: 'overview',  label: 'ภาพรวม',        Icon: BarChart3,     href: '/hradmin/leave' },
    { key: 'requests',  label: 'ใบลาทั้งหมด',    Icon: FileText,      href: '/hradmin/leave?tab=requests' },
    { key: 'balances',  label: 'วันลาพนักงาน',   Icon: Users,         href: '/hradmin/leave?tab=balances' },
    { key: 'calendar',  label: 'ปฏิทิน',         Icon: CalendarRange, href: '/hradmin/leave?tab=calendar',  comingSoon: true },
]

interface Props {
    year: number
    filters: RequestsFilterState
    pagination: RequestsPagination
    items: LeaveRequestItem[]
    leaveTypes: LeaveTypeLite[]
    departments: string[]
}

/**
 * Tab 2 — "ใบลาทั้งหมด". URL-driven filters + pagination (the server
 * re-fetches on every nav) with three local overlays that don't need
 * their own routes:
 *   • Detail drawer   — read-only deep dive
 *   • Force-action   — confirm + POST to /api/hradmin/leave/force-action
 *   • Create-on-behalf — form + POST to /api/hradmin/leave/create-on-behalf
 *
 * After any mutation the view calls `router.refresh()` so the server
 * component re-runs and the table shows the new state.
 */
export function RequestsView({
    year, filters, pagination, items, leaveTypes, departments,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [drawerItem, setDrawerItem] = useState<LeaveRequestItem | null>(null)
    const [forceTarget, setForceTarget] = useState<{ item: LeaveRequestItem; action: 'approve' | 'reject' | 'cancel' } | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const refreshList = () => {
        startTransition(() => {
            router.refresh()
        })
    }

    const showToast = (msg: string) => {
        setToast(msg)
        window.setTimeout(() => setToast(null), 3500)
    }

    const goToPage = (nextPage: number) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        sp.set('tab', 'requests')
        if (nextPage <= 1) sp.delete('page')
        else sp.set('page', String(nextPage))
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`)
        })
    }

    const exportCsv = () => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        sp.delete('tab'); sp.delete('page')
        // Server endpoint reads the same filter params from its querystring
        const url = `/api/hradmin/leave/export?${sp.toString()}`
        window.open(url, '_blank')
    }

    const startFrom = (pagination.page - 1) * pagination.pageSize + 1
    const endOn = Math.min(pagination.page * pagination.pageSize, pagination.total)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-[#882136]/50 border border-[#ad5f6c]/25 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-[#f9c5cd]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">จัดการการลา</h1>
                        <p className="text-sm text-white/60 mt-0.5">ใบลาทั้งหมดในระบบ · กรอง · บังคับอนุมัติ · ส่งออก</p>
                    </div>
                </div>
                <YearSelector currentYear={year} />
            </div>

            {/* Tabs */}
            <div
                role="tablist"
                className="flex gap-1 p-1 rounded-xl border border-white/10 overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
            >
                {TABS.map(({ key, label, Icon, href, comingSoon }) => {
                    const active = key === 'requests'
                    if (comingSoon) {
                        return (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={false}
                                aria-disabled="true"
                                title="ในเร็วๆ นี้"
                                disabled
                                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white/40 cursor-not-allowed"
                            >
                                <Icon size={15} className="shrink-0" />
                                <span className="truncate">{label}</span>
                            </button>
                        )
                    }
                    return (
                        <Link
                            key={key}
                            href={href}
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

            {/* Filters */}
            <RequestFilters
                filters={filters}
                leaveTypes={leaveTypes}
                departments={departments}
            />

            {/* Action bar */}
            <div
                className="flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 rounded-xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.03)' }}
            >
                <p className="text-xs sm:text-sm text-white/65">
                    {pagination.total === 0
                        ? 'ไม่พบใบลา'
                        : <>แสดง <strong className="text-white tabular-nums">{startFrom}–{endOn}</strong> จาก <strong className="text-white tabular-nums">{pagination.total}</strong> ใบ</>}
                </p>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-400 text-[#2a0a0e] shadow hover:bg-amber-300 transition-colors"
                    >
                        <Plus size={13} />
                        <span className="hidden sm:inline">สร้างใบลา</span>
                    </button>
                    <button
                        onClick={exportCsv}
                        disabled={pagination.total === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
                    >
                        <Download size={13} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button
                        onClick={refreshList}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-60"
                        aria-label="รีเฟรช"
                    >
                        <RefreshCw size={13} className={cn(isPending && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <RequestsTable
                items={items}
                onRowClick={setDrawerItem}
                onForceAction={(item, action) => setForceTarget({ item, action })}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={goToPage}
                />
            )}

            {/* Footer note */}
            <div
                className="flex items-center gap-2 text-xs text-white/55 px-4 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <Info size={13} className="shrink-0" />
                <span>
                    การ "บังคับอนุมัติ/ปฏิเสธ" จะ <strong className="text-white/75">ข้าม approval chain</strong> และ
                    บันทึกเป็นประวัติของ HR ในช่อง "บันทึกการอนุมัติ"
                </span>
            </div>

            {/* Overlays */}
            <RequestDetailDrawer
                item={drawerItem}
                onClose={() => setDrawerItem(null)}
                onForceAction={action => {
                    if (drawerItem) setForceTarget({ item: drawerItem, action })
                }}
            />
            <ForceActionDialog
                item={forceTarget?.item ?? null}
                action={forceTarget?.action ?? null}
                onClose={() => setForceTarget(null)}
                onConfirmed={() => {
                    const verb = forceTarget?.action === 'approve' ? 'อนุมัติ'
                        : forceTarget?.action === 'reject' ? 'ปฏิเสธ' : 'ยกเลิก'
                    setForceTarget(null)
                    setDrawerItem(null)
                    showToast(`${verb}ใบลาสำเร็จ`)
                    refreshList()
                }}
            />
            <CreateOnBehalfModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => {
                    setCreateOpen(false)
                    showToast('สร้างใบลาสำเร็จ')
                    refreshList()
                }}
                leaveTypes={leaveTypes}
            />

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-emerald-500/95 text-white text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom">
                    {toast}
                </div>
            )}
        </div>
    )
}

function Pagination({
    page, totalPages, onChange,
}: {
    page: number
    totalPages: number
    onChange: (next: number) => void
}) {
    // Compact pagination — show first, current-1, current, current+1, last
    const pages = new Set<number>([1, totalPages])
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) pages.add(i)
    const sorted = Array.from(pages).sort((a, b) => a - b)

    return (
        <nav className="flex items-center justify-center gap-1 text-sm" aria-label="Pagination">
            <button
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">ก่อนหน้า</span>
            </button>
            {sorted.map((p, idx) => {
                const prev = sorted[idx - 1]
                const hasGap = prev !== undefined && p - prev > 1
                return (
                    <span key={p} className="flex items-center">
                        {hasGap && <span className="px-1.5 text-white/40">…</span>}
                        <button
                            onClick={() => onChange(p)}
                            className={cn(
                                'min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold tabular-nums transition-colors',
                                p === page
                                    ? 'bg-amber-400 text-[#561e23] shadow'
                                    : 'text-white/70 hover:text-white hover:bg-white/10',
                            )}
                        >
                            {p}
                        </button>
                    </span>
                )
            })}
            <button
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <span className="hidden sm:inline">ถัดไป</span>
                <ChevronRight size={14} />
            </button>
        </nav>
    )
}
