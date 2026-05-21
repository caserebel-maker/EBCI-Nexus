'use client'

import { useState } from 'react'
import {
    ScrollText, ChevronDown, Clock, Sun, Info,
    Stethoscope, Palmtree, Baby, Sword, BookOpen,
    Heart, Flower2, CalendarDays, ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LeaveType } from '@/lib/leave-balance'
import {
    WORK_SCHEDULE,
    HALF_DAY_POLICY_RULES,
    GENERAL_POLICY_RULES,
    SICK_LEAVE_RULES,
} from '@/lib/leave-constants'

const glass = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
} as const

// Icon mapping for leave types (reuses pattern from my-leave-view)
const LEAVE_ICONS: Record<string, typeof Palmtree> = {
    annual: Palmtree,
    personal: CalendarDays,
    sick: Stethoscope,
    maternity: Baby,
    sterilization: Heart,
    military_service: Sword,
    military_draft: Sword,
    military_conscription: Sword,
    training: BookOpen,
    ordination: Flower2,
    marriage: Heart,
    bereavement: Flower2,
}

function getLeaveIcon(typeId: string) {
    return LEAVE_ICONS[typeId] ?? CalendarDays
}

interface Props {
    leaveTypes: LeaveType[]
}

export function LeavePolicyView({ leaveTypes }: Props) {
    const [expandedType, setExpandedType] = useState<string | null>(null)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/portal/leave"
                    className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors ring-1 ring-white/15"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300 ring-1 ring-white/25">
                        <ScrollText size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">นโยบายการลา</h1>
                        <p className="text-sm text-white/50">ข้อกำหนดและเงื่อนไขการลาของบริษัท</p>
                    </div>
                </div>
            </div>

            {/* Work schedule card */}
            <div className="p-5" style={glass}>
                <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-amber-300" />
                    <h2 className="text-base font-bold text-white">เวลาทำงาน</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TimeSlot
                        label="เวลาทำงานเช้า"
                        time={`${WORK_SCHEDULE.morningStart} - ${WORK_SCHEDULE.morningEnd} น.`}
                        color="bg-sky-500/15 border-sky-400/25 text-sky-100"
                    />
                    <TimeSlot
                        label="พักกลางวัน"
                        time={`${WORK_SCHEDULE.lunchStart} - ${WORK_SCHEDULE.lunchEnd} น.`}
                        color="bg-white/5 border-white/15 text-white/70"
                    />
                    <TimeSlot
                        label="เวลาทำงานบ่าย"
                        time={`${WORK_SCHEDULE.afternoonStart} - ${WORK_SCHEDULE.afternoonEnd} น.`}
                        color="bg-amber-500/15 border-amber-400/25 text-amber-100"
                    />
                </div>
            </div>

            {/* Half-day rules */}
            <div className="p-5" style={glass}>
                <div className="flex items-center gap-2 mb-3">
                    <Sun size={16} className="text-orange-300" />
                    <h2 className="text-base font-bold text-white">การลาครึ่งวัน</h2>
                </div>
                <div className="space-y-2.5">
                    {HALF_DAY_POLICY_RULES.map(rule => (
                        <PolicyCard key={rule.id} rule={rule} />
                    ))}
                </div>
            </div>

            {/* Leave categories from DB */}
            <div className="p-5" style={glass}>
                <div className="flex items-center gap-2 mb-3">
                    <Palmtree size={16} className="text-emerald-300" />
                    <h2 className="text-base font-bold text-white">ประเภทการลา</h2>
                </div>
                <div className="space-y-2">
                    {leaveTypes.map(type => {
                        const Icon = getLeaveIcon(type.id)
                        const isExpanded = expandedType === type.id
                        return (
                            <div key={type.id}>
                                <button
                                    type="button"
                                    onClick={() => setExpandedType(isExpanded ? null : type.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                >
                                    <span
                                        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
                                        style={{ background: type.color ?? '#882136' }}
                                    >
                                        <Icon size={16} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white">{type.name_th}</p>
                                        {type.name_en && (
                                            <p className="text-[11px] text-white/45">{type.name_en}</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 mr-1">
                                        {type.is_unlimited ? (
                                            <span className="text-xs text-emerald-200 font-semibold">ไม่จำกัด</span>
                                        ) : type.default_days_per_year ? (
                                            <span className="text-xs text-white/70 font-mono">
                                                {type.default_days_per_year} วัน/ปี
                                            </span>
                                        ) : (
                                            <span className="text-xs text-white/45">ตามเงื่อนไข</span>
                                        )}
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            'text-white/40 transition-transform shrink-0',
                                            isExpanded && 'rotate-180',
                                        )}
                                    />
                                </button>
                                {isExpanded && (
                                    <div className="ml-12 mr-3 mb-2 p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5 text-xs text-white/75 animate-in fade-in duration-150">
                                        {type.description && (
                                            <p>{type.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {(type.advance_notice_days ?? 0) > 0 && (
                                                <PolicyChip
                                                    label={`ขอล่วงหน้า ≥ ${type.advance_notice_days} วัน`}
                                                    color="text-amber-200 bg-amber-500/15 border-amber-400/25"
                                                />
                                            )}
                                            {type.id === 'sick' && (
                                                <PolicyChip
                                                    label={`≥ ${SICK_LEAVE_RULES.medicalCertificateThreshold} วัน ต้องแนบใบรับรองแพทย์`}
                                                    color="text-sky-200 bg-sky-500/15 border-sky-400/25"
                                                />
                                            )}
                                            {type.id === 'sick' && (
                                                <PolicyChip
                                                    label="ต้องยื่นย้อนหลัง"
                                                    color="text-rose-200 bg-rose-500/15 border-rose-400/25"
                                                />
                                            )}
                                            {type.requires_attachment && type.id !== 'sick' && (
                                                <PolicyChip
                                                    label="ต้องแนบเอกสาร"
                                                    color="text-sky-200 bg-sky-500/15 border-sky-400/25"
                                                />
                                            )}
                                            {type.gender_restriction && (
                                                <PolicyChip
                                                    label={`เฉพาะ${type.gender_restriction === 'male' ? 'ชาย' : 'หญิง'}`}
                                                    color="text-purple-200 bg-purple-500/15 border-purple-400/25"
                                                />
                                            )}
                                            {type.same_day_allowed === false && type.id !== 'sick' && (
                                                <PolicyChip
                                                    label="ห้ามยื่นวันเดียวกัน"
                                                    color="text-rose-200 bg-rose-500/15 border-rose-400/25"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* General rules */}
            <div className="p-5" style={glass}>
                <div className="flex items-center gap-2 mb-3">
                    <Info size={16} className="text-blue-300" />
                    <h2 className="text-base font-bold text-white">กฎทั่วไป</h2>
                </div>
                <div className="space-y-2.5">
                    {GENERAL_POLICY_RULES.map(rule => (
                        <PolicyCard key={rule.id} rule={rule} />
                    ))}
                </div>
            </div>

            {/* Back link */}
            <div className="text-center pb-6">
                <Link
                    href="/portal/leave"
                    className="inline-flex items-center gap-1.5 text-sm text-amber-300/80 hover:text-amber-300 transition-colors"
                >
                    <ChevronLeft size={14} />
                    กลับไปหน้าการลา
                </Link>
            </div>
        </div>
    )
}

function TimeSlot({
    label, time, color,
}: { label: string; time: string; color: string }) {
    return (
        <div className={cn('p-3 rounded-xl border text-center', color)}>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">{label}</p>
            <p className="text-sm font-semibold">{time}</p>
        </div>
    )
}

function PolicyCard({ rule }: { rule: { id: string; title: string; description: string; icon?: string } }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            {rule.icon && (
                <span className="text-lg mt-0.5 shrink-0">{rule.icon}</span>
            )}
            <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{rule.title}</p>
                <p className="text-xs text-white/65 mt-0.5 leading-relaxed">{rule.description}</p>
            </div>
        </div>
    )
}

function PolicyChip({ label, color }: { label: string; color: string }) {
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold', color)}>
            {label}
        </span>
    )
}
