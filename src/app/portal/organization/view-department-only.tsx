'use client'

import { useMemo, useState } from 'react'
import { Building2, ChevronDown, ChevronUp, Crown, User } from 'lucide-react'
import type { OrgEmployee } from './view-department'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    viewerDepartment: string | null
    viewerSecondaryDepartment: string | null
}

// Phase A — L1/L2 view: only shows the user's own department peers + their
// direct manager, plus a collapsible block for top executives (L4+).
// Spec: docs/ebci-permission-model-spec.md §"Tab 1 — โครงสร้าง"
export function DepartmentOnlyView({
    employees,
    currentEmployeeId,
    viewerDepartment,
    viewerSecondaryDepartment,
}: Props) {
    const [execOpen, setExecOpen] = useState(false)

    // Build views:
    // 1. People in my department (primary OR secondary match)
    // 2. My direct manager (even if from another dept — so user knows who to report to)
    // 3. Top executives (L4+) — collapsible, excludes advisors
    const { deptPeers, managerOutsideDept, topExecutives } = useMemo(() => {
        const me = employees.find(e => e.id === currentEmployeeId) ?? null
        // Build a set of the viewer's non-null departments so the match
        // can't bottom out as null === null (which matched every employee
        // with no secondary_department — the source of the "47 คน" bug).
        const myDepts = new Set<string>()
        if (viewerDepartment) myDepts.add(viewerDepartment)
        if (viewerSecondaryDepartment) myDepts.add(viewerSecondaryDepartment)
        const inMyDept = (e: OrgEmployee) => {
            if (myDepts.size === 0) return false
            if (e.department && myDepts.has(e.department)) return true
            if (e.secondaryDepartment && myDepts.has(e.secondaryDepartment)) return true
            return false
        }
        const deptPeers = employees.filter(e => !e.isAdvisor && inMyDept(e))

        // If my manager isn't in my department (e.g. manager is L3 of another fn),
        // still show them in a separate "หัวหน้าของฉัน" slot so the user sees who
        // they report to.
        let managerOutsideDept: OrgEmployee | null = null
        if (me?.managerId) {
            const mgr = employees.find(e => e.id === me.managerId)
            if (mgr && !inMyDept(mgr) && !mgr.isAdvisor) {
                managerOutsideDept = mgr
            }
        }

        const topExecutives = employees.filter(
            e => !e.isAdvisor && (e.approvalLevel ?? 0) >= 4,
        )

        return { deptPeers, managerOutsideDept, topExecutives }
    }, [employees, currentEmployeeId, viewerDepartment, viewerSecondaryDepartment])

    const deptLabel = [viewerDepartment, viewerSecondaryDepartment].filter(Boolean).join(' + ') || 'แผนกของคุณ'

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Scope notice */}
            <div className="p-3 rounded-xl border border-white/12 bg-white/[0.04] text-xs text-white/70 flex items-start gap-2">
                <Building2 size={14} className="mt-0.5 flex-shrink-0 text-white/50" />
                <div>
                    <p className="text-white/90 font-semibold mb-0.5">มุมมองของคุณ — {deptLabel}</p>
                    <p>แสดงเฉพาะพนักงานในแผนกของคุณ · ดูผู้บริหารระดับสูงแยกที่ปุ่มด้านล่าง</p>
                </div>
            </div>

            {/* Manager (if outside department) */}
            {managerOutsideDept && (
                <section>
                    <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">หัวหน้าของคุณ</h3>
                    <div className="flex justify-start">
                        <PlainCard
                            person={managerOutsideDept}
                            isMe={false}
                            accent="rose"
                        />
                    </div>
                </section>
            )}

            {/* Department peers */}
            <section>
                <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    พนักงานในแผนก · {deptPeers.length} คน
                </h3>
                {deptPeers.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ยังไม่มีข้อมูลพนักงานในแผนกของคุณ</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {deptPeers.map(p => (
                            <PlainCard
                                key={p.id}
                                person={p}
                                isMe={p.id === currentEmployeeId}
                                accent="white"
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Top executives — collapsible */}
            <section>
                <button
                    onClick={() => setExecOpen(o => !o)}
                    aria-expanded={execOpen}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-400/25 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                >
                    <span className="flex items-center gap-2 text-white text-sm font-semibold">
                        <Crown size={16} className="text-amber-300" />
                        ผู้บริหารระดับสูง
                        <span className="text-white/60 text-xs font-normal">
                            · {topExecutives.length} คน
                        </span>
                    </span>
                    {execOpen ? (
                        <ChevronUp size={16} className="text-white/70" />
                    ) : (
                        <ChevronDown size={16} className="text-white/70" />
                    )}
                </button>
                {execOpen && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {topExecutives.map(e => (
                            <PlainCard
                                key={e.id}
                                person={e}
                                isMe={e.id === currentEmployeeId}
                                accent="gold"
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

// Minimal card — no level badge (spec: L1/L2 must NOT see Level number).
function PlainCard({
    person,
    isMe,
    accent,
}: {
    person: OrgEmployee
    isMe: boolean
    accent: 'white' | 'gold' | 'rose'
}) {
    const ringCls = isMe
        ? 'ring-amber-300'
        : accent === 'gold'
            ? 'ring-yellow-400/70'
            : accent === 'rose'
                ? 'ring-rose-400/60'
                : 'ring-white/25'

    const borderCls = isMe
        ? 'border-amber-400/60 ring-2 ring-amber-400/50 bg-amber-500/15'
        : accent === 'gold'
            ? 'border-amber-400/25 bg-amber-500/5'
            : accent === 'rose'
                ? 'border-rose-400/25 bg-rose-500/5'
                : 'border-white/15 bg-white/[0.06]'

    const displayName = person.nickname
        ? `${person.firstName} (${person.nickname})`
        : person.firstName

    return (
        <div
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${borderCls}`}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {person.photoUrl ? (
                <img
                    src={person.photoUrl}
                    alt=""
                    className={`w-14 h-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${ringCls}`}
                />
            ) : (
                <div
                    className={`w-14 h-14 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] flex items-center justify-center ${ringCls}`}
                >
                    <User size={22} className="text-white/60" />
                </div>
            )}
            <p
                className={`text-center text-sm font-semibold leading-tight line-clamp-2 ${
                    isMe ? 'text-amber-200' : 'text-white'
                }`}
                title={`${person.firstName} ${person.lastName}`}
            >
                {displayName}
            </p>
            <p className="text-center text-[11px] text-white/65 leading-tight line-clamp-1" title={person.position ?? ''}>
                {person.position ?? '—'}
            </p>
            {person.department && (
                <p className="text-center text-[10px] text-white/40 leading-tight line-clamp-1">
                    {person.department}
                    {person.secondaryDepartment && (
                        <span className="text-purple-300"> + {person.secondaryDepartment}</span>
                    )}
                </p>
            )}
            {isMe && (
                <span className="text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-amber-400 text-black">
                    คุณ
                </span>
            )}
        </div>
    )
}
