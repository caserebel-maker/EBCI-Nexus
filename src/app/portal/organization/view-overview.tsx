'use client'

import { useMemo, useRef, useState } from 'react'
import {
    Building2,
    Crown,
    Briefcase,
    GraduationCap,
    Users as UsersIcon,
    ChevronRight,
    X,
} from 'lucide-react'
import type { OrgEmployee } from './view-department'

interface Props {
    employees: OrgEmployee[]
    showDepartmentMembers?: boolean
}

const UNASSIGNED = 'ไม่ระบุแผนก'
const isDepartmentStaff = (e: OrgEmployee) =>
    !e.isAdvisor && e.position !== 'ที่ปรึกษา' && e.department !== 'ที่ปรึกษา' && (e.approvalLevel ?? 0) < 4

const COMMUNICATIONS = 'ฝ่ายสื่อสารองค์กร'
const RESPONSIBILITIES: Record<string, { title: string; items: string[] }> = {
    'ฝ่ายนวัตกรรมและเทคโนโลยี': {
        title: 'Innovation & Technology',
        items: [
            'Digital Transformation และ Modernization',
            'EBCI Nexus, ConNext และ Cortex',
            'AI, Automation และระบบภายใน',
            'IT Infrastructure และ Cybersecurity',
            'พัฒนานวัตกรรมและเทคโนโลยีใหม่',
        ],
    },
    [COMMUNICATIONS]: {
        title: 'Corporate Communications',
        items: [
            'Corporate Branding และ Brand Guideline',
            'Corporate PR และภาพลักษณ์องค์กร',
            'Social Media และ Content Strategy',
            'Video Production และ Motion Graphics',
            'Internal Communications และกิจกรรมองค์กร',
            'ข่าวสารและประชาสัมพันธ์บริษัท',
        ],
    },
}

// Tab 1 "ภาพรวมองค์กร" — privacy-safe aggregate view.
// Flows top → bottom:   ประธาน → MD → แผนก (grid) → ที่ปรึกษา
// Only the authorized HR view enables named department rosters.
export function OverviewView({ employees, showDepartmentMembers = false }: Props) {
    const dialog = useRef<HTMLDialogElement>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const details = selected ? RESPONSIBILITIES[selected] : undefined
    const members = selected && showDepartmentMembers
        ? employees.filter(e => isDepartmentStaff(e) && ((e.department ?? UNASSIGNED) === selected || e.secondaryDepartment === selected))
        : []
    const { presidentCount, mdCount, departments, advisorsCount, total } = useMemo(() => {
        const isAdvisor = (e: OrgEmployee) =>
            e.isAdvisor || e.position === 'ที่ปรึกษา' || e.department === 'ที่ปรึกษา'

        const advisors = employees.filter(isAdvisor)
        const staff = employees.filter(e => !isAdvisor(e))

        const byDept = new Map<string, number>([[COMMUNICATIONS, 0]])
        let communicationsSecondary = 0
        for (const e of staff) {
            if (!isDepartmentStaff(e)) continue
            const key = e.department ?? UNASSIGNED
            byDept.set(key, (byDept.get(key) ?? 0) + 1)
            if (key !== COMMUNICATIONS && e.secondaryDepartment === COMMUNICATIONS) communicationsSecondary++
        }
        const depts = Array.from(byDept.entries())
            .map(([name, count]) => ({ name, count, secondary: name === COMMUNICATIONS ? communicationsSecondary : 0 }))
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
                        <DepartmentTile
                            key={d.name}
                            name={d.name}
                            count={d.count}
                            secondary={d.secondary}
                            onOpen={() => {
                                setSelected(d.name)
                                dialog.current?.showModal()
                            }}
                        />
                    ))}
                </div>
            </section>

            <dialog
                ref={dialog}
                aria-labelledby="department-dialog-title"
                className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-white/20 bg-[#461d23] p-5 text-white shadow-2xl backdrop:bg-black/65"
                onClose={() => setSelected(null)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 id="department-dialog-title" className="break-words text-lg font-bold">{selected}</h3>
                        {details && <p className="mt-1 text-sm text-amber-200">{details.title}</p>}
                    </div>
                    <form method="dialog">
                        <button type="submit" autoFocus aria-label="ปิด" title="ปิด" className="grid size-9 place-items-center rounded-lg hover:bg-white/10">
                            <X size={18} />
                        </button>
                    </form>
                </div>
                <h4 className="mb-2 mt-5 text-sm font-semibold">ขอบเขตความรับผิดชอบ</h4>
                {details ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/85 marker:text-amber-300">
                        {details.items.map(item => <li key={item}>{item}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-white/70">ยังไม่มีรายละเอียดความรับผิดชอบ</p>
                )}
                {showDepartmentMembers && (
                    <section className="mt-5 border-t border-white/15 pt-4">
                        <h4 className="mb-2 text-sm font-semibold">รายชื่อและตำแหน่ง ({members.length} คน)</h4>
                        {members.length === 0 ? (
                            <p className="text-sm text-white/70">ยังไม่มีพนักงานหรือผู้รับผิดชอบควบในฝ่ายนี้</p>
                        ) : (
                            <ul className="divide-y divide-white/10">
                                {members.map(member => {
                                    const secondary = (member.department ?? UNASSIGNED) !== selected
                                    return (
                                        <li key={member.id} className="space-y-1 py-2.5 text-sm">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                                <span className="break-words font-semibold">
                                                    {member.firstName} {member.lastName}{member.nickname && ` (${member.nickname})`}
                                                </span>
                                                {secondary && <span className="text-xs text-amber-200">รับผิดชอบควบ</span>}
                                            </div>
                                            <p className="break-words text-white/75">
                                                {secondary && 'ตำแหน่งต้นสังกัด: '}{member.position || 'ไม่ระบุตำแหน่ง'}
                                            </p>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>
                )}
            </dialog>

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

function DepartmentTile({ name, count, secondary, onOpen }: {
    name: string
    count: number
    secondary: number
    onOpen: () => void
}) {
    return (
        <button
            type="button"
            aria-haspopup="dialog"
            onClick={onOpen}
            className="p-4 rounded-xl border border-white/15 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-amber-300"
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
            <span className="flex-1 min-w-0">
                <span className="block text-white font-semibold text-sm leading-tight break-words">{name}</span>
                <span className="block text-white/70 text-xs mt-0.5">
                    {count} คน{secondary > 0 && ` · รับผิดชอบควบ ${secondary} คน`}
                </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-white/60" aria-hidden="true" />
        </button>
    )
}
