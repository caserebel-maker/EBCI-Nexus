'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    CalendarDays, BarChart3, Users, CalendarRange, FileText, Download,
    RefreshCw, ChevronLeft, ChevronRight, Info, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BalancesFilters } from '@/components/hradmin/leave/BalancesFilters'
import { BalancesTable } from '@/components/hradmin/leave/BalancesTable'
import { BalancesCards } from '@/components/hradmin/leave/BalancesCards'
import { AdjustBalanceModal } from '@/components/hradmin/leave/AdjustBalanceModal'
import { YearSelector } from '@/components/hradmin/leave/YearSelector'
import type {
    BalanceCell, EmployeeRowLite, LeaveTypeLite, BalancesFilterState,
} from '@/components/hradmin/leave/types'

type TabKey = 'overview' | 'requests' | 'balances' | 'calendar'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3; href: string; comingSoon?: boolean }> = [
    { key: 'overview',  label: 'ภาพรวม',           Icon: BarChart3,     href: '/hradmin/leave' },
    { key: 'requests',  label: 'ใบลาทั้งหมด',       Icon: FileText,      href: '/hradmin/leave?tab=requests' },
    { key: 'balances',  label: 'วันลาพนักงาน',      Icon: Users,         href: '/hradmin/leave?tab=balances' },
    { key: 'calendar',  label: 'ปฏิทิน',            Icon: CalendarRange, href: '/hradmin/leave?tab=calendar',  comingSoon: true },
]

interface Props {
    year: number
    filters: BalancesFilterState
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
    employees: EmployeeRowLite[]
    leaveTypes: LeaveTypeLite[]
    balancesByEmployee: Record<string, Record<string, BalanceCell>>
    departments: string[]
}

/**
 * Tab 3 — "วันลาพนักงาน".
 *
 * Desktop shows a pivot table (employees × leave types); mobile stacks
 * one card per employee. Every cell is clickable — the modal opens
 * focused on that (employee, type) pair. The trailing pencil on each
 * row opens the modal with every leave type editable at once.
 */
export function BalancesView({
    year, filters, pagination, employees, leaveTypes, balancesByEmployee, departments,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [modalState, setModalState] = useState<{
        employeeId: string
        focusTypeId: string | null
    } | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const refreshList = () => {
        startTransition(() => { router.refresh() })
    }
    const showToast = (msg: string) => {
        setToast(msg)
        window.setTimeout(() => setToast(null), 3500)
    }

    const goToPage = (nextPage: number) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        sp.set('tab', 'balances')
        if (nextPage <= 1) sp.delete('page')
        else sp.set('page', String(nextPage))
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`)
        })
    }

    const exportCsv = () => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        sp.delete('tab'); sp.delete('page')
        const url = `/api/hradmin/leave/balances/export?${sp.toString()}`
        window.open(url, '_blank')
    }

    const modalEmployee = useMemo(
        () => modalState ? employees.find(e => e.id === modalState.employeeId) ?? null : null,
        [modalState, employees],
    )
    const modalCells = useMemo(
        () => modalState ? (balancesByEmployee[modalState.employeeId] ?? {}) : {},
        [modalState, balancesByEmployee],
    )

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
                        <p className="text-sm text-white/60 mt-0.5">ยอดวันลาของพนักงานทั้งบริษัท · คลิกเซลล์เพื่อปรับยอด</p>
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
                    const active = key === 'balances'
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
            <BalancesFilters
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
                        ? 'ไม่พบพนักงาน'
                        : <>แสดง <strong className="text-white tabular-nums">{startFrom}–{endOn}</strong> จาก <strong className="text-white tabular-nums">{pagination.total}</strong> คน</>}
                </p>
                <div className="flex items-center gap-1.5">
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

            {/* Desktop pivot */}
            <div className="hidden md:block">
                <BalancesTable
                    employees={employees}
                    leaveTypes={leaveTypes}
                    balancesByEmployee={balancesByEmployee}
                    visibleTypeIds={filters.leave_type}
                    onEditEmployee={id => setModalState({ employeeId: id, focusTypeId: null })}
                    onEditCell={(id, typeId) => setModalState({ employeeId: id, focusTypeId: typeId })}
                />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
                <BalancesCards
                    employees={employees}
                    leaveTypes={leaveTypes}
                    balancesByEmployee={balancesByEmployee}
                    visibleTypeIds={filters.leave_type}
                    onEditEmployee={id => setModalState({ employeeId: id, focusTypeId: null })}
                    onEditCell={(id, typeId) => setModalState({ employeeId: id, focusTypeId: typeId })}
                />
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={goToPage}
                />
            )}

            {/* Legend */}
            <div
                className="flex items-center gap-3 flex-wrap text-xs text-white/55 px-4 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <Info size={13} className="shrink-0" />
                <span>คำอธิบายสี:</span>
                <LegendDot color="rgba(52,211,153,0.18)" ring="rgba(52,211,153,0.35)" tone="#6ee7b7" label="ใช้ต่ำกว่า 50%" />
                <LegendDot color="rgba(251,191,36,0.18)" ring="rgba(251,191,36,0.35)" tone="#fcd34d" label="50–80%" />
                <LegendDot color="rgba(239,68,68,0.18)" ring="rgba(239,68,68,0.35)" tone="#fca5a5" label="เกิน 80%" />
                <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span>= ปรับแต่งเอง</span>
                </span>
            </div>

            {/* Adjust modal */}
            <AdjustBalanceModal
                open={modalState !== null}
                onClose={() => setModalState(null)}
                onSaved={() => {
                    setModalState(null)
                    showToast('บันทึกยอดเรียบร้อย')
                    refreshList()
                }}
                employee={modalEmployee}
                leaveTypes={leaveTypes}
                cells={modalCells}
                year={year}
                focusTypeId={modalState?.focusTypeId ?? null}
            />

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-emerald-500/95 text-white text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom">
                    {toast}
                </div>
            )}

            {/* Unused import guard for future use */}
            <span className="hidden"><Wallet size={1} /></span>
        </div>
    )
}

function LegendDot({ color, ring, tone, label }: { color: string; ring: string; tone: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            <span
                className="w-4 h-4 rounded"
                style={{ background: color, color: tone, boxShadow: `0 0 0 1px ${ring}` }}
            />
            <span>{label}</span>
        </span>
    )
}

function Pagination({
    page, totalPages, onChange,
}: {
    page: number
    totalPages: number
    onChange: (next: number) => void
}) {
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
