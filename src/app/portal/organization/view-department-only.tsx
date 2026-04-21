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
// Visual tree with connector lines (root at top, children below) but siblings
// use flex-wrap so they flow to a new line when the viewport is narrow.
// That eliminates horizontal scroll while keeping the tree silhouette.
// Subtrees of L2 nodes (e.g. ฝน's 5 kids) render in their own group box
// below the L2 wrap row — never intermixed with siblings.
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
        <div className="w-full max-w-full mx-auto space-y-4 lg:space-y-6 overflow-x-hidden">
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
                    <div className="flex justify-start">
                        <PersonCard
                            node={managerOutsideDept}
                            isMe={false}
                            tone="rose"
                            hasChildren={false}
                            isCollapsed={false}
                            onToggle={() => {}}
                        />
                    </div>
                </section>
            )}

            {/* Dept trees */}
            <section>
                <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
                    พนักงานในแผนก · {deptPeers.length} คน
                </h3>
                {deptPeers.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ยังไม่มีข้อมูลพนักงานในแผนกของคุณ</p>
                ) : deptTree.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ไม่สามารถสร้างผังของแผนกได้</p>
                ) : (
                    <div className="flex flex-col gap-6">
                        {deptTree.map(root => (
                            <RootTree
                                key={root.id}
                                node={root}
                                collapsed={collapsed}
                                toggle={toggle}
                                currentEmployeeId={currentEmployeeId}
                            />
                        ))}
                    </div>
                )}
                <p className="text-white/40 text-[11px] italic mt-4 text-center">
                    💡 แตะปุ่ม ▼ บนการ์ดเพื่อย่อ/ขยายกลุ่ม
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
                        <div className="mt-3 flex flex-wrap justify-center gap-3">
                            {topExecutives.map(e => (
                                <PersonCard
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

// ─── Root tree: parent card → vertical connector → subtree group ─────────

function RootTree({
    node,
    collapsed,
    toggle,
    currentEmployeeId,
}: {
    node: TreeNode
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
}) {
    const isMe = node.id === currentEmployeeId
    const isCollapsed = collapsed.has(node.id)
    const hasChildren = node.children.length > 0

    return (
        <div className="w-full flex flex-col items-center gap-3">
            <PersonCard
                node={node}
                isMe={isMe}
                tone="primary"
                hasChildren={hasChildren}
                isCollapsed={isCollapsed}
                onToggle={() => toggle(node.id)}
            />
            {hasChildren && !isCollapsed && (
                <>
                    {/* Parent → children connector */}
                    <div className="w-px h-4 bg-white/25" />
                    <SubtreeGroup
                        parent={node}
                        collapsed={collapsed}
                        toggle={toggle}
                        currentEmployeeId={currentEmployeeId}
                    />
                </>
            )}
        </div>
    )
}

// Renders a parent's direct children as a wrap row, then — for each child
// that itself has children — renders that child's subtree in a nested group
// box below the wrap row. Recursive.
function SubtreeGroup({
    parent,
    collapsed,
    toggle,
    currentEmployeeId,
}: {
    parent: TreeNode
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
}) {
    const directChildren = parent.children
    const childrenWithKids = directChildren.filter(
        c => c.children.length > 0 && !collapsed.has(c.id),
    )

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Siblings wrap row — bracket-style border-top suggests they
                 share the same parent above. */}
            <div className="w-full rounded-xl border-t-2 border-white/20 pt-3">
                <div className="flex flex-wrap justify-center gap-3 w-full">
                    {directChildren.map(c => (
                        <PersonCard
                            key={c.id}
                            node={c}
                            isMe={c.id === currentEmployeeId}
                            tone="neutral"
                            hasChildren={c.children.length > 0}
                            isCollapsed={collapsed.has(c.id)}
                            onToggle={() => toggle(c.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Nested subtree groups for each child that has its own kids */}
            {childrenWithKids.map(c => (
                <div
                    key={c.id}
                    className="w-full p-3 rounded-xl border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                    <p className="text-center text-xs text-white/60 mb-3">
                        ลูกน้องของ <span className="text-white font-semibold">{c.nickname ?? c.firstName}</span>
                        <span className="text-white/40"> · {c.children.length} คน</span>
                    </p>
                    <SubtreeGroup
                        parent={c}
                        collapsed={collapsed}
                        toggle={toggle}
                        currentEmployeeId={currentEmployeeId}
                    />
                </div>
            ))}
        </div>
    )
}

// ─── Compact person card — fixed width, responsive ───────────────────────

type CardTone = 'primary' | 'neutral' | 'gold' | 'rose'

function PersonCard({
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
        ? 'border-amber-400/60 ring-2 ring-amber-400/40 bg-amber-500/15'
        : tone === 'primary'
            ? 'border-amber-300/30 bg-amber-500/5'
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
            className={`
                relative flex flex-col items-center gap-1.5 p-2.5
                rounded-xl border transition-all
                w-[140px] sm:w-[170px] lg:w-[190px]
                ${toneCls}
            `}
            style={{ flex: '0 0 auto', backdropFilter: 'blur(8px)' }}
        >
            {/* Avatar */}
            {node.photoUrl ? (
                <img
                    src={node.photoUrl}
                    alt=""
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${avatarRing}`}
                />
            ) : (
                <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] flex items-center justify-center ${avatarRing}`}
                >
                    <User size={22} className="text-white/60" />
                </div>
            )}

            {/* Name + position */}
            <p
                className={`text-center text-xs sm:text-sm font-semibold leading-tight line-clamp-2 ${
                    isMe ? 'text-amber-200' : 'text-white'
                }`}
                title={`${node.firstName} ${node.lastName}`}
            >
                {displayName}
            </p>
            <p className="text-center text-[10px] sm:text-[11px] text-white/60 leading-tight line-clamp-1" title={node.position ?? ''}>
                {node.position ?? '—'}
            </p>

            {isMe && (
                <span className="text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-amber-400 text-black">
                    คุณ
                </span>
            )}

            {/* Toggle */}
            {hasChildren && (
                <button
                    onClick={e => {
                        e.stopPropagation()
                        onToggle()
                    }}
                    aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white/80 text-[10px] border border-white/20 shadow-md transition-colors"
                >
                    <span className="font-mono">{childCount}</span>
                    {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
            )}
        </div>
    )
}
