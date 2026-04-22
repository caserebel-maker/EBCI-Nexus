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
    initial: SavedEvaluation | null
}

/**
 * 12-factor interview evaluation — displayed inside the admin detail
 * page. Starts in read-only mode when there's a saved evaluation so
 * HR sees the last verdict at a glance; an Edit button flips it to
 * an editable form. Unsaved forms can be submitted once every factor
 * has a 1-5 score.
 */
export function InterviewEvaluation({ applicationId, initial }: Props) {
    const router = useRouter()
    const [scores, setScores] = useState<Record<number, number>>(() => {
        const obj: Record<number, number> = {}
        if (initial) {
            for (const f of initial.factors) obj[f.id] = f.score
        }
        return obj
    })
    const [notes, setNotes] = useState(initial?.notes ?? '')
    const [editing, setEditing] = useState<boolean>(!initial)
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const { total, max, average, percentage, allFilled } = useMemo(() => {
        const vals = INTERVIEW_FACTORS.map(f => scores[f.id] ?? 0)
        const filled = vals.every(v => v >= 1 && v <= 5)
        const sum = vals.reduce((s, v) => s + (v || 0), 0)
        const maxScore = INTERVIEW_FACTORS.length * 5
        const avg = filled ? +(sum / INTERVIEW_FACTORS.length).toFixed(2) : 0
        const pct = filled ? +((sum / maxScore) * 100).toFixed(1) : 0
        return { total: sum, max: maxScore, average: avg, percentage: pct, allFilled: filled }
    }, [scores])

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
                    body: JSON.stringify({ scores, notes: notes.trim() || null }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'บันทึกไม่สำเร็จ')
                setToast('บันทึกผลการประเมินเรียบร้อย')
                window.setTimeout(() => setToast(null), 4000)
                setEditing(false)
                router.refresh()
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
            }
        })
    }

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-4">
            <header className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-white font-bold inline-flex items-center gap-2">
                        <ClipboardCheck size={16} />
                        การประเมินสัมภาษณ์ (12 ปัจจัย)
                    </h2>
                    {initial && (
                        <p className="text-[11px] text-white/55 mt-1 inline-flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1"><UserCircle size={11} /> {initial.evaluator_name ?? 'ไม่ระบุผู้ประเมิน'}</span>
                            <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatDateTime(initial.evaluated_at)}</span>
                        </p>
                    )}
                </div>
                {initial && !editing && (
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                    >
                        แก้ไขการประเมิน
                    </button>
                )}
            </header>

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
                            const value = scores[f.id] ?? 0
                            return (
                                <tr key={f.id} className="border-t border-white/5">
                                    <td className="py-2 px-2 text-white/45 tabular-nums">{f.id}</td>
                                    <td className="py-2 px-2 text-white/90 text-[13px] min-w-[200px]">{f.label}</td>
                                    {[1, 2, 3, 4, 5].map(v => {
                                        const checked = value === v
                                        return (
                                            <td key={v} className="py-1 px-1 text-center">
                                                <button
                                                    type="button"
                                                    disabled={!editing || pending}
                                                    onClick={() => setScores(s => ({ ...s, [f.id]: v }))}
                                                    className={cn(
                                                        'h-9 w-9 rounded-full font-bold tabular-nums text-sm transition-all mx-auto flex items-center justify-center border',
                                                        checked
                                                            ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed',
                                                    )}
                                                    aria-label={`ข้อ ${f.id} ให้ ${v}`}
                                                >
                                                    {v}
                                                </button>
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
                <StatTile label="คะแนนรวม" value={`${total} / ${max}`} />
                <StatTile label="เฉลี่ย" value={allFilled ? average.toFixed(2) : '—'} />
                <StatTile label="เปอร์เซ็นต์" value={allFilled ? `${percentage}%` : '—'} accent={allFilled} />
                <StatTile label="สถานะ" value={allFilled ? 'ให้คะแนนครบ' : `${Object.keys(scores).length}/12`} accent={allFilled} />
            </div>

            {/* Notes */}
            <div>
                <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">หมายเหตุ / ข้อสังเกต</span>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        readOnly={!editing}
                        placeholder="เช่น จุดแข็ง / จุดที่ควรปรับปรุง / คำตอบที่น่าสนใจ"
                        className="mt-1.5 w-full rounded-lg bg-black/25 border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-amber-300/50 read-only:opacity-80"
                    />
                </label>
            </div>

            {err && (
                <p className="text-red-300 text-sm inline-flex items-center gap-1.5">
                    <AlertCircle size={13} /> {err}
                </p>
            )}

            {/* Actions */}
            {editing && (
                <div className="flex items-center justify-end gap-2 pt-1">
                    {initial && (
                        <button
                            type="button"
                            onClick={() => {
                                // revert to the stored evaluation
                                const obj: Record<number, number> = {}
                                for (const f of initial.factors) obj[f.id] = f.score
                                setScores(obj)
                                setNotes(initial.notes ?? '')
                                setEditing(false)
                                setErr(null)
                            }}
                            disabled={pending}
                            className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                        >
                            ยกเลิก
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={submit}
                        disabled={pending || !allFilled}
                        className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold"
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
