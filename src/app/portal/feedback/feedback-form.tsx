'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
    'ข้อเสนอแนะ',
    'แจ้งปัญหา',
    'ติชม',
    'ปรับปรุงระบบ',
    'อื่น ๆ',
] as const

type Category = typeof CATEGORIES[number]

type Props = {
    employeeName: string
    employeeCode: string | null
    department: string | null
    position: string | null
}

export function FeedbackForm({ employeeName, employeeCode, department, position }: Props) {
    const [category, setCategory] = useState<Category>('ข้อเสนอแนะ')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    const trimmed = message.trim()
    const canSubmit = trimmed.length >= 10 && trimmed.length <= 2000 && !submitting

    const employeeMeta = useMemo(() => {
        return [
            employeeCode ? `รหัส ${employeeCode}` : null,
            department,
            position,
        ].filter(Boolean).join(' · ')
    }, [department, employeeCode, position])

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!canSubmit) return

        setSubmitting(true)
        setError(null)
        setSent(false)
        try {
            const res = await fetch('/api/portal/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, message: trimmed }),
            })
            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.ok) {
                throw new Error(json?.error ?? 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
            }
            setSent(true)
            setMessage('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] shadow-2xl shadow-black/10 backdrop-blur"
        >
            <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.10] to-white/[0.04] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                        <Sparkles size={19} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{employeeName}</p>
                        {employeeMeta && <p className="truncate text-xs text-white/50">{employeeMeta}</p>}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div>
                    <label className="mb-3 block text-sm font-bold text-white/85">
                        ประเภทข้อความ
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {CATEGORIES.map(item => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setCategory(item)}
                                className={cn(
                                    'rounded-xl border px-3 py-3 text-sm font-bold transition-all',
                                    category === item
                                        ? 'border-yellow-300/80 bg-yellow-300 text-[#4b1118] shadow-lg shadow-yellow-500/20'
                                        : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white',
                                )}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <label htmlFor="feedback-message" className="block text-sm font-bold text-white/85">
                            รายละเอียด
                        </label>
                        <span className={cn(
                            'text-xs',
                            trimmed.length > 2000 ? 'text-red-200' : 'text-white/45',
                        )}>
                            {trimmed.length}/2000
                        </span>
                    </div>
                    <textarea
                        id="feedback-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={8}
                        placeholder="พิมพ์สิ่งที่อยากเสนอแนะ ติชม หรือจุดที่อยากให้ปรับปรุง..."
                        className="min-h-[220px] w-full resize-y rounded-2xl border border-white/15 bg-black/20 px-4 py-4 text-base leading-7 text-white placeholder:text-white/35 outline-none transition focus:border-yellow-300/70 focus:ring-4 focus:ring-yellow-300/10"
                    />
                    <p className="mt-2 text-xs leading-6 text-white/45">
                        ข้อความจะถูกส่งอีเมลไปที่ผู้ดูแลระบบ พร้อมชื่อและรหัสพนักงานของผู้ส่ง
                    </p>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-300/20 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
                        {error}
                    </div>
                )}

                {sent && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100">
                        <CheckCircle2 size={18} />
                        ส่งข้อเสนอแนะเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-300 to-amber-400 px-5 py-3 text-base font-black text-[#4b1118] shadow-xl shadow-yellow-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    ส่งข้อเสนอแนะ
                </button>
            </div>
        </form>
    )
}
