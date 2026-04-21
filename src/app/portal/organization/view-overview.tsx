'use client'

import { useMemo } from 'react'
import { Building2, Crown, GraduationCap, Users as UsersIcon } from 'lucide-react'
import type { OrgEmployee } from './view-department'

interface Props {
    employees: OrgEmployee[]
}

// Tab 1 "ภาพรวมองค์กร" — aggregate-only view. Department names + headcounts,
// top executives called out, advisors in their own footer box. Deliberately
// hides individual names so even L1/L2 can see the full org footprint
// without privacy concerns.
export function OverviewView({ employees }: Props) {
    const { executives, departments, advisors, total } = useMemo(() => {
        const isAdvisor = (e: OrgEmployee) =>
            e.isAdvisor || e.position === 'ที่ปรึกษา' || e.department === 'ที่ปรึกษา'

        const advList = employees.filter(isAdvisor)
        const staff = employees.filter(e => !isAdvisor(e))

        const execs = staff
            .filter(e => (e.approvalLevel ?? 0) >= 4)
            .sort((a, b) => (b.approvalLevel ?? 0) - (a.approvalLevel ?? 0))

        const byDept = new Map<string, { count: number; topLevel: number }>()
        for (const e of staff) {
            if ((e.approvalLevel ?? 0) >= 4) continue // execs shown separately
            const key = e.department ?? 'ไม่ระบุแผนก'
            const prev = byDept.get(key) ?? { count: 0, topLevel: 0 }
            prev.count += 1
            prev.topLevel = Math.max(prev.topLevel, e.approvalLevel ?? 0)
            byDept.set(key, prev)
        }
        const depts = Array.from(byDept.entries())
            .map(([name, v]) => ({ name, count: v.count, topLevel: v.topLevel }))
            .sort((a, b) => {
                if (a.topLevel !== b.topLevel) return b.topLevel - a.topLevel
                if (a.count !== b.count) return b.count - a.count
                return a.name.localeCompare(b.name, 'th')
            })

        return {
            executives: execs,
            departments: depts,
            advisors: advList,
            total: staff.length,
        }
    }, [employees])

    const deptCount = departments.length
    const execDept = executives[0]?.department ?? null
    const execDeptCount = executives.length

    return (
        <div className="space-y-5 lg:space-y-6">
            {/* Header */}
            <div
                className="p-4 rounded-xl border border-white/15 flex items-start gap-3"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(173,95,108,0.18), rgba(86,30,35,0.12))',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <UsersIcon size={20} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                    <h2 className="text-white font-bold">ภาพรวมองค์กร EBCI</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                        {deptCount} แผนก · {total} พนักงาน
                        {advisors.length > 0 && ` · ที่ปรึกษา ${advisors.length} ท่าน`}
                    </p>
                </div>
            </div>

            {/* Executives strip (ประธาน + MD + ...) */}
            {executives.length > 0 && (
                <section>
                    <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Crown size={14} className="text-yellow-300" />
                        ผู้บริหารระดับสูง · {execDeptCount} ท่าน
                    </h3>
                    <div className="flex flex-col items-center gap-2">
                        {executives.map((e, i) => {
                            const ringCls =
                                e.approvalLevel === 5
                                    ? 'ring-yellow-400'
                                    : 'ring-red-400'
                            const label = e.approvalLevel === 5 ? 'ประธาน / เจ้าของ' : 'กรรมการผู้จัดการ (MD)'
                            return (
                                <div key={e.id} className="w-full max-w-[360px]">
                                    <div
                                        className={`p-3 rounded-xl flex items-center justify-between gap-3 border transition-transform hover:-translate-y-0.5 ${
                                            e.approvalLevel === 5
                                                ? 'border-yellow-400/40 bg-yellow-500/10'
                                                : 'border-red-400/40 bg-red-500/10'
                                        }`}
                                        style={{ backdropFilter: 'blur(8px)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${ringCls}`}
                                            />
                                            <div>
                                                <p className="text-white font-bold text-sm">{label}</p>
                                                {execDept && i === 0 && (
                                                    <p className="text-white/55 text-[11px]">
                                                        {execDept}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-white/60 font-semibold">
                                            1 ตำแหน่ง
                                        </span>
                                    </div>
                                    {i < executives.length - 1 && (
                                        <div className="flex justify-center">
                                            <div className="w-px h-4 bg-white/25" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Departments grid */}
            <section>
                <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 size={14} className="text-sky-300" />
                    แผนก · {deptCount} แผนก
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {departments.map(d => (
                        <DepartmentTile key={d.name} name={d.name} count={d.count} />
                    ))}
                </div>
            </section>

            {/* Advisors */}
            {advisors.length > 0 && (
                <section>
                    <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-purple-300" />
                        คณะที่ปรึกษา
                    </h3>
                    <div
                        className="p-4 rounded-xl border border-purple-400/30 flex items-center justify-between"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.05))',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            <GraduationCap size={18} className="text-purple-300" />
                            <p className="text-white font-semibold text-sm">ที่ปรึกษา</p>
                        </div>
                        <p className="text-white/80 text-sm font-bold">
                            {advisors.length} ท่าน
                        </p>
                    </div>
                </section>
            )}
        </div>
    )
}

function DepartmentTile({ name, count }: { name: string; count: number }) {
    return (
        <div
            className="p-4 rounded-xl border border-white/15 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.09]"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
        >
            <span
                className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(173,95,108,0.4), rgba(86,30,35,0.3))',
                    border: '1px solid rgba(255,255,255,0.15)',
                }}
            >
                <Building2 size={18} className="text-amber-200" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                    {name}
                </p>
                <p className="text-white/55 text-xs mt-0.5">{count} คน</p>
            </div>
        </div>
    )
}
