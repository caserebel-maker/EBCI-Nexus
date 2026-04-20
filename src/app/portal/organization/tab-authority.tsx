'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck, User, Info } from 'lucide-react'
import type { OrgEmployee } from './view-department'
import type { UserPermissions } from '@/lib/permissions'
import { limitToTier, TIER_LABELS } from '@/lib/permissions'

type ScopeFilter = 'all' | 'leave' | 'ot' | 'budget' | 'hr'

const FILTERS: Array<{ key: ScopeFilter; label: string; icon: string }> = [
    { key: 'all',    label: 'ทั้งหมด',  icon: '🌟' },
    { key: 'leave',  label: 'การลา',    icon: '🟢' },
    { key: 'ot',     label: 'OT',       icon: '🟡' },
    { key: 'budget', label: 'เบิกเงิน',  icon: '🔵' },
    { key: 'hr',     label: 'HR',       icon: '🌹' },
]

const SCOPE_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
    leave:  { label: 'การลา',   bg: 'bg-emerald-500/20', text: 'text-emerald-200', border: 'border-emerald-400/40' },
    ot:     { label: 'OT',      bg: 'bg-amber-500/20',   text: 'text-amber-200',   border: 'border-amber-400/40' },
    budget: { label: 'เบิกเงิน', bg: 'bg-sky-500/20',     text: 'text-sky-200',     border: 'border-sky-400/40' },
    hr:     { label: 'HR',      bg: 'bg-rose-500/20',    text: 'text-rose-200',    border: 'border-rose-400/40' },
}

interface Props {
    employees: OrgEmployee[]
    permissions: UserPermissions
}

export function TabAuthority({ employees, permissions }: Props) {
    const [filter, setFilter] = useState<ScopeFilter>('all')

    const { approvers, nonApprovers } = useMemo(() => {
        const a: OrgEmployee[] = []
        const n: OrgEmployee[] = []
        for (const e of employees) {
            if (e.isApprover) a.push(e)
            else n.push(e)
        }
        // Sort approvers: level desc, then department, then code
        a.sort((x, y) => {
            const lx = x.approvalLevel ?? 0
            const ly = y.approvalLevel ?? 0
            if (lx !== ly) return ly - lx
            return (x.department ?? '').localeCompare(y.department ?? '') || x.employeeCode.localeCompare(y.employeeCode)
        })
        return { approvers: a, nonApprovers: n }
    }, [employees])

    const filtered = useMemo(() => {
        if (filter === 'all') return approvers
        return approvers.filter(a => (a.approvalScopes ?? []).includes(filter))
    }, [approvers, filter])

    const canSeeExact = permissions.can_view_approval_limits

    return (
        <div className="space-y-4">
            {/* Filter chips */}
            <div
                role="tablist"
                aria-label="กรองตามประเภทการอนุมัติ"
                className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-white/15"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
            >
                {FILTERS.map(({ key, label, icon }) => {
                    const active = filter === key
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            aria-selected={active}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                active
                                    ? 'bg-amber-400 text-[#561e23] shadow-md'
                                    : 'text-white/75 hover:bg-white/10'
                            }`}
                        >
                            <span>{icon}</span>
                            <span>{label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Permission hint */}
            <div className="flex items-start gap-2 text-[11px] text-white/55 italic px-1">
                <Info size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                    {canSeeExact
                        ? 'คุณเห็นวงเงินอนุมัติเป๊ะ (สิทธิ์ can_view_approval_limits)'
                        : 'วงเงินแสดงเป็นช่วง (💧 / 💎 / 🔥 / ♾️) — สิทธิ์ดูตัวเลขเป๊ะสงวนให้ผู้บริหาร/HR'}
                </span>
            </div>

            {/* Approvers grid */}
            {filtered.length === 0 ? (
                <EmptyApproversState filter={filter} totalApprovers={approvers.length} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(a => (
                        <ApproverCard key={a.id} approver={a} canSeeExact={canSeeExact} />
                    ))}
                </div>
            )}

            {/* Non-approvers section */}
            {nonApprovers.length > 0 && (
                <NonApproverSection people={nonApprovers} />
            )}
        </div>
    )
}

function ApproverCard({ approver, canSeeExact }: { approver: OrgEmployee; canSeeExact: boolean }) {
    const scopes = approver.approvalScopes ?? []
    const displayName = approver.nickname
        ? `${approver.firstName} (${approver.nickname})`
        : approver.firstName

    const hasBudget = scopes.includes('budget')
    const tier = hasBudget ? limitToTier(approver.approvalLimitThb ?? undefined) : null
    const amountText = canSeeExact && approver.approvalLimitThb
        ? `≤ ${approver.approvalLimitThb.toLocaleString('th-TH')} บาท`
        : tier
            ? `${TIER_LABELS[tier].icon} ${TIER_LABELS[tier].th}`
            : null

    return (
        <div
            className="p-4 rounded-xl border border-white/15 space-y-3"
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
        >
            <div className="flex items-start gap-3">
                {approver.photoUrl ? (
                    <img src={approver.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center flex-shrink-0">
                        <User size={22} className="text-white/60" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    <p className="text-xs text-white/65 truncate">{approver.position ?? '—'}</p>
                    <p className="text-[10px] text-white/45 truncate">{approver.department ?? '—'}</p>
                </div>
                {canSeeExact && approver.approvalLevel && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/70 flex-shrink-0">
                        L{approver.approvalLevel}
                    </span>
                )}
            </div>

            {scopes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {scopes.map(s => {
                        const meta = SCOPE_META[s]
                        if (!meta) return null
                        return (
                            <span
                                key={s}
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                                {meta.label}
                            </span>
                        )
                    })}
                </div>
            )}

            {amountText && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                    <ShieldCheck size={12} className="text-amber-300 flex-shrink-0" />
                    <span className="text-xs text-white/80 font-semibold">{amountText}</span>
                </div>
            )}
        </div>
    )
}

function EmptyApproversState({ filter, totalApprovers }: { filter: ScopeFilter; totalApprovers: number }) {
    if (totalApprovers === 0) {
        return (
            <div
                className="p-6 rounded-xl border border-amber-400/30 text-center space-y-2"
                style={{ background: 'rgba(251,191,36,0.08)', backdropFilter: 'blur(8px)' }}
            >
                <p className="text-sm font-semibold text-amber-200">ยังไม่มีผู้มีอำนาจอนุมัติในระบบ</p>
                <p className="text-xs text-white/65">
                    HR ต้องกำหนดผู้อนุมัติของแต่ละแผนก โดยเข้าไปแก้ข้อมูลพนักงาน ตั้ง <code className="bg-black/20 px-1.5 rounded">is_approver = true</code>, <code className="bg-black/20 px-1.5 rounded">approval_scopes</code>, และ <code className="bg-black/20 px-1.5 rounded">approval_limit_thb</code>
                </p>
            </div>
        )
    }
    return (
        <div className="p-6 rounded-xl border border-white/15 text-center">
            <p className="text-sm text-white/70">
                ไม่พบผู้อนุมัติในหมวด <span className="font-bold text-white">{FILTERS.find(f => f.key === filter)?.label}</span>
            </p>
        </div>
    )
}

function NonApproverSection({ people }: { people: OrgEmployee[] }) {
    const shown = people.slice(0, 5)
    const remaining = people.length - shown.length

    return (
        <details
            className="rounded-xl border border-white/10 p-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            <summary className="cursor-pointer text-xs font-semibold text-white/70 hover:text-white/90 select-none">
                พนักงานที่ไม่ได้เป็นผู้อนุมัติ ({people.length} คน)
            </summary>
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                <p className="text-[11px] text-white/55">
                    {shown.map(p => p.nickname || p.firstName).join(' · ')}
                    {remaining > 0 && ` · และอีก ${remaining} คน`}
                </p>
                <p className="text-[10px] text-white/40 italic">
                    * หากต้องการเปลี่ยนสถานะ ติดต่อ HR เพื่อแก้ไขข้อมูลพนักงาน
                </p>
            </div>
        </details>
    )
}
