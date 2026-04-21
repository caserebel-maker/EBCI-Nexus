'use client'

import { useMemo } from 'react'
import {
    Building2,
    Crown,
    Briefcase,
    GraduationCap,
    Users as UsersIcon,
} from 'lucide-react'
import type { OrgEmployee } from './view-department'

interface Props {
    employees: OrgEmployee[]
}

// Tab 1 "ภาพรวมองค์กร" — privacy-safe aggregate view.
// Flows top → bottom:   ประธาน → MD → แผนก (grid) → ที่ปรึกษา
// Shows NO individual names, photos, or levels.
export function OverviewView({ employees }: Props) {
    const { presidentCount, mdCount, departments, advisorsCount, total } = useMemo(() => {
        const isAdvisor = (e: OrgEmployee) =>
            e.isAdvisor || e.position === 'ที่ปรึกษา' || e.department === 'ที่ปรึกษา'

        const advisors = employees.filter(isAdvisor)
        const staff = employees.filter(e => !isAdvisor(e))

        const byDept = new Map<string, number>()
        for (const e of staff) {
            if ((e.approvalLevel ?? 0) >= 4) continue // exec tiles rendered separately
            const key = e.department ?? 'ไม่ระบุแผนก'
            byDept.set(key, (byDept.get(key) ?? 0) + 1)
        }
        const depts = Array.from(byDept.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => {
                if (a.count !== b.count) return b.count - a.count
                return a.name.localeCompare(b.name, 'th')
            })

        return {
            presidentCount: staff.filter(e => (e.approvalLevel ?? 0) === 5).length,
            mdCount: staff.filter(e => (e.approvalLevel ?? 0) === 4).length,
            departments: depts,
            advisorsCount: advisors.length,
            total: staff.length,
        }
    }, [employees])

    return (
        <div className="space-y-5 lg:space-y-6">
            {/* Header */}
            <div
                className="p-4 rounded-xl border border-white/15 flex items-start gap-3"
                style={{
                    background: 'linear-gradient(135deg, rgba(173,95,108,0.18), rgba(86,30,35,0.12))',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <UsersIcon size={20} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                    <h2 className="text-white font-bold">ภาพรวมองค์กร EBCI</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                        {departments.length} แผนก · {total} พนักงาน
                        {advisorsCount > 0 && ` · ${advisorsCount} ที่ปรึกษา`}
                    </p>
                </div>
            </div>

            {/* Executive vertical spine: ประธาน → MD */}
            <section className="flex flex-col items-center gap-0">
                {presidentCount > 0 && (
                    <ExecutiveCard
                        Icon={Crown}
                        title="ประธาน"
                        subtitle={presidentCount === 1 ? '1 ตำแหน่ง' : `${presidentCount} ตำแหน่ง`}
                        tone="president"
                    />
                )}
                {presidentCount > 0 && mdCount > 0 && <Connector />}
                {mdCount > 0 && (
                    <ExecutiveCard
                        Icon={Briefcase}
                        title="กรรมการผู้จัดการ (MD)"
                        subtitle={mdCount === 1 ? '1 ตำแหน่ง' : `${mdCount} ตำแหน่ง`}
                        tone="md"
                    />
                )}
                {(presidentCount > 0 || mdCount > 0) && departments.length > 0 && <Connector />}
            </section>

            {/* Departments */}
            <section>
                <h3 className="text-white/70 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 justify-center">
                    <Building2 size={14} className="text-sky-300" />
                    แผนก · {departments.length} แผนก
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {departments.map(d => (
                        <DepartmentTile key={d.name} name={d.name} count={d.count} />
                    ))}
                </div>
            </section>

            {/* Advisors footer */}
            {advisorsCount > 0 && (
                <section className="flex flex-col items-center gap-0">
                    <Connector />
                    <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-purple-300" />
                        คณะที่ปรึกษา
                    </h3>
                    <div
                        className="w-full max-w-[340px] p-4 rounded-xl border border-purple-400/35 flex items-center justify-between gap-3 transition-transform hover:-translate-y-0.5"
                        style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(139,92,246,0.05))',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex-shrink-0">
                                <GraduationCap size={20} className="text-purple-200" />
                            </span>
                            <p className="text-white font-semibold text-sm">ที่ปรึกษา</p>
                        </div>
                        <p className="text-white font-bold text-sm">{advisorsCount} ท่าน</p>
                    </div>
                </section>
            )}
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Connector() {
    return <div className="w-px h-5 bg-white/30" aria-hidden />
}

function ExecutiveCard({
    Icon,
    title,
    subtitle,
    tone,
}: {
    Icon: typeof Crown
    title: string
    subtitle: string
    tone: 'president' | 'md'
}) {
    const cls =
        tone === 'president'
            ? {
                border: 'border-yellow-400/45',
                ring: 'ring-yellow-400',
                bg: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.08))',
                iconColor: 'text-yellow-200',
            }
            : {
                border: 'border-red-400/40',
                ring: 'ring-red-400',
                bg: 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(220,38,38,0.08))',
                iconColor: 'text-red-200',
            }

    return (
        <div
            className={`w-full max-w-[360px] p-4 rounded-xl border flex items-center gap-3 transition-transform hover:-translate-y-0.5 ${cls.border}`}
            style={{ background: cls.bg, backdropFilter: 'blur(10px)' }}
        >
            <span
                className={`flex items-center justify-center w-12 h-12 rounded-full bg-white/10 ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${cls.ring} flex-shrink-0`}
            >
                <Icon size={22} className={cls.iconColor} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-tight">{title}</p>
                <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>
            </div>
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
                    background: 'linear-gradient(135deg, rgba(173,95,108,0.4), rgba(86,30,35,0.3))',
                    border: '1px solid rgba(255,255,255,0.15)',
                }}
            >
                <Building2 size={18} className="text-amber-200" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight line-clamp-2">{name}</p>
                <p className="text-white/55 text-xs mt-0.5">{count} คน</p>
            </div>
        </div>
    )
}
