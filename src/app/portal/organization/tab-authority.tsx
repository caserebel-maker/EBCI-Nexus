'use client'

import { useMemo, useState } from 'react'
import {
    ShieldCheck, User, Scale, ChevronDown, ChevronUp, Star,
    CalendarDays, Wallet, Users, Calendar, Clock, DollarSign, UserCog,
    Droplet, Gem, Flame, Infinity as InfinityIcon,
    type LucideIcon,
} from 'lucide-react'
import type { OrgEmployee } from './view-department'
import type { UserPermissions } from '@/lib/permissions'
import { limitToTier, TIER_LABELS, type ApprovalTier } from '@/lib/permissions'

// Tier → Lucide icon + Tailwind text color
const TIER_VISUAL: Record<ApprovalTier, { Icon: LucideIcon; color: string }> = {
    small:     { Icon: Droplet,      color: 'text-sky-300' },
    medium:    { Icon: Gem,          color: 'text-emerald-300' },
    large:     { Icon: Flame,        color: 'text-orange-300' },
    unlimited: { Icon: InfinityIcon, color: 'text-amber-300' },
}

// Scope → Lucide icon
const SCOPE_ICON: Record<string, LucideIcon> = {
    leave:  Calendar,
    ot:     Clock,
    budget: DollarSign,
    hr:     UserCog,
}

type ScopeFilter = 'all' | 'leave' | 'ot' | 'budget' | 'hr'

const FILTERS: Array<{ key: ScopeFilter; label: string; Icon: LucideIcon }> = [
    { key: 'all',    label: 'ทั้งหมด',  Icon: ShieldCheck },
    { key: 'leave',  label: 'การลา',    Icon: Calendar },
    { key: 'ot',     label: 'OT',       Icon: Clock },
    { key: 'budget', label: 'เบิกเงิน',  Icon: DollarSign },
    { key: 'hr',     label: 'HR',       Icon: UserCog },
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
    currentEmployeeId?: string | null
    canSeeFullOrg?: boolean
}

type WalkedApprover = OrgEmployee & { isOverride?: boolean }

export function TabAuthority({
    employees,
    permissions,
    currentEmployeeId = null,
    canSeeFullOrg = false,
}: Props) {
    const canSeeExact = permissions.can_view_approval_limits

    // Derive personal chains + org-wide lists from the employee snapshot.
    const { me, leaveOt, budget, hr, all } = useMemo(
        () => deriveApprovers(employees, currentEmployeeId),
        [employees, currentEmployeeId],
    )

    const [allOpen, setAllOpen] = useState(canSeeFullOrg)
    const [filter, setFilter] = useState<ScopeFilter>('all')
    const filteredAll = useMemo(() => {
        if (filter === 'all') return all
        return all.filter(a => (a.approvalScopes ?? []).includes(filter))
    }, [all, filter])

    return (
        <div className="space-y-5">
            {/* Header banner */}
            <div
                className="p-4 rounded-xl border border-sky-400/30 space-y-1"
                style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.05))' }}
            >
                <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Scale size={18} className="text-sky-300" />
                    อำนาจอนุมัติ
                </div>
                <p className="text-white/75 text-xs">รายชื่อผู้อนุมัติเรื่องต่างๆ ของคุณ</p>
            </div>

            {!me && (
                <div
                    className="p-4 rounded-xl border border-amber-400/30 text-xs text-amber-100"
                    style={{ background: 'rgba(251,191,36,0.08)' }}
                >
                    ไม่พบข้อมูลพนักงานของคุณ — หัวข้อ "ของฉัน" จะไม่แสดง ติดต่อ HR เพื่อเชื่อม account
                </div>
            )}

            {/* Section 1: การลา / OT */}
            <AuthoritySection
                Icon={CalendarDays}
                iconColor="text-emerald-300"
                title="การลา / OT"
                subtitle={
                    me
                        ? 'ผู้อนุมัติคำขอลา / OT ของคุณ (เรียงตามลำดับการอนุมัติ)'
                        : undefined
                }
            >
                {leaveOt.length === 0 ? (
                    <EmptyBox>{me ? 'ยังไม่มีผู้อนุมัติในสายงานของคุณ' : 'โปรดเข้าสู่ระบบเพื่อดูสายอนุมัติ'}</EmptyBox>
                ) : (
                    <div className="space-y-2">
                        {leaveOt.map(a => (
                            <ApproverCard
                                key={`leave-${a.id}`}
                                approver={a}
                                canSeeExact={canSeeExact}
                                showAmount={false}
                                showLevel={canSeeExact}
                            />
                        ))}
                    </div>
                )}
            </AuthoritySection>

            {/* Section 2: เบิกเงิน */}
            <AuthoritySection
                Icon={Wallet}
                iconColor="text-sky-300"
                title="เบิกเงิน"
                subtitle={
                    me
                        ? canSeeExact
                            ? 'สายอนุมัติเบิกเงิน แสดงวงเงินเต็มของแต่ละคน'
                            : 'สายอนุมัติเบิกเงิน วงเงินแสดงเป็นระดับ (💧/💎/🔥/♾️)'
                        : undefined
                }
            >
                {budget.length === 0 ? (
                    <EmptyBox>{me ? 'ยังไม่มีผู้อนุมัติเบิกเงินในสายของคุณ' : 'โปรดเข้าสู่ระบบเพื่อดู'}</EmptyBox>
                ) : (
                    <div className="space-y-2">
                        {budget.map(a => (
                            <ApproverCard
                                key={`budget-${a.id}`}
                                approver={a}
                                canSeeExact={canSeeExact}
                                showAmount={true}
                                showLevel={canSeeExact}
                            />
                        ))}
                    </div>
                )}
            </AuthoritySection>

            {/* Section 3: HR — hidden for L1/L2 (sensitive HR workflows) */}
            {canSeeFullOrg && (
                <AuthoritySection
                    Icon={Users}
                    iconColor="text-rose-300"
                    title="HR (สมัครงาน, ปรับตำแหน่ง)"
                    subtitle="ผู้อนุมัติเรื่อง HR ของทั้งบริษัท"
                >
                    {hr.length === 0 ? (
                        <EmptyBox>ยังไม่มี HR approver</EmptyBox>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {hr.map(a => (
                                <ApproverCard
                                    key={`hr-${a.id}`}
                                    approver={a}
                                    canSeeExact={canSeeExact}
                                    showAmount={false}
                                    showLevel={canSeeExact}
                                />
                            ))}
                        </div>
                    )}
                </AuthoritySection>
            )}

            {/* Collapsible: all approvers — L3+/admin only (L1/L2 don't need
                 an org-wide approver list; their personal chain sections
                 above are the authoritative view) */}
            {canSeeFullOrg && (
                <section className="rounded-xl border border-white/10 overflow-hidden">
                    <button
                        onClick={() => setAllOpen(o => !o)}
                        aria-expanded={allOpen}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                        <span className="flex items-center gap-2 text-white text-sm font-semibold">
                            <Scale size={16} className="text-amber-300" />
                            ดูผู้อนุมัติทั้งหมดในบริษัท
                            <span className="text-white/55 text-xs font-normal">· {all.length} คน</span>
                        </span>
                        {allOpen ? (
                            <ChevronUp size={16} className="text-white/70" />
                        ) : (
                            <ChevronDown size={16} className="text-white/70" />
                        )}
                    </button>
                    {allOpen && (
                        <div className="p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            {/* Filter chips */}
                            <div
                                role="tablist"
                                aria-label="กรองตามประเภทการอนุมัติ"
                                className="flex flex-wrap gap-1.5 p-1.5 rounded-lg border border-white/10"
                                style={{ background: 'rgba(255,255,255,0.04)' }}
                            >
                                {FILTERS.map(({ key, label, Icon }) => {
                                    const active = filter === key
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFilter(key)}
                                            aria-selected={active}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                active
                                                    ? 'bg-amber-400 text-[#561e23] shadow-md'
                                                    : 'text-white/75 hover:bg-white/10'
                                            }`}
                                        >
                                            <Icon size={14} />
                                            <span>{label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {filteredAll.length === 0 ? (
                                <EmptyBox>
                                    ไม่พบผู้อนุมัติในหมวด{' '}
                                    <span className="font-bold">{FILTERS.find(f => f.key === filter)?.label}</span>
                                </EmptyBox>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {filteredAll.map(a => (
                                        <ApproverCard
                                            key={`all-${a.id}`}
                                            approver={a}
                                            canSeeExact={canSeeExact}
                                            showAmount={true}
                                            showLevel={canSeeExact}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function AuthoritySection({
    Icon,
    iconColor,
    title,
    subtitle,
    children,
}: {
    Icon: LucideIcon
    iconColor?: string
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <section>
            <div className="mb-2">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Icon size={18} className={iconColor ?? 'text-white/70'} />
                    {title}
                </h3>
                {subtitle && <p className="text-white/55 text-[11px] mt-0.5 pl-6">{subtitle}</p>}
            </div>
            {children}
        </section>
    )
}

function EmptyBox({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="p-4 rounded-lg border border-white/10 text-center text-xs text-white/60"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            {children}
        </div>
    )
}

function ApproverCard({
    approver,
    canSeeExact,
    showAmount,
    showLevel,
}: {
    approver: WalkedApprover
    canSeeExact: boolean
    showAmount: boolean
    showLevel: boolean
}) {
    const scopes = approver.approvalScopes ?? []
    const displayName = approver.nickname
        ? `${approver.firstName} (${approver.nickname})`
        : approver.firstName

    const hasBudget = scopes.includes('budget')
    const tier = showAmount && hasBudget ? limitToTier(approver.approvalLimitThb ?? undefined) : null
    const tierVisual = tier ? TIER_VISUAL[tier] : null
    const tierLabel = tier ? TIER_LABELS[tier].th : null
    const exactText = showAmount && canSeeExact && approver.approvalLimitThb
        ? `≤ ${approver.approvalLimitThb.toLocaleString('th-TH')} บาท`
        : null

    const isOverride = Boolean(approver.isOverride)

    const outerBorder = isOverride
        ? 'border-2 border-amber-400/50 ring-1 ring-amber-400/25'
        : 'border border-white/15'
    const outerBg = isOverride
        ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.05))'
        : 'rgba(255,255,255,0.07)'

    return (
        <div
            className={`p-3 rounded-xl space-y-2 ${outerBorder}`}
            style={{ background: outerBg, backdropFilter: 'blur(8px)' }}
        >
            <div className="flex items-start gap-3">
                {approver.photoUrl ? (
                    <img
                        src={approver.photoUrl}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
                    />
                ) : (
                    <div className="w-11 h-11 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-white/60" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        {isOverride && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-400/20 text-amber-100 border-amber-300/50">
                                <Star size={10} className="fill-amber-200 text-amber-200" />
                                อนุมัติพิเศษ
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-white/65 truncate">{approver.position ?? '—'}</p>
                    <p className="text-[10px] text-white/45 truncate">{approver.department ?? '—'}</p>
                </div>
                {showLevel && approver.approvalLevel && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/70 flex-shrink-0">
                        L{approver.approvalLevel}
                    </span>
                )}
            </div>

            {scopes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {scopes.map(s => {
                        const meta = SCOPE_META[s]
                        const ScopeIconComp = SCOPE_ICON[s]
                        if (!meta) return null
                        return (
                            <span
                                key={s}
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                                {ScopeIconComp && <ScopeIconComp size={10} />}
                                {meta.label}
                            </span>
                        )
                    })}
                </div>
            )}

            {(exactText || tierVisual) && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                    {tierVisual ? (
                        <tierVisual.Icon size={14} className={`flex-shrink-0 ${tierVisual.color}`} />
                    ) : (
                        <ShieldCheck size={12} className="text-amber-300 flex-shrink-0" />
                    )}
                    <span className="text-xs text-white/85 font-semibold">
                        {exactText ?? tierLabel}
                    </span>
                </div>
            )}
        </div>
    )
}

// ─── Chain walkers ─────────────────────────────────────────────────────────

function deriveApprovers(employees: OrgEmployee[], currentEmployeeId: string | null) {
    const byId = new Map(employees.map(e => [e.id, e]))
    const me = currentEmployeeId ? byId.get(currentEmployeeId) ?? null : null

    // Leave/OT: prefer leave_approver_id, stop after L≥4.
    // Hard rule: the president (L5) never enters this chain unless the
    // employee was explicitly routed there via leave_approver_id.
    const leaveOt: WalkedApprover[] = []
    if (me) {
        const visited = new Set<string>([me.id])
        let cursor: OrgEmployee | undefined = me
        let guard = 0
        while (cursor && guard < 20) {
            guard++
            const override = cursor.leaveApproverId ?? null
            const nextId = override ?? cursor.managerId
            if (!nextId || visited.has(nextId)) break
            visited.add(nextId)
            const next = byId.get(nextId)
            if (!next) break

            const nextLevel = next.approvalLevel ?? 0
            const arrivedViaOverride = Boolean(override)
            const isPresident = nextLevel >= 5
            const shouldPush =
                next.isApprover &&
                (next.approvalScopes ?? []).includes('leave') &&
                (!isPresident || arrivedViaOverride)

            if (shouldPush) {
                leaveOt.push({ ...next, isOverride: arrivedViaOverride })
            }
            if (nextLevel >= 4) break
            cursor = next
        }
    }

    // Budget: walk manager_id, collect every budget approver, include self,
    // and ensure ประธาน is always the tail (safety net).
    const budget: WalkedApprover[] = []
    if (me) {
        if (me.isApprover && (me.approvalScopes ?? []).includes('budget')) {
            budget.push({ ...me })
        }
        const visited = new Set<string>([me.id])
        let cursor: OrgEmployee | undefined = me
        let guard = 0
        while (cursor && guard < 20) {
            guard++
            const nextId = cursor.managerId
            if (!nextId || visited.has(nextId)) break
            visited.add(nextId)
            const next = byId.get(nextId)
            if (!next) break
            if (next.isApprover && (next.approvalScopes ?? []).includes('budget')) {
                budget.push({ ...next })
            }
            cursor = next
        }
        const president = employees.find(
            e =>
                (e.approvalLevel ?? 0) === 5 &&
                e.isApprover &&
                (e.approvalScopes ?? []).includes('budget'),
        )
        if (president && !budget.some(b => b.id === president.id)) {
            budget.push({ ...president })
        }
    }

    // HR: fixed list (anyone with hr scope)
    const hr = employees.filter(
        e => e.isApprover && (e.approvalScopes ?? []).includes('hr'),
    )

    // All approvers — sorted by level desc
    const all = employees
        .filter(e => e.isApprover)
        .sort((a, b) => {
            const la = a.approvalLevel ?? 0
            const lb = b.approvalLevel ?? 0
            if (la !== lb) return lb - la
            return (a.department ?? '').localeCompare(b.department ?? '') ||
                a.employeeCode.localeCompare(b.employeeCode)
        })

    return { me, leaveOt, budget, hr, all }
}
