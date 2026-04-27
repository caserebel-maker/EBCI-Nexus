'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
    History, ShieldCheck, Users, ChevronDown, ChevronUp,
    ChevronLeft, ChevronRight, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PERMISSION_FLAGS } from '@/lib/permissions'

export interface PermissionAudit {
    id: string
    target_name: string
    actor_name: string
    changed_at: string
    permissions_before: Record<string, boolean>
    permissions_after: Record<string, boolean>
    preset_before: string | null
    preset_after: string | null
    note: string | null
}

export interface EmployeeAudit {
    id: string
    target_name: string
    actor_name: string
    created_at: string
    action: string
    field_name: string | null
    old_value: Record<string, unknown> | null
    new_value: Record<string, unknown> | null
    reason: string | null
}

interface Props {
    tab: 'permission' | 'employee'
    page: number
    pageSize: number
    permissionEntries: PermissionAudit[]
    employeeEntries: EmployeeAudit[]
    permissionTotal: number
    employeeTotal: number
}

const TIMESTAMP_FMT: Intl.DateTimeFormatOptions = {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
}

export function AuditView({
    tab, page, pageSize,
    permissionEntries, employeeEntries,
    permissionTotal, employeeTotal,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const total = tab === 'permission' ? permissionTotal : employeeTotal
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const startFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
    const endOn = Math.min(page * pageSize, total)

    const goToPage = (next: number) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        if (next <= 1) sp.delete('page')
        else sp.set('page', String(next))
        router.replace(`${pathname}?${sp.toString()}`)
    }

    const switchTab = (next: 'permission' | 'employee') => {
        const sp = new URLSearchParams()
        if (next === 'employee') sp.set('tab', 'employee')
        sp.delete('page') // reset paging on tab switch
        const qs = sp.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname)
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                    <History size={22} className="text-rose-200" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Audit log</h1>
                    <p className="text-sm text-white/60 mt-0.5">
                        ประวัติการเปลี่ยนแปลงสิทธิ์ผู้ใช้และข้อมูลพนักงาน · เก็บถาวร · ใช้สำหรับตรวจสอบย้อนหลัง
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div
                role="tablist"
                className="flex gap-1 p-1 rounded-xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.04)' }}
            >
                <TabBtn
                    active={tab === 'permission'}
                    onClick={() => switchTab('permission')}
                    Icon={ShieldCheck}
                    label="การเปลี่ยนสิทธิ์"
                    count={permissionTotal}
                />
                <TabBtn
                    active={tab === 'employee'}
                    onClick={() => switchTab('employee')}
                    Icon={Users}
                    label="การแก้ข้อมูลพนักงาน"
                    count={employeeTotal}
                />
            </div>

            {/* Body */}
            {tab === 'permission' ? (
                permissionEntries.length === 0
                    ? <EmptyState message="ยังไม่มีการเปลี่ยนแปลงสิทธิ์" />
                    : <PermissionTable entries={permissionEntries} />
            ) : (
                employeeEntries.length === 0
                    ? <EmptyState message="ยังไม่มีการแก้ไขข้อมูลพนักงาน" />
                    : <EmployeeTable entries={employeeEntries} />
            )}

            {/* Pagination */}
            {total > 0 && (
                <div className="flex items-center justify-between gap-3 px-2">
                    <p className="text-xs text-white/55">
                        แสดง <span className="text-white tabular-nums">{startFrom}–{endOn}</span> จาก <span className="text-white tabular-nums">{total}</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => goToPage(page - 1)}
                            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="หน้าก่อน"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-2 text-xs text-white/65 tabular-nums">
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => goToPage(page + 1)}
                            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="หน้าถัดไป"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Cross-link back to settings + permission editor */}
            <div className="pt-2 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/55">
                <Link href="/hradmin/settings" className="inline-flex items-center gap-1 hover:text-white/85">
                    ← กลับไป ตั้งค่าระบบ
                </Link>
                <Link href="/hradmin/settings/permissions" className="inline-flex items-center gap-1 hover:text-white/85">
                    ไปที่ <span className="font-semibold">สิทธิ์ผู้ใช้</span> <ChevronRight size={12} />
                </Link>
            </div>
        </div>
    )
}

// ─── Tab button ───────────────────────────────────────────────────────────

function TabBtn({
    active, onClick, Icon, label, count,
}: {
    active: boolean
    onClick: () => void
    Icon: typeof History
    label: string
    count: number
}) {
    return (
        <button
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
                active
                    ? 'bg-amber-400 text-[#561e23] shadow'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
        >
            <Icon size={15} className="flex-shrink-0" />
            <span>{label}</span>
            <span
                className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                    active ? 'bg-[#561e23]/15 text-[#561e23]' : 'bg-white/10 text-white/65',
                )}
            >
                {count}
            </span>
        </button>
    )
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div
            className="p-8 rounded-2xl border border-white/10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 mb-2">
                <FileText className="text-white/40" size={20} />
            </div>
            <p className="text-sm text-white/65">{message}</p>
            <p className="text-[11px] text-white/40 mt-1 italic">เมื่อมีการเปลี่ยนแปลง ระบบจะบันทึกอัตโนมัติ</p>
        </div>
    )
}

// ─── Permission table ────────────────────────────────────────────────────

function PermissionTable({ entries }: { entries: PermissionAudit[] }) {
    return (
        <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
        >
            <ul className="divide-y divide-white/5">
                {entries.map(e => (
                    <PermissionRow key={e.id} entry={e} />
                ))}
            </ul>
        </div>
    )
}

function PermissionRow({ entry }: { entry: PermissionAudit }) {
    const [open, setOpen] = useState(false)
    const flagDiff = PERMISSION_FLAGS
        .map(({ key, label }) => {
            const before = Boolean(entry.permissions_before[key])
            const after = Boolean(entry.permissions_after[key])
            return before !== after ? { key, label, before, after } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

    return (
        <li className="px-3 py-2.5 hover:bg-white/[0.04]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full text-left flex items-start gap-3"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-white font-semibold">{entry.target_name}</span>
                        <span className="text-white/40 text-[11px]">โดย</span>
                        <span className="text-white/75">{entry.actor_name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-white/55">
                        <span className="font-mono tabular-nums">
                            {new Date(entry.changed_at).toLocaleString('th-TH', TIMESTAMP_FMT)}
                        </span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/65">
                            <span className="font-mono">{entry.preset_before ?? '—'}</span>
                            <span className="text-white/30 mx-1">→</span>
                            <span className="font-mono text-emerald-200">{entry.preset_after ?? '—'}</span>
                        </span>
                        {flagDiff.length > 0 && (
                            <span className="text-amber-200/85 font-semibold">
                                {flagDiff.length} flag{flagDiff.length > 1 ? 's' : ''} เปลี่ยน
                            </span>
                        )}
                    </div>
                    {entry.note && !open && (
                        <p className="mt-1 text-[11px] text-white/50 italic line-clamp-1">"{entry.note}"</p>
                    )}
                </div>
                {flagDiff.length > 0 && (
                    open ? <ChevronUp size={16} className="text-white/40 flex-shrink-0" />
                         : <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
                )}
            </button>

            {open && (
                <div className="mt-2 ml-1 pl-3 border-l-2 border-amber-400/30 space-y-1.5">
                    {entry.note && (
                        <p className="text-[11px] text-white/65 italic">"{entry.note}"</p>
                    )}
                    {flagDiff.length === 0 ? (
                        <p className="text-[11px] text-white/45 italic">ไม่มี flag ใดเปลี่ยน (เปลี่ยนเฉพาะ preset)</p>
                    ) : (
                        flagDiff.map(d => (
                            <div key={d.key} className="text-[11px] flex items-center gap-2">
                                <span className="text-white/65">{d.label}</span>
                                <span className="text-white/30">·</span>
                                <span className={d.before ? 'text-emerald-300' : 'text-white/40'}>
                                    {d.before ? '✓' : '✗'}
                                </span>
                                <span className="text-white/30">→</span>
                                <span className={cn(
                                    'font-bold',
                                    d.after ? 'text-emerald-300' : 'text-rose-300',
                                )}>
                                    {d.after ? '✓' : '✗'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </li>
    )
}

// ─── Employee table ──────────────────────────────────────────────────────

function EmployeeTable({ entries }: { entries: EmployeeAudit[] }) {
    return (
        <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
        >
            <ul className="divide-y divide-white/5">
                {entries.map(e => (
                    <EmployeeRow key={e.id} entry={e} />
                ))}
            </ul>
        </div>
    )
}

function EmployeeRow({ entry }: { entry: EmployeeAudit }) {
    const [open, setOpen] = useState(false)
    const oldFields = entry.old_value ?? {}
    const newFields = entry.new_value ?? {}
    const changedKeys = Object.keys(newFields)

    return (
        <li className="px-3 py-2.5 hover:bg-white/[0.04]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full text-left flex items-start gap-3"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-white font-semibold">{entry.target_name}</span>
                        <span className="text-white/40 text-[11px]">โดย</span>
                        <span className="text-white/75">{entry.actor_name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-white/55">
                        <span className="font-mono tabular-nums">
                            {new Date(entry.created_at).toLocaleString('th-TH', TIMESTAMP_FMT)}
                        </span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/65 font-mono">{entry.action}</span>
                        {changedKeys.length > 0 && (
                            <span className="text-amber-200/85 font-semibold">
                                {changedKeys.length} field{changedKeys.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    {entry.reason && !open && (
                        <p className="mt-1 text-[11px] text-white/50 italic line-clamp-1">"{entry.reason}"</p>
                    )}
                </div>
                {changedKeys.length > 0 && (
                    open ? <ChevronUp size={16} className="text-white/40 flex-shrink-0" />
                         : <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
                )}
            </button>

            {open && (
                <div className="mt-2 ml-1 pl-3 border-l-2 border-sky-400/30 space-y-1.5">
                    {entry.reason && (
                        <p className="text-[11px] text-white/65 italic">"{entry.reason}"</p>
                    )}
                    {changedKeys.map(k => {
                        const oldStr = formatVal(oldFields[k])
                        const newStr = formatVal(newFields[k])
                        return (
                            <div key={k} className="text-[11px]">
                                <p className="text-white/65 font-mono">{k}</p>
                                <p className="ml-3 text-white/45 break-all">
                                    <span className="line-through text-white/40">{oldStr}</span>
                                    <span className="mx-2 text-white/30">→</span>
                                    <span className="text-emerald-200 font-semibold">{newStr}</span>
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </li>
    )
}

function formatVal(v: unknown): string {
    if (v === null || v === undefined) return '—'
    if (v === '') return '(ว่าง)'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
}
