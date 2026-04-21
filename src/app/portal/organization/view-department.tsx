'use client'

import { useMemo, useState } from 'react'
import { Network, ChevronDown, ChevronUp, User, Info, Route } from 'lucide-react'

export interface OrgEmployee {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    nickname: string | null
    position: string | null
    department: string | null
    secondaryDepartment: string | null
    photoUrl: string | null
    managerId: string | null
    approvalLevel: number | null
    isApprover?: boolean
    approvalScopes?: string[]
    approvalLimitThb?: number | null
    isAdvisor?: boolean  // separate section, not in tree hierarchy
}

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
}

type TreeNode = OrgEmployee & { children: TreeNode[] }

function buildTree(employees: OrgEmployee[]): TreeNode[] {
    const byId = new Map<string, TreeNode>()
    for (const e of employees) byId.set(e.id, { ...e, children: [] })

    const roots: TreeNode[] = []
    for (const node of byId.values()) {
        if (node.managerId && byId.has(node.managerId)) {
            byId.get(node.managerId)!.children.push(node)
        } else {
            roots.push(node)
        }
    }

    const sortFn = (a: TreeNode, b: TreeNode) => {
        const la = a.approvalLevel ?? 0
        const lb = b.approvalLevel ?? 0
        if (la !== lb) return lb - la
        return a.employeeCode.localeCompare(b.employeeCode)
    }
    const sortRec = (nodes: TreeNode[]) => {
        nodes.sort(sortFn)
        nodes.forEach(n => sortRec(n.children))
    }
    sortRec(roots)

    return roots
}

function findApprovalChain(employees: OrgEmployee[], startId: string | null): Set<string> {
    const chain = new Set<string>()
    if (!startId) return chain
    const byId = new Map(employees.map(e => [e.id, e]))
    let cursor: OrgEmployee | undefined = byId.get(startId)
    while (cursor?.managerId) {
        chain.add(cursor.managerId)
        cursor = byId.get(cursor.managerId)
    }
    return chain
}

function ringColorByLevel(level: number | null): string {
    switch (level) {
        case 5: return 'ring-yellow-400'   // ประธาน / เจ้าของ
        case 4: return 'ring-red-400'      // MD
        case 3: return 'ring-purple-400'   // หัวหน้าฝ่าย
        case 2: return 'ring-blue-400'     // หัวหน้าแผนก
        default: return 'ring-white/30'    // พนักงาน
    }
}

export function DepartmentView({ employees, currentEmployeeId }: Props) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    // Advisors are a parallel group, not part of the reporting hierarchy.
    // Identified by isAdvisor flag OR position/department = "ที่ปรึกษา".
    const { advisors, staff } = useMemo(() => {
        const advisors: OrgEmployee[] = []
        const staff: OrgEmployee[] = []
        for (const e of employees) {
            const isAdv = e.isAdvisor
                || e.position === 'ที่ปรึกษา'
                || e.department === 'ที่ปรึกษา'
            if (isAdv) advisors.push(e)
            else staff.push(e)
        }
        return { advisors, staff }
    }, [employees])

    const tree = useMemo(() => buildTree(staff), [staff])
    const approvalChain = useMemo(
        () => findApprovalChain(staff, currentEmployeeId),
        [staff, currentEmployeeId]
    )

    const withManagerCount = staff.filter(e => e.managerId).length
    const rootCount = tree.length

    const toggle = (id: string) => {
        setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Legend */}
            <div className="p-3 space-y-2 text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-white/80">
                        <span className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-amber-300" /> คุณ
                    </span>
                    <span className="flex items-center gap-1.5 text-white/80">
                        <span className="h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-emerald-300" /> สายอนุมัติของคุณ
                    </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 border-t border-white/10">
                    <span className="text-white/50 text-[10px] uppercase tracking-wider">ระดับ:</span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-yellow-400" /> ประธาน
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-red-400" /> MD
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-purple-400" /> ฝ่าย
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-blue-400" /> แผนก
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/30" /> พนักงาน
                    </span>
                </div>
            </div>

            {/* Empty / incomplete data banner */}
            {withManagerCount === 0 && employees.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-400/30 bg-amber-500/10 text-white/90 text-sm flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-200 mb-1">ยังไม่ได้ตั้งค่าโครงสร้างองค์กร</p>
                        <p>ขอให้ HR เข้าไปกำหนด <strong>ผู้บังคับบัญชา</strong> ของแต่ละคน ในหน้า <code className="bg-black/20 px-1.5 py-0.5 rounded text-amber-200">จัดการพนักงาน → เลือกพนักงาน → แก้ไข</code></p>
                        <p className="text-white/60 mt-2">ตอนนี้แสดงทุกคนเป็นโหนดเดี่ยว ({employees.length} คน)</p>
                    </div>
                </div>
            )}

            {currentEmployeeId && approvalChain.size > 0 && (
                <div className="p-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-white/90 text-sm flex items-start gap-3">
                    <Route className="h-5 w-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-emerald-200 mb-1">สายอนุมัติของคุณ</p>
                        <p className="text-white/80">
                            เมื่อคุณขอลา คำขอจะถูกส่งตามลำดับ {approvalChain.size} ขั้น (ไฮไลต์สีเขียวในผังด้านล่าง)
                        </p>
                    </div>
                </div>
            )}

            {/* Advisors section — parallel to the reporting hierarchy */}
            {advisors.length > 0 && (
                <div className="p-3 lg:p-4 rounded-xl border border-purple-400/25"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.05))' }}>
                    <p className="text-white/80 text-xs font-semibold mb-3 flex items-center gap-2">
                        🎓 คณะที่ปรึกษาบริษัท
                        <span className="text-white/40 font-normal">· {advisors.length} คน</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 justify-items-center">
                        {advisors.map(a => (
                            <Card
                                key={a.id}
                                node={{ ...a, children: [] }}
                                isMe={a.id === currentEmployeeId}
                                isApprover={false}
                                isCollapsed={false}
                                hasChildren={false}
                                onToggle={() => {}}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Tree — center the whole thing, allow horizontal scroll only when content really exceeds viewport */}
            <div className="w-full overflow-x-auto pb-4">
                <div
                    className="flex justify-center py-2 px-2 mx-auto"
                    style={{ minWidth: 'max-content' }}
                >
                    <div className="inline-flex gap-6 items-start">
                        {tree.map(node => (
                            <OrgNode
                                key={node.id}
                                node={node}
                                depth={0}
                                collapsed={collapsed}
                                toggle={toggle}
                                currentEmployeeId={currentEmployeeId}
                                approvalChain={approvalChain}
                            />
                        ))}
                    </div>
                </div>
                {rootCount === 0 && (
                    <p className="text-white/60 text-center py-8">ไม่มีข้อมูลพนักงาน</p>
                )}
            </div>

            <p className="text-white/40 text-xs text-center italic">
                💡 แตะปุ่ม ▲/▼ บนการ์ดเพื่อย่อ/ขยาย · ถ้าผังยาวเกินจอให้เลื่อนซ้าย-ขวา
            </p>
        </div>
    )
}

function OrgNode({
    node, depth, compact, collapsed, toggle, currentEmployeeId, approvalChain,
}: {
    node: TreeNode
    depth: number
    compact?: boolean
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
    approvalChain: Set<string>
}) {
    const isMe = node.id === currentEmployeeId
    const isApprover = approvalChain.has(node.id)
    const isCollapsed = collapsed.has(node.id)
    const hasChildren = node.children.length > 0
    const childCount = node.children.length

    // COMPACT MODE — used inside narrow grid cells. Card stays visible but
    // children render as a vertical indented list (no horizontal bus/grid)
    // so a deep subtree can't blow past its column width.
    if (compact) {
        return (
            <div className="w-full min-w-0">
                <div className="flex justify-center">
                    <Card
                        node={node}
                        isMe={isMe}
                        isApprover={isApprover}
                        isCollapsed={isCollapsed}
                        hasChildren={hasChildren}
                        onToggle={() => toggle(node.id)}
                    />
                </div>
                {hasChildren && !isCollapsed && (
                    <div className="mt-2 ml-6 pl-3 border-l-2 border-white/15 space-y-2">
                        {node.children.map(child => (
                            <OrgNode
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                compact
                                collapsed={collapsed}
                                toggle={toggle}
                                currentEmployeeId={currentEmployeeId}
                                approvalChain={approvalChain}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center flex-shrink-0">
            {/* Card */}
            <Card
                node={node}
                isMe={isMe}
                isApprover={isApprover}
                isCollapsed={isCollapsed}
                hasChildren={hasChildren}
                onToggle={() => toggle(node.id)}
            />

            {/* Connector + children — horizontal bus for small branches, grid for big ones */}
            {hasChildren && !isCollapsed && (
                <>
                    {/* Vertical line: card → bus/grid */}
                    <div className="w-px h-4 bg-white/25" />

                    {childCount >= 5 ? (
                        /* GRID LAYOUT for wide branches (e.g. MD with 11 reports).
                           Descendants render in compact mode to stay within grid cells. */
                        <div className="w-full max-w-[1100px] pt-2 px-2 rounded-xl border border-white/10 bg-white/[0.03]">
                            <p className="text-center text-[11px] text-white/50 py-2 mb-1 border-b border-white/10">
                                ทีมของ {node.nickname ?? node.firstName} · {childCount} คน
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 pb-3 pt-2">
                                {node.children.map(child => (
                                    <OrgNode
                                        key={child.id}
                                        node={child}
                                        depth={depth + 1}
                                        compact
                                        collapsed={collapsed}
                                        toggle={toggle}
                                        currentEmployeeId={currentEmployeeId}
                                        approvalChain={approvalChain}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* HORIZONTAL BUS for small branches (< 5 children) — classic tree look */
                        <div className="flex items-start relative">
                            {node.children.map((child, i) => {
                                const isFirst = i === 0
                                const isLast = i === childCount - 1
                                const isOnly = childCount === 1
                                return (
                                    <div key={child.id} className="relative flex flex-col items-center px-2">
                                        {/* Horizontal bus line (top of child area) */}
                                        {!isOnly && (
                                            <div
                                                className="absolute top-0 h-px bg-white/25"
                                                style={{
                                                    left: isFirst ? '50%' : 0,
                                                    right: isLast ? '50%' : 0,
                                                }}
                                            />
                                        )}
                                        {/* Vertical line: bus → child card */}
                                        <div className="w-px h-4 bg-white/25" />
                                        {/* Recursive child */}
                                        <OrgNode
                                            node={child}
                                            depth={depth + 1}
                                            collapsed={collapsed}
                                            toggle={toggle}
                                            currentEmployeeId={currentEmployeeId}
                                            approvalChain={approvalChain}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function Card({
    node, isMe, isApprover, isCollapsed, hasChildren, onToggle,
}: {
    node: TreeNode
    isMe: boolean
    isApprover: boolean
    isCollapsed: boolean
    hasChildren: boolean
    onToggle: () => void
}) {
    const avatarRing = ringColorByLevel(node.approvalLevel)

    const borderCls = isMe
        ? 'border-amber-400/60 ring-2 ring-amber-400/50'
        : isApprover
            ? 'border-emerald-400/50 ring-1 ring-emerald-400/30'
            : 'border-white/15'
    const bgCls = isMe
        ? 'bg-amber-500/15'
        : isApprover
            ? 'bg-emerald-500/10'
            : 'bg-white/[0.07]'

    const displayName = node.nickname
        ? `${node.firstName} (${node.nickname})`
        : node.firstName

    return (
        <div
            className={`
                relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                w-[110px] sm:w-[130px]
                ${borderCls} ${bgCls}
            `}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {/* Avatar */}
            {node.photoUrl ? (
                <img
                    src={node.photoUrl}
                    alt=""
                    className={`w-12 h-12 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${avatarRing}`}
                />
            ) : (
                <div className={`w-12 h-12 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${avatarRing} flex items-center justify-center`}>
                    <User size={22} className="text-white/60" />
                </div>
            )}

            {/* Name */}
            <p
                className={`text-center text-xs font-semibold leading-tight line-clamp-2 ${isMe ? 'text-amber-200' : 'text-white'}`}
                title={`${node.firstName} ${node.lastName}`}
            >
                {displayName}
            </p>

            {/* Position */}
            <p className="text-center text-[10px] text-white/65 leading-tight line-clamp-1" title={node.position ?? ''}>
                {node.position ?? '—'}
            </p>

            {/* Dual-department badge */}
            {node.secondaryDepartment && (
                <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-100 border border-purple-400/40"
                    title={`${node.department ?? ''} + ${node.secondaryDepartment} (รักษาการ)`}
                >
                    🔗 ดูแล 2 แผนก
                </span>
            )}

            {/* Badges */}
            {(isMe || (isApprover && !isMe)) && (
                <span
                    className={`text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded ${isMe
                        ? 'bg-amber-400 text-black'
                        : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        }`}
                >
                    {isMe ? 'คุณ' : 'อนุมัติ'}
                </span>
            )}

            {/* Expand/collapse toggle */}
            {hasChildren && (
                <button
                    onClick={onToggle}
                    aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white/80 border border-white/20 shadow-md transition-colors"
                >
                    {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
            )}
            {hasChildren && isCollapsed && (
                <span className="absolute -top-2 -right-2 text-[9px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded-full ring-1 ring-white/30">
                    +{node.children.length}
                </span>
            )}
        </div>
    )
}
