'use client'

import { useMemo, useState } from 'react'
import { Network, ChevronDown, ChevronRight, User, Info, Route } from 'lucide-react'

export interface OrgEmployee {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    nickname: string | null
    position: string | null
    department: string | null
    photoUrl: string | null
    managerId: string | null
    approvalLevel: number | null
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

    // Sort: higher approval_level first (e.g. MD=5 → top), then by employee_code
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

export function OrganizationView({ employees, currentEmployeeId }: Props) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const tree = useMemo(() => buildTree(employees), [employees])
    const approvalChain = useMemo(
        () => findApprovalChain(employees, currentEmployeeId),
        [employees, currentEmployeeId]
    )

    const withManagerCount = employees.filter(e => e.managerId).length
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
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Network className="h-6 w-6 text-white" />
                    ผังองค์กร
                </h1>
                <p className="text-white/80 text-sm">
                    โครงสร้างการบังคับบัญชา — ดูลำดับขั้นการอนุมัติของคุณ
                </p>
            </div>

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
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-red-400" /> MD
                    </span>
                    <span className="flex items-center gap-1 text-white/75">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-amber-400" /> HR
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

            {/* Tree */}
            <div className="space-y-2">
                {tree.map(node => (
                    <OrgNode
                        key={node.id}
                        node={node}
                        depth={0}
                        isLastChild={false}
                        collapsed={collapsed}
                        toggle={toggle}
                        currentEmployeeId={currentEmployeeId}
                        approvalChain={approvalChain}
                    />
                ))}
                {rootCount === 0 && (
                    <p className="text-white/60 text-center py-8">ไม่มีข้อมูลพนักงาน</p>
                )}
            </div>
        </div>
    )
}

// Ring color by approval_level (higher = more prominent)
function ringColorByLevel(level: number | null): string {
    switch (level) {
        case 5: return 'ring-red-400'          // MD
        case 4: return 'ring-amber-400'        // HR Admin
        case 3: return 'ring-purple-400'       // หัวหน้าฝ่าย
        case 2: return 'ring-blue-400'         // หัวหน้าแผนก
        default: return 'ring-white/30'        // พนักงาน
    }
}

function OrgNode({
    node, depth, isLastChild, collapsed, toggle, currentEmployeeId, approvalChain,
}: {
    node: TreeNode
    depth: number
    isLastChild: boolean
    collapsed: Set<string>
    toggle: (id: string) => void
    currentEmployeeId: string | null
    approvalChain: Set<string>
}) {
    const isMe = node.id === currentEmployeeId
    const isApprover = approvalChain.has(node.id)
    const isCollapsed = collapsed.has(node.id)
    const hasChildren = node.children.length > 0

    const borderCls = isMe
        ? 'border-amber-400/60 ring-2 ring-amber-400/50'
        : isApprover
            ? 'border-emerald-400/50 ring-1 ring-emerald-400/30'
            : 'border-white/12'
    const bgCls = isMe
        ? 'bg-amber-500/15'
        : isApprover
            ? 'bg-emerald-500/10'
            : 'bg-white/[0.06]'

    const displayName = node.nickname
        ? `${node.firstName} (${node.nickname})`
        : `${node.firstName} ${node.lastName}`.trim()

    const avatarRing = ringColorByLevel(node.approvalLevel)

    // L-shape connector geometry (card is ~64px tall; connector meets at 32px)
    const CONNECTOR_LEFT = 12  // px
    const CARD_MIDPOINT = 32   // px — where horizontal line meets card

    return (
        <div className={depth > 0 ? 'relative pl-8' : ''}>
            {/* L-shaped connector to parent */}
            {depth > 0 && (
                <>
                    {/* Vertical line: from top of this subtree down to card midpoint (last child) or all the way (siblings continue below) */}
                    <span
                        aria-hidden
                        className="absolute w-px bg-white/25"
                        style={{
                            left: `${CONNECTOR_LEFT}px`,
                            top: 0,
                            height: isLastChild ? `${CARD_MIDPOINT}px` : '100%',
                        }}
                    />
                    {/* Horizontal line: from vertical line to card */}
                    <span
                        aria-hidden
                        className="absolute h-px bg-white/25"
                        style={{
                            left: `${CONNECTOR_LEFT}px`,
                            top: `${CARD_MIDPOINT}px`,
                            width: `${32 - CONNECTOR_LEFT}px`,
                        }}
                    />
                </>
            )}

            {/* Card */}
            <div
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${borderCls} ${bgCls}`}
                style={{ backdropFilter: 'blur(8px)' }}
            >
                {/* Expand/collapse */}
                {hasChildren ? (
                    <button
                        onClick={() => toggle(node.id)}
                        aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                ) : (
                    <span className="flex-shrink-0 w-6 h-6" />
                )}

                {/* Avatar with colored ring */}
                {node.photoUrl ? (
                    <img
                        src={node.photoUrl}
                        alt=""
                        className={`flex-shrink-0 w-10 h-10 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${avatarRing}`}
                    />
                ) : (
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${avatarRing} flex items-center justify-center`}>
                        <User size={18} className="text-white/60" />
                    </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold truncate ${isMe ? 'text-amber-200' : 'text-white'}`}>
                            {displayName}
                        </p>
                        {isMe && (
                            <span className="text-[10px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-amber-400 text-black">
                                คุณ
                            </span>
                        )}
                        {isApprover && !isMe && (
                            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                                อนุมัติ
                            </span>
                        )}
                    </div>
                    <p className="text-white/70 text-xs truncate">
                        {node.position ?? '—'}
                        {node.department && (
                            <>
                                <span className="text-white/30 mx-1">·</span>
                                {node.department}
                            </>
                        )}
                    </p>
                </div>

                {hasChildren && (
                    <span className="flex-shrink-0 text-[10px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                        {node.children.length}
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && !isCollapsed && (
                <div className="mt-2 space-y-2">
                    {node.children.map((child, idx) => (
                        <OrgNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            isLastChild={idx === node.children.length - 1}
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
