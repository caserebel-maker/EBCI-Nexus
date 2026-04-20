'use client'

import { useMemo } from 'react'
import { Route, User, ChevronDown, Info } from 'lucide-react'
import type { OrgEmployee } from './view-department'
import type { UserPermissions } from '@/lib/permissions'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    permissions: UserPermissions
}

type ChainStep = {
    employee: OrgEmployee
    role: 'you' | 'approver' | 'final'
    roleLabel: string
}

export function TabMyChain({ employees, currentEmployeeId, permissions: _permissions }: Props) {
    const { me, chain } = useMemo(() => computeChain(employees, currentEmployeeId), [
        employees,
        currentEmployeeId,
    ])

    if (!me) {
        return (
            <div
                className="p-6 rounded-xl border border-amber-400/30 text-center space-y-2"
                style={{ background: 'rgba(251,191,36,0.08)', backdropFilter: 'blur(8px)' }}
            >
                <p className="text-sm font-semibold text-amber-200">ไม่พบข้อมูลพนักงานของคุณ</p>
                <p className="text-xs text-white/65">
                    บัญชีของคุณยังไม่ได้เชื่อมกับข้อมูลพนักงาน ติดต่อ HR เพื่อตั้ง linkage
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Profile card (you) */}
            <div
                className="p-4 rounded-xl border-2 border-amber-400/60 ring-2 ring-amber-400/20 space-y-2"
                style={{ background: 'rgba(251,191,36,0.12)', backdropFilter: 'blur(8px)' }}
            >
                <div className="flex items-center gap-3">
                    {me.photoUrl ? (
                        <img src={me.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400/60 flex-shrink-0" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-amber-400/20 ring-2 ring-amber-400/60 flex items-center justify-center flex-shrink-0">
                            <User size={26} className="text-amber-200" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded">
                                คุณ
                            </span>
                            <p className="text-base font-bold text-amber-100 truncate">
                                {me.nickname ? `${me.firstName} (${me.nickname})` : me.firstName}
                            </p>
                        </div>
                        <p className="text-xs text-white/75 truncate">{me.position ?? '—'}</p>
                        <p className="text-[10px] text-white/55 truncate">{me.department ?? '—'}</p>
                    </div>
                </div>
            </div>

            {/* Chain */}
            {chain.length === 0 ? (
                <div
                    className="p-6 rounded-xl border border-white/15 text-center space-y-2"
                    style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                >
                    <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
                        <Info className="text-white/70" size={22} />
                    </div>
                    <p className="text-sm font-semibold text-white">ยังไม่ได้กำหนดผู้บังคับบัญชา</p>
                    <p className="text-xs text-white/65 max-w-md mx-auto">
                        ขอให้ HR กำหนด <code className="bg-black/20 px-1.5 rounded">ผู้บังคับบัญชา</code> ของคุณในหน้าจัดการพนักงาน —
                        เมื่อกำหนดแล้ว คำขอลาจะถูกส่งตามลำดับอัตโนมัติ
                    </p>
                </div>
            ) : (
                <div className="space-y-0">
                    <div className="flex justify-center py-2">
                        <ChevronDown className="text-white/30" size={20} />
                    </div>
                    {chain.map((step, i) => (
                        <div key={step.employee.id}>
                            <ChainStepCard step={step} />
                            {i < chain.length - 1 && (
                                <div className="flex justify-center py-2">
                                    <ChevronDown className="text-white/30" size={20} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Note */}
            <div
                className="p-3 rounded-xl border border-emerald-400/25 flex items-start gap-2 text-xs text-white/75"
                style={{ background: 'rgba(16,185,129,0.08)' }}
            >
                <Route size={14} className="text-emerald-300 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-semibold text-emerald-200">การขอลา</p>
                    <p>
                        คำขอจะถูกส่งตามลำดับขั้น {chain.length > 0 ? `(${chain.length} ขั้น)` : ''}
                        {' '}ผู้อนุมัติสุดท้ายจะเป็นผู้ชี้ขาด หากคำขอถูกปฏิเสธในขั้นใด ๆ ระบบจะแจ้งเตือนทันที
                    </p>
                </div>
            </div>
        </div>
    )
}

function ChainStepCard({ step }: { step: ChainStep }) {
    const { employee: emp } = step
    const displayName = emp.nickname ? `${emp.firstName} (${emp.nickname})` : emp.firstName

    const roleBadge =
        step.role === 'final'
            ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
            : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40'

    return (
        <div
            className="p-3 rounded-xl border border-white/15 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
        >
            {emp.photoUrl ? (
                <img src={emp.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />
            ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-white/60" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${roleBadge}`}>
                        {step.roleLabel}
                    </span>
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                </div>
                <p className="text-xs text-white/65 truncate">{emp.position ?? '—'}</p>
                <p className="text-[10px] text-white/45 truncate">{emp.department ?? '—'}</p>
            </div>
        </div>
    )
}

function computeChain(
    employees: OrgEmployee[],
    currentEmployeeId: string | null,
): { me: OrgEmployee | null; chain: ChainStep[] } {
    if (!currentEmployeeId) return { me: null, chain: [] }

    const byId = new Map(employees.map(e => [e.id, e]))
    const me = byId.get(currentEmployeeId) ?? null
    if (!me) return { me: null, chain: [] }

    const chain: ChainStep[] = []
    let cursor: OrgEmployee | undefined = me
    const visited = new Set<string>([me.id])
    let stepIdx = 1

    while (cursor?.managerId) {
        const next = byId.get(cursor.managerId)
        if (!next || visited.has(next.id)) break
        visited.add(next.id)
        chain.push({
            employee: next,
            role: 'approver',
            roleLabel: `อนุมัติ ${stepIdx}`,
        })
        cursor = next
        stepIdx += 1
    }

    // Mark last step as "final approver"
    if (chain.length > 0) {
        const last = chain[chain.length - 1]
        last.role = 'final'
        last.roleLabel = 'อนุมัติสุดท้าย'
    }

    return { me, chain }
}
