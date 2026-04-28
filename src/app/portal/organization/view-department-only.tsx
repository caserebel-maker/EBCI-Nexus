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
    const [advisorOpen, setAdvisorOpen] = useState(true) // default open — small group, valuable context
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const { deptPeers, rootGroups, topExecutives, deptAdvisors } = useMemo(() => {
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
        const peerIds = new Set(peers.map(p => p.id))
        const tree = buildTree(peers)

        // Group roots by their outside-department manager so we can show a
        // single "manager → dept root(s)" connection even when the dept has
        // multiple roots that share the same boss (e.g. ตู่ + โต้ย → จิม).
        const groupsMap = new Map<
            string | null,
            { outsideManager: OrgEmployee | null; roots: typeof tree }
        >()
        for (const root of tree) {
            const hasOutside = root.managerId && !peerIds.has(root.managerId)
            const key = hasOutside ? (root.managerId as string) : null
            const outsideManager =
                hasOutside ? employees.find(e => e.id === root.managerId) ?? null : null
            const existing = groupsMap.get(key)
            if (existing) existing.roots.push(root)
            else groupsMap.set(key, { outsideManager, roots: [root] })
        }
        const rootGroups = Array.from(groupsMap.values())

        const execs = employees.filter(
            e => !e.isAdvisor && (e.approvalLevel ?? 0) >= 4,
        )

        // Advisors attached to the viewer's department(s). They sit OUTSIDE
        // the reports_to tree (parallel role) but conceptually rank above
        // the dept's operational leadership — promote them to a top-of-page
        // section so they aren't hidden by the isAdvisor filter on the tree.
        const advisors = employees.filter(e => e.isAdvisor && inMyDept(e))

        return {
            deptPeers: peers,
            rootGroups,
            topExecutives: execs,
            deptAdvisors: advisors,
        }
    }, [employees, viewerDepartment, viewerSecondaryDepartment])

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
                    <p>แสดงเฉพาะพนักงานในแผนกของคุณ · ที่ปรึกษาและผู้บริหารระดับสูงแสดงแยกด้านบน</p>
                </div>
            </div>

            {/* Top executives — at top because they sit *above* the org
                visually and conceptually. Collapsible so they don't push
                the dept tree off-screen on small viewports. */}
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

            {/* Department advisors — parallel to the operational tree but
                conceptually rank above dept leadership (e.g. ที่ปรึกษา
                ของแผนกบัญชี has senior-advisor authority over dept heads).
                The reports_to chain doesn't capture that, so a dedicated
                section makes the standing visible. Default-open: small
                group, high-signal context. */}
            {deptAdvisors.length > 0 && (
                <section>
                    <button
                        onClick={() => setAdvisorOpen(o => !o)}
                        aria-expanded={advisorOpen}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-300/25 bg-rose-400/10 hover:bg-rose-400/15 transition-colors"
                    >
                        <span className="flex items-center gap-2 text-white text-sm font-semibold">
                            <Crown size={16} className="text-rose-200" />
                            ที่ปรึกษาแผนก
                            <span className="text-white/60 text-xs font-normal">
                                · {deptAdvisors.length} คน
                            </span>
                        </span>
                        {advisorOpen ? (
                            <ChevronUp size={16} className="text-white/70" />
                        ) : (
                            <ChevronDown size={16} className="text-white/70" />
                        )}
                    </button>
                    {advisorOpen && (
                        <div className="mt-3 flex flex-wrap justify-center gap-3">
                            {deptAdvisors.map(a => (
                                <PersonCard
                                    key={a.id}
                                    node={a}
                                    isMe={a.id === currentEmployeeId}
                                    tone="rose"
                                    hasChildren={false}
                                    isCollapsed={false}
                                    onToggle={() => {}}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Dept trees — each root group optionally crowned by its outside
                manager so the reporting line is visible even in tiny depts */}
            <section>
                <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">
                    พนักงานในแผนก · {deptPeers.length} คน
                </h3>
                {deptPeers.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ยังไม่มีข้อมูลพนักงานในแผนกของคุณ</p>
                ) : rootGroups.length === 0 ? (
                    <p className="text-white/50 text-sm py-4">ไม่สามารถสร้างผังของแผนกได้</p>
                ) : (
                    <div className="flex flex-col gap-8">
                        {rootGroups.map((group, gi) => (
                            <RootGroup
                                key={group.outsideManager?.id ?? `ng-${gi}`}
                                outsideManager={group.outsideManager}
                                roots={group.roots}
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
        </div>
    )
}

// ─── Root group: optional outside-manager crown + dept roots ─────────────
// If the dept roots share a boss who sits OUTSIDE the dept (e.g. จิม above
// ตู่ and โต้ย in ประสานงานเอกสาร), we render that boss on top, a vertical
// line, a horizontal bracket, then the roots side by side. Single-root
// depts still get the boss → root connector so 1-person depts don't look
// like two floating cards.
function RootGroup({
    outsideManager,
    roots,
    collapsed,
    toggle,
    currentEmployeeId,
}: {
    outsideManager: OrgEmployee | null
    roots: TreeNode[]
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
}) {
    const multiRoot = roots.length > 1
    return (
        <div className="flex flex-col items-center gap-0 w-full">
            {outsideManager && (
                <>
                    <PersonCard
                        node={outsideManager}
                        isMe={false}
                        tone="rose"
                        hasChildren={false}
                        isCollapsed={false}
                        onToggle={() => {}}
                    />
                    <span className="mt-1 text-[10px] uppercase tracking-wider text-rose-200/80">
                        หัวหน้านอกแผนก
                    </span>
                    {/* Vertical connector from outside manager to the dept row */}
                    <div className="w-px h-6 bg-white/30" />
                    {multiRoot && (
                        /* Horizontal bracket when there are multiple roots */
                        <div className="w-1/2 max-w-[280px] h-px bg-white/30" />
                    )}
                </>
            )}
            {/* Roots row — wrap if multiple */}
            <div
                className={`${
                    multiRoot
                        ? 'flex flex-wrap justify-center gap-6 w-full'
                        : 'flex flex-col items-center'
                }`}
            >
                {roots.map(root => (
                    <div key={root.id} className="flex flex-col items-center">
                        {outsideManager && multiRoot && (
                            /* Small vertical stem from the bracket down to each root */
                            <div className="w-px h-4 bg-white/30" />
                        )}
                        <RootTree
                            node={root}
                            collapsed={collapsed}
                            toggle={toggle}
                            currentEmployeeId={currentEmployeeId}
                        />
                    </div>
                ))}
            </div>
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
