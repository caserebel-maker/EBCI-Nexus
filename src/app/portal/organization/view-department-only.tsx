'use client'

import { useMemo, useState } from 'react'
import {
    Building2, ChevronDown, ChevronUp, ChevronRight, Crown, User,
} from 'lucide-react'
import type { OrgEmployee, TreeNode } from './view-department'
import { buildTree } from './view-department'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    viewerDepartment: string | null
    viewerSecondaryDepartment: string | null
}

// Tab 1 — "มุมมองแผนก"
// Vertical-only reports_to_id tree. Each child indents with a dashed
// left rail + a small horizontal tick meeting the card. Works the same
// on mobile (no horizontal scroll, ever) and desktop.
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
        const tree = buildTree(peers)

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

    const toggle = (id: string) =>
        setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const deptLabel =
        [viewerDepartment, viewerSecondaryDepartment].filter(Boolean).join(' + ') ||
        'แผนกของคุณ'

    return (
        <div className="w-full max-w-[720px] mx-auto space-y-4 lg:space-y-6 overflow-x-hidden">
            {/* Scope banner */}
            <div className="p-3 rounded-xl border border-white/12 bg-white/[0.04] text-xs text-white/70 flex items-start gap-2">
                <Building2 size={14} className="mt-0.5 flex-shrink-0 text-white/50" />
                <div>
                    <p className="text-white/90 font-semibold mb-0.5">มุมมองของคุณ — {deptLabel}</p>
                    <p>แสดงเฉพาะพนักงานในแผนกของคุณ · ดูผู้บริหารระดับสูงแยกที่ปุ่มด้านล่าง</p>
                </div>
            </div>

            {/* Manager outside dept */}
            {managerOutsideDept && (
                <section>
                    <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">หัวหน้าของคุณ</h3>
                    <RowCard
                        node={managerOutsideDept}
                        isMe={false}
                        tone="rose"
                        hasChildren={false}
                        isCollapsed={false}
                        onToggle={() => {}}
                    />
                </section>
            )}

            {/* Dept tree — vertical */}
            <section>
                <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    พนักงานในแผนก · {deptPeers.length} คน
                </h3>
                {deptPeers.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ยังไม่มีข้อมูลพนักงานในแผนกของคุณ</p>
                ) : deptTree.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ไม่สามารถสร้างผังของแผนกได้</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {deptTree.map(root => (
                            <VerticalNode
                                key={root.id}
                                node={root}
                                depth={0}
                                collapsed={collapsed}
                                toggle={toggle}
                                currentEmployeeId={currentEmployeeId}
                            />
                        ))}
                    </div>
                )}
                <p className="text-white/40 text-[11px] italic mt-3">
                    💡 แตะปุ่ม ▲/▼ บนการ์ดเพื่อย่อ/ขยาย
                </p>
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
                        <div className="mt-3 flex flex-col gap-2">
                            {topExecutives.map(e => (
                                <RowCard
                                    key={e.id}
                                    node={e}
                                    isMe={e.id === currentEmployeeId}
                                    tone="gold"
                                    hasChildren={false}
                                    isCollapsed={false}
                                    onToggle={() => {}}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

// ─── Recursive vertical node ─────────────────────────────────────────────

function VerticalNode({
    node,
    depth,
    collapsed,
    toggle,
    currentEmployeeId,
}: {
    node: TreeNode
    depth: number
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
}) {
    const isMe = node.id === currentEmployeeId
    const isCollapsed = collapsed.has(node.id)
    const hasChildren = node.children.length > 0

    return (
        <div className="w-full">
            <RowCard
                node={node}
                isMe={isMe}
                tone={depth === 0 ? 'primary' : 'neutral'}
                hasChildren={hasChildren}
                isCollapsed={isCollapsed}
                onToggle={() => toggle(node.id)}
            />
            {hasChildren && !isCollapsed && (
                <div
                    // Vertical rail: sits ~20px from the left edge so it lines
                    // up with the card's avatar center. Horizontal ticks below
                    // spring off this rail to each child row.
                    className="mt-2 ml-5 sm:ml-6 pl-4 sm:pl-5 border-l-2 border-dashed border-white/20 flex flex-col gap-2"
                >
                    {node.children.map(child => (
                        <div
                            key={child.id}
                            className="relative before:content-[''] before:absolute before:-left-4 sm:before:-left-5 before:top-6 before:h-px before:w-3 sm:before:w-4 before:bg-white/25"
                        >
                            <VerticalNode
                                node={child}
                                depth={depth + 1}
                                collapsed={collapsed}
                                toggle={toggle}
                                currentEmployeeId={currentEmployeeId}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Row-style card (horizontal: avatar + text + toggle) ─────────────────

type CardTone = 'primary' | 'neutral' | 'gold' | 'rose'

function RowCard({
    node,
    isMe,
    tone,
    hasChildren,
    isCollapsed,
    onToggle,
}: {
    node: OrgEmployee | TreeNode
    isMe: boolean
    tone: CardTone
    hasChildren: boolean
    isCollapsed: boolean
    onToggle: () => void
}) {
    const toneCls = isMe
        ? 'border-amber-400/60 ring-2 ring-amber-400/40 bg-amber-500/12'
        : tone === 'primary'
            ? 'border-white/25 bg-white/[0.10]'
            : tone === 'gold'
                ? 'border-amber-400/25 bg-amber-500/5'
                : tone === 'rose'
                    ? 'border-rose-400/25 bg-rose-500/5'
                    : 'border-white/15 bg-white/[0.06]'

    const avatarRing = isMe
        ? 'ring-amber-300'
        : tone === 'primary'
            ? 'ring-amber-300/60'
            : tone === 'gold'
                ? 'ring-yellow-400/60'
                : tone === 'rose'
                    ? 'ring-rose-400/60'
                    : 'ring-white/25'

    const displayName = node.nickname
        ? `${node.firstName} (${node.nickname})`
        : node.firstName

    const childCount = (node as TreeNode).children?.length ?? 0

    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${toneCls}`}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {/* Avatar */}
            {node.photoUrl ? (
                <img
                    src={node.photoUrl}
                    alt=""
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] flex-shrink-0 ${avatarRing}`}
                />
            ) : (
                <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] flex items-center justify-center flex-shrink-0 ${avatarRing}`}
                >
                    <User size={18} className="text-white/60" />
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-amber-200' : 'text-white'}`}>
                        {displayName}
                    </p>
                    {isMe && (
                        <span className="text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-amber-400 text-black">
                            คุณ
                        </span>
                    )}
                </div>
                <p className="text-xs text-white/65 truncate">{node.position ?? '—'}</p>
                <p className="text-[10px] text-white/40 truncate">
                    {node.department ?? '—'}
                    {node.secondaryDepartment && (
                        <span className="text-purple-300"> + {node.secondaryDepartment}</span>
                    )}
                </p>
            </div>

            {/* Toggle / child count */}
            {hasChildren && (
                <button
                    onClick={e => {
                        e.stopPropagation()
                        onToggle()
                    }}
                    aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors"
                >
                    <span className="font-mono">{childCount}</span>
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
            )}
        </div>
    )
}
