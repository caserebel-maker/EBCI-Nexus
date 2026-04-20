'use client'

import { useMemo } from 'react'
import { User } from 'lucide-react'
import type { OrgEmployee } from './view-department'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    canSeeHeadcount: boolean
}

const LEVEL_META: Record<number, { label: string; ring: string; badgeBg: string; badgeText: string }> = {
    5: { label: 'ประธาน / เจ้าของ',       ring: 'ring-yellow-400', badgeBg: 'bg-yellow-500/20', badgeText: 'text-yellow-200' },
    4: { label: 'MD (กรรมการผู้จัดการ)',  ring: 'ring-red-400',    badgeBg: 'bg-red-500/20',    badgeText: 'text-red-200' },
    3: { label: 'หัวหน้าฝ่าย / ผู้จัดการ', ring: 'ring-purple-400', badgeBg: 'bg-purple-500/20', badgeText: 'text-purple-200' },
    2: { label: 'หัวหน้าแผนก',             ring: 'ring-blue-400',   badgeBg: 'bg-blue-500/20',   badgeText: 'text-blue-200' },
    1: { label: 'พนักงานทั่วไป',           ring: 'ring-white/30',   badgeBg: 'bg-white/10',      badgeText: 'text-white/70' },
}

export function PeopleView({ employees, currentEmployeeId, canSeeHeadcount }: Props) {
    const byLevel = useMemo(() => {
        const groups = new Map<number, OrgEmployee[]>()
        for (const e of employees) {
            const lvl = e.approvalLevel ?? 1
            if (!groups.has(lvl)) groups.set(lvl, [])
            groups.get(lvl)!.push(e)
        }
        for (const arr of groups.values()) {
            arr.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode))
        }
        return groups
    }, [employees])

    const levels = [5, 4, 3, 2, 1]

    return (
        <div className="space-y-6">
            {levels.map(lvl => {
                const people = byLevel.get(lvl) ?? []
                if (!people.length) return null
                const meta = LEVEL_META[lvl]
                return (
                    <section key={lvl}>
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.badgeBg} ${meta.badgeText} border border-white/10`}>
                                Level {lvl} · {meta.label}
                            </span>
                            {canSeeHeadcount && (
                                <span className="text-white/40 text-xs">{people.length} คน</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {people.map(p => (
                                <PersonCard
                                    key={p.id}
                                    person={p}
                                    ring={meta.ring}
                                    isMe={p.id === currentEmployeeId}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

function PersonCard({ person, ring, isMe }: { person: OrgEmployee; ring: string; isMe: boolean }) {
    const displayName = person.nickname
        ? `${person.firstName} (${person.nickname})`
        : person.firstName

    return (
        <div
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                isMe
                    ? 'border-amber-400/60 ring-2 ring-amber-400/50 bg-amber-500/15'
                    : 'border-white/15 bg-white/[0.06]'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {person.photoUrl ? (
                <img
                    src={person.photoUrl}
                    alt=""
                    className={`w-14 h-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${ring}`}
                />
            ) : (
                <div className={`w-14 h-14 rounded-full bg-white/15 ring-2 ring-offset-2 ring-offset-[#3a1a1e] ${ring} flex items-center justify-center`}>
                    <User size={22} className="text-white/60" />
                </div>
            )}
            <p className={`text-center text-sm font-semibold leading-tight line-clamp-2 ${isMe ? 'text-amber-200' : 'text-white'}`}>
                {displayName}
            </p>
            <p className="text-center text-[11px] text-white/60 leading-tight line-clamp-1">
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
