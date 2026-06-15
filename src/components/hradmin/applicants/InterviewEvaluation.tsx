'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    ClipboardCheck, Save, Loader2, CheckCircle2, AlertCircle, UserCircle, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERVIEW_FACTORS, EVAL_SCORE_LABELS } from '@/lib/interview-factors'

interface EvaluationRow {
    id: number
    label: string
    score: number
}

export interface SavedEvaluation {
    factors: EvaluationRow[]
    total: number
    average: number
    max_score: number
    percentage: number
    notes: string | null
    evaluated_by: string | null
    evaluator_name: string | null
    evaluated_at: string
}

interface Props {
    applicationId: string
    savedEvaluations: SavedEvaluation[]
    currentUserId: string
}

export function InterviewEvaluation({ applicationId, savedEvaluations, currentUserId }: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    // Draft states for when the user is editing/creating their evaluation
    const [draftScores, setDraftScores] = useState<Record<number, number>>({})
    const [draftNotes, setDraftNotes] = useState('')
    const [editing, setEditing] = useState<boolean>(false)

    const hasAnyEval = savedEvaluations.length > 0
    const myEval = savedEvaluations.find(e => e.evaluated_by === currentUserId)

    // Set initial active tab
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (hasAnyEval) return 'average'
        return 'new'
    })

    // Compute average scores per factor for the Average tab
    const averageScores = useMemo(() => {
        const result: Record<number, number> = {}
        if (savedEvaluations.length === 0) return result
        for (const f of INTERVIEW_FACTORS) {
            let sum = 0
            let count = 0
            for (const ev of savedEvaluations) {
                const found = ev.factors.find(fact => fact.id === f.id)
                if (found) {
                    sum += found.score
                    count++
                }
            }
            result[f.id] = count > 0 ? +(sum / count).toFixed(2) : 0
        }
        return result
    }, [savedEvaluations])

    // Find the active evaluation based on selected tab
    const activeEval = useMemo(() => {
        if (activeTab === 'average' || activeTab === 'new') return null
        return savedEvaluations.find(e => e.evaluated_by === activeTab) || null
    }, [activeTab, savedEvaluations])

    const isNew = activeTab === 'new'
    const isOwnEval = activeTab === currentUserId
    const isEditing = isNew || (isOwnEval && editing)

    // Map scores to be displayed
    const displayScores = useMemo(() => {
        if (activeTab === 'average') {
            return averageScores
        }
        if (isEditing) {
            return draftScores
        }
        if (activeEval) {
            const obj: Record<number, number> = {}
            for (const f of activeEval.factors) {
                obj[f.id] = f.score
            }
            return obj
        }
        return {}
    }, [activeTab, isEditing, draftScores, activeEval, averageScores])

    // Calculate totals for active view
    const { total, max, average, percentage, allFilled } = useMemo(() => {
        if (activeTab === 'average') {
            const hasAny = savedEvaluations.length > 0
            if (!hasAny) {
                return { total: 0, max: INTERVIEW_FACTORS.length * 5, average: 0, percentage: 0, allFilled: false }
            }
            const sum = INTERVIEW_FACTORS.reduce((s, f) => s + (averageScores[f.id] || 0), 0)
            const maxScore = INTERVIEW_FACTORS.length * 5
            const avg = +(sum / INTERVIEW_FACTORS.length).toFixed(2)
            const pct = +((sum / maxScore) * 100).toFixed(1)
            return { total: +sum.toFixed(2), max: maxScore, average: avg, percentage: pct, allFilled: true }
        }

        const vals = INTERVIEW_FACTORS.map(f => displayScores[f.id] ?? 0)
        const filled = vals.every(v => v >= 1 && v <= 5)
        const sum = vals.reduce((s, v) => s + (v || 0), 0)
        const maxScore = INTERVIEW_FACTORS.length * 5
        const avg = filled ? +(sum / INTERVIEW_FACTORS.length).toFixed(2) : 0
        const pct = filled ? +((sum / maxScore) * 100).toFixed(1) : 0
        return { total: sum, max: maxScore, average: avg, percentage: pct, allFilled: filled }
    }, [activeTab, displayScores, averageScores, savedEvaluations])

    // Handle tab selection
    const selectTab = (tabId: string) => {
        setActiveTab(tabId)
        setErr(null)
        if (tabId === 'new') {
            setDraftScores({})
            setDraftNotes('')
            setEditing(true)
        } else if (tabId === currentUserId) {
            if (myEval) {
                const obj: Record<number, number> = {}
                for (const f of myEval.factors) obj[f.id] = f.score
                setDraftScores(obj)
                setDraftNotes(myEval.notes ?? '')
            }
            setEditing(false)
        } else {
            setEditing(false)
        }
    }

    const startEditing = () => {
        if (!myEval) return
        const obj: Record<number, number> = {}
        for (const f of myEval.factors) {
            obj[f.id] = f.score
        }
        setDraftScores(obj)
        setDraftNotes(myEval.notes ?? '')
        setEditing(true)
    }

    const cancelEditing = () => {
        if (isNew) {
            if (hasAnyEval) {
                selectTab('average')
            }
        } else {
            setEditing(false)
            setErr(null)
        }
    }

    const submit = () => {
        if (!allFilled) {
            setErr('กรุณาให้คะแนนครบทั้ง 12 ข้อ')
            return
        }
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch(`/api/hradmin/applicants/${applicationId}/evaluate`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ scores: draftScores, notes: draftNotes.trim() || null }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'บันทึกไม่สำเร็จ')
                setToast('บันทึกผลการประเมินเรียบร้อย')
                window.setTimeout(() => setToast(null), 4000)
                setEditing(false)
                
                // Set the active tab to currentUserId since their evaluation is now saved
                setActiveTab(currentUserId)
                router.refresh()
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
            }
        })
    }

    return (
        <>
            {/* Screen UI - hidden during print */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-4 print:hidden">
                <header className="flex items-start justify-between gap-3 flex-wrap border-b border-white/10 pb-3">
                    <div>
                        <h2 className="text-white font-bold inline-flex items-center gap-2">
                            <ClipboardCheck size={16} />
                            การประเมินสัมภาษณ์ (12 ปัจจัย)
                        </h2>
                        {activeEval && (
                            <p className="text-[11px] text-white/55 mt-1 inline-flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                    <UserCircle size={11} /> {activeEval.evaluator_name ?? 'ไม่ระบุผู้ประเมิน'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Clock size={11} /> {formatDateTime(activeEval.evaluated_at)}
                                </span>
                            </p>
                        )}
                        {activeTab === 'average' && (
                            <p className="text-[11px] text-amber-300/80 mt-1">
                                แสดงคะแนนเฉลี่ยจากผู้ประเมินทั้งหมด {savedEvaluations.length} ท่าน
                            </p>
                        )}
                        {activeTab === 'new' && (
                            <p className="text-[11px] text-emerald-400 mt-1">
                                กำลังทำแบบประเมินสัมภาษณ์ใหม่
                            </p>
                        )}
                    </div>
                    {activeTab === currentUserId && !editing && myEval && (
                        <button
                            type="button"
                            onClick={startEditing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10"
                        >
                            แก้ไขการประเมินของคุณ
                        </button>
                    )}
                </header>

                {/* Tab Switcher */}
                <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
                    {hasAnyEval && (
                        <button
                            type="button"
                            onClick={() => selectTab('average')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                                activeTab === 'average'
                                    ? 'bg-amber-400 text-black border-amber-300 shadow-md font-bold'
                                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                            )}
                        >
                            คะแนนเฉลี่ยรวม ({savedEvaluations.length})
                        </button>
                    )}
                    {savedEvaluations.map((ev) => {
                        const isOwn = ev.evaluated_by === currentUserId
                        const isActive = activeTab === ev.evaluated_by
                        return (
                            <button
                                key={ev.evaluated_by}
                                type="button"
                                onClick={() => selectTab(ev.evaluated_by!)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                                    isActive
                                        ? 'bg-amber-400 text-black border-amber-300 shadow-md font-bold'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                )}
                            >
                                {ev.evaluator_name ?? 'ผู้ประเมิน'} {isOwn ? '(คุณ)' : ''}
                            </button>
                        )
                    })}
                    {!myEval && (
                        <button
                            type="button"
                            onClick={() => selectTab('new')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1',
                                activeTab === 'new'
                                    ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                                    : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                            )}
                        >
                            + ประเมินเพิ่ม
                        </button>
                    )}
                </div>

                {/* Factor table */}
                <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="text-white/55">
                                <th className="py-2 px-2 text-left font-semibold w-10">#</th>
                                <th className="py-2 px-2 text-left font-semibold">ปัจจัย</th>
                                {EVAL_SCORE_LABELS.slice(1).map((label, i) => (
                                    <th key={i} className="py-2 px-2 text-center font-semibold text-[11px] whitespace-nowrap">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-white/40">{i + 1}</span>
                                            <span className="text-[9px] text-white/45 hidden md:block">{label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {INTERVIEW_FACTORS.map(f => {
                                const val = displayScores[f.id] ?? 0
                                const isAvgTab = activeTab === 'average'
                                return (
                                    <tr key={f.id} className="border-t border-white/5">
                                        <td className="py-2 px-2 text-white/45 tabular-nums">{f.id}</td>
                                        <td className="py-2 px-2 text-white/90 text-[13px] min-w-[200px]">
                                            {f.label}
                                            {isAvgTab && val > 0 && (
                                                <span className="ml-1.5 font-bold text-amber-300">
                                                    ({val.toFixed(2)})
                                                </span>
                                            )}
                                        </td>
                                        {[1, 2, 3, 4, 5].map(v => {
                                            const isSelected = !isAvgTab && val === v
                                            const isClosestAvg = isAvgTab && Math.round(val) === v

                                            if (isEditing) {
                                                return (
                                                    <td key={v} className="py-1 px-1 text-center">
                                                        <button
                                                            type="button"
                                                            disabled={pending}
                                                            onClick={() => setDraftScores(s => ({ ...s, [f.id]: v }))}
                                                            className={cn(
                                                                'h-9 w-9 rounded-full font-bold tabular-nums text-sm transition-all mx-auto flex items-center justify-center border',
                                                                isSelected
                                                                    ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                                                                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                                                            )}
                                                            aria-label={`ข้อ ${f.id} ให้ ${v}`}
                                                        >
                                                            {v}
                                                        </button>
                                                    </td>
                                                )
                                            }

                                            return (
                                                <td key={v} className="py-1 px-1 text-center">
                                                    <div
                                                        className={cn(
                                                            'h-9 w-9 rounded-full font-bold tabular-nums text-sm mx-auto flex items-center justify-center border transition-all',
                                                            isSelected
                                                                ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                                                                : isClosestAvg
                                                                ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                                                                : 'bg-white/5 text-white/30 border-white/5'
                                                        )}
                                                    >
                                                        {v}
                                                    </div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatTile label={activeTab === 'average' ? "คะแนนเฉลี่ยรวม" : "คะแนนรวม"} value={`${total} / ${max}`} />
                    <StatTile label="เฉลี่ย" value={allFilled ? average.toFixed(2) : '—'} />
                    <StatTile label="เปอร์เซ็นต์" value={allFilled ? `${percentage}%` : '—'} accent={allFilled} />
                    <StatTile label="สถานะ" value={allFilled ? 'ให้คะแนนครบ' : `${Object.keys(displayScores).length}/12`} accent={allFilled} />
                </div>

                {/* Notes/Comments */}
                <div>
                    <span className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">
                        {activeTab === 'average' ? 'ความเห็นและข้อสังเกตจากผู้ประเมินทั้งหมด' : 'หมายเหตุ / ข้อสังเกต'}
                    </span>
                    {isEditing ? (
                        <textarea
                            value={draftNotes}
                            onChange={e => setDraftNotes(e.target.value)}
                            rows={3}
                            placeholder="เช่น จุดแข็ง / จุดที่ควรปรับปรุง / คำตอบที่น่าสนใจ"
                            className="w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-amber-300/50"
                        />
                    ) : activeTab === 'average' ? (
                        <div className="space-y-2.5">
                            {savedEvaluations.map((ev, i) => (
                                <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5">
                                    <p className="text-[11px] font-bold text-amber-300/95 mb-1 flex items-center gap-1">
                                        <UserCircle size={12} />
                                        <span>{ev.evaluator_name ?? 'ไม่ระบุผู้ประเมิน'}</span>
                                        <span className="text-white/40 font-normal">·</span>
                                        <span className="text-white/55 font-normal">{formatDateTime(ev.evaluated_at)}</span>
                                    </p>
                                    <p className="text-sm text-white/85 whitespace-pre-wrap">{ev.notes || '—'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full text-sm text-white/85 border border-white/10 p-3 rounded-lg bg-black/20 whitespace-pre-wrap">
                            {activeEval?.notes || '—'}
                        </div>
                    )}
                </div>

                {err && (
                    <p className="text-red-300 text-sm inline-flex items-center gap-1.5">
                        <AlertCircle size={13} /> {err}
                    </p>
                )}

                {/* Actions */}
                {isEditing && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={pending}
                            className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={pending || !allFilled}
                            className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold border border-amber-300"
                        >
                            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            บันทึกผลการประเมิน
                        </button>
                    </div>
                )}

                {toast && (
                    <div
                        role="status"
                        className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl text-sm text-white font-semibold shadow-xl border border-emerald-400/40"
                        style={{ background: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)' }}
                    >
                        <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                        {toast}
                    </div>
                )}
            </section>

            {/* Print-only section: always prints the average view */}
            {hasAnyEval && (
                <section className="hidden print:block border-t border-b border-black py-4 space-y-4 text-black bg-transparent">
                    <div className="border-b border-black pb-2 mb-2">
                        <h2 className="text-sm font-bold text-black uppercase tracking-wide">
                            สรุปผลการประเมินสัมภาษณ์ (คะแนนเฉลี่ยรวม)
                        </h2>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                            จำนวนผู้ประเมิน: {savedEvaluations.length} ท่าน | พิมพ์ ณ วันที่ {formatDateTime(new Date().toISOString())}
                        </p>
                    </div>

                    {/* Table showing average scores */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-black text-black text-left">
                                    <th className="py-1 px-1 font-bold w-6">#</th>
                                    <th className="py-1 px-1 font-bold">ปัจจัยการประเมิน</th>
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <th key={v} className="py-1 px-1 text-center font-bold w-10">{v}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {INTERVIEW_FACTORS.map(f => {
                                    const avgScore = averageScores[f.id] || 0
                                    const roundedAvg = Math.round(avgScore)
                                    return (
                                        <tr key={f.id} className="border-b border-gray-200">
                                            <td className="py-1.5 px-1 font-bold text-gray-500">{f.id}</td>
                                            <td className="py-1.5 px-1">
                                                <span className="font-semibold">{f.label}</span>
                                                <span className="ml-1 text-[10px] font-bold text-black">({avgScore.toFixed(2)})</span>
                                            </td>
                                            {[1, 2, 3, 4, 5].map(v => {
                                                const isClosest = roundedAvg === v
                                                return (
                                                    <td key={v} className="py-1 px-1 text-center">
                                                        <span className={cn(
                                                            "inline-block h-5 w-5 rounded-full leading-5 text-center font-bold text-[10px]",
                                                            isClosest ? "bg-black text-white" : "text-gray-300"
                                                        )}>
                                                            {v}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals tiles for print */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                        <div className="p-1.5 border border-black text-center">
                            <p className="text-[8px] uppercase font-bold text-gray-600">คะแนนเฉลี่ยรวม</p>
                            <p className="text-sm font-bold">{total} / {max}</p>
                        </div>
                        <div className="p-1.5 border border-black text-center">
                            <p className="text-[8px] uppercase font-bold text-gray-600">คะแนนเฉลี่ย</p>
                            <p className="text-sm font-bold">{average.toFixed(2)}</p>
                        </div>
                        <div className="p-1.5 border border-black text-center">
                            <p className="text-[8px] uppercase font-bold text-gray-600">เปอร์เซ็นต์เฉลี่ย</p>
                            <p className="text-sm font-bold">{percentage}%</p>
                        </div>
                        <div className="p-1.5 border border-black text-center">
                            <p className="text-[8px] uppercase font-bold text-gray-600">จำนวนผู้ประเมิน</p>
                            <p className="text-sm font-bold">{savedEvaluations.length} ท่าน</p>
                        </div>
                    </div>

                    {/* Comments from all evaluators for print */}
                    <div className="mt-3 pt-2 border-t border-black">
                        <h3 className="text-[10px] font-bold text-black mb-1 uppercase tracking-wider">ความคิดเห็นจากผู้ประเมิน:</h3>
                        <div className="space-y-2">
                            {savedEvaluations.map((ev, i) => (
                                <div key={i} className="p-2 border border-gray-300 bg-white">
                                    <p className="text-[9px] font-bold text-black border-b border-gray-200 pb-0.5 mb-1">
                                        {ev.evaluator_name ?? 'ไม่ระบุชื่อ'} (เมื่อ {formatDateTime(ev.evaluated_at)})
                                    </p>
                                    <p className="text-[10px] text-black whitespace-pre-wrap leading-relaxed font-normal">
                                        {ev.notes || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={cn(
            'p-3 rounded-lg border',
            accent
                ? 'bg-amber-400/10 border-amber-300/40'
                : 'bg-black/20 border-white/10',
        )}>
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{label}</p>
            <p className={cn(
                'text-xl font-bold tabular-nums mt-0.5',
                accent ? 'text-amber-200' : 'text-white',
            )}>
                {value}
            </p>
        </div>
    )
}

function formatDateTime(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}
