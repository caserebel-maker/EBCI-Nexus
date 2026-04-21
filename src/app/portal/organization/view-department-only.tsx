'use client'

import { useMemo, useState } from 'react'
import { Building2, ChevronDown, ChevronUp, Crown, User } from 'lucide-react'
import type { OrgEmployee } from './view-department'
import { buildTree, OrgNode } from './view-department'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    viewerDepartment: string | null
    viewerSecondaryDepartment: string | null
}

// Tab 1 — "มุมมองแผนก" view.
// Scoped to the viewer's department(s) and rendered as a proper reports_to_id
// hierarchy (root → children → grandchildren), not a flat grid.
// Top executives live in a collapsible block below so people can expand when
// they want to see the wider picture.
export function DepartmentOnlyView({
    employees,
    currentEmployeeId,
    viewerDepartment,
    viewerSecondaryDepartment,
}: Props) {
    const [execOpen, setExecOpen] = useState(false)
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const { deptPeers, deptTree, managerOutsideDept, topExecutives } = useMemo(() => {
        const me = employees.find(e => e.id === currentEmployeeId) ?? null

        // Set of department names the viewer belongs to (primary + optional
        // secondary). Guard against null equality matching null values on
        // other employees.
        const myDepts = new Set<string>()
        if (viewerDepartment) myDepts.add(viewerDepartment)
        if (viewerSecondaryDepartment) myDepts.add(viewerSecondaryDepartment)

        const inMyDept = (e: OrgEmployee) => {
            if (myDepts.size === 0) return false
            if (e.department && myDepts.has(e.department)) return true
            if (e.secondaryDepartment && myDepts.has(e.secondaryDepartment)) return true
            return false
        }

        const peers = employees.filter(e => !e.isAdvisor && inMyDept(e))

        // buildTree uses manager_id. For people whose manager is OUTSIDE the
        // dept set, they surface as a root — which is exactly the "highest
        // person in this dept" we want.
        const tree = buildTree(peers)

        // If the viewer's own manager sits outside the dept, show that person
        // as a separate hint card above the tree so the reporting line is
        // still obvious (e.g., ตู่ reports to จิม outside the dept).
        let mgrOutside: OrgEmployee | null = null
        if (me?.managerId) {
            const mgr = employees.find(e => e.id === me.managerId)
            if (mgr && !inMyDept(mgr) && !mgr.isAdvisor) mgrOutside = mgr
        }

        const execs = employees.filter(
            e => !e.isAdvisor && (e.approvalLevel ?? 0) >= 4,
        )

        return {
            deptPeers: peers,
            deptTree: tree,
            managerOutsideDept: mgrOutside,
            topExecutives: execs,
        }
    }, [employees, currentEmployeeId, viewerDepartment, viewerSecondaryDepartment])

    const toggle = (id: string) => {
        setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const deptLabel =
        [viewerDepartment, viewerSecondaryDepartment].filter(Boolean).join(' + ') ||
        'แผนกของคุณ'

    // Approval chain is only meaningful on the full-company tree; within a
    // single dept we don't need it. Pass an empty set so highlights stay off.
    const emptyChain = useMemo(() => new Set<string>(), [])

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Scope banner */}
            <div className="p-3 rounded-xl border border-white/12 bg-white/[0.04] text-xs text-white/70 flex items-start gap-2">
                <Building2 size={14} className="mt-0.5 flex-shrink-0 text-white/50" />
                <div>
                    <p className="text-white/90 font-semibold mb-0.5">มุมมองของคุณ — {deptLabel}</p>
                    <p>แสดงเฉพาะพนักงานในแผนกของคุณ · ดูผู้บริหารระดับสูงแยกที่ปุ่มด้านล่าง</p>
                </div>
            </div>

            {/* Manager outside dept (if applicable) */}
            {managerOutsideDept && (
                <section>
                    <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">หัวหน้าของคุณ</h3>
                    <OutsideManagerCard person={managerOutsideDept} />
                </section>
            )}

            {/* Dept tree */}
            <section>
                <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    พนักงานในแผนก · {deptPeers.length} คน
                </h3>
                {deptPeers.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ยังไม่มีข้อมูลพนักงานในแผนกของคุณ</p>
                ) : deptTree.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ไม่สามารถสร้างผังของแผนกได้</p>
                ) : (
                    <div className="overflow-x-auto pb-2 -mx-2 lg:mx-0">
                        <div
                            className="flex justify-center py-2 px-2"
                            style={{ minWidth: 'max-content' }}
                        >
                            <div className="inline-flex gap-6 items-start">
                                {deptTree.map(root => (
                                    <OrgNode
                                        key={root.id}
                                        node={root}
                                        depth={0}
                                        collapsed={collapsed}
                                        toggle={toggle}
                                        currentEmployeeId={currentEmployeeId}
                                        approvalChain={emptyChain}
                                    />
                                ))}
                            </div>
                        </div>
                        <p className="text-white/40 text-[11px] text-center italic mt-2">
                            💡 แตะปุ่ม ▲/▼ บนการ์ดเพื่อย่อ/ขยาย
                        </p>
                    </div>
                )}
            </section>

            {/* Top executives — collapsible */}
            {topExecutives.length > 0 && (
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
            )}
        </div>
    )
}

// ─── Small helper cards ────────────────────────────────────────────────────

function OutsideManagerCard({ person }: { person: OrgEmployee }) {
    const displayName = person.nickname
        ? `${person.firstName} (${person.nickname})`
        : person.firstName
    return (
        <div
            className="p-3 rounded-xl border border-rose-400/25 flex items-center gap-3 max-w-[340px]"
            style={{
                background: 'linear-gradient(135deg, rgba(244,63,94,0.10), rgba(225,29,72,0.04))',
                backdropFilter: 'blur(8px)',
            }}
        >
            {person.photoUrl ? (
                <img
                    src={person.photoUrl}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ring-rose-400/60 flex-shrink-0"
                />
            ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 ring-2 ring-offset-2 ring-offset-[#3a1a1e] ring-rose-400/60 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-white/70" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                <p className="text-white/65 text-xs truncate">{person.position ?? '—'}</p>
                <p className="text-white/45 text-[10px] truncate">{person.department ?? '—'}</p>
            </div>
        </div>
    )
}

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
