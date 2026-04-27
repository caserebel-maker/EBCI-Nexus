'use client'

import { useEffect, useRef, useState } from 'react'
import { ClipboardEdit, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    applicationId: string
    initialNotes: string | null
}

const AUTOSAVE_DELAY_MS = 1500
const MAX_LEN = 8000

type SaveState =
    | { kind: 'idle' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved'; at: number }
    | { kind: 'error'; message: string }

/**
 * Free-form HR review notes. Autosaves 1.5s after the last keystroke
 * to /api/hradmin/applicants/[id]/review-notes. Status-change audit
 * trail (appended by the status API) is preserved — HR can edit in
 * place; the textarea owns the field between status changes.
 *
 * Save state badge:
 *   idle    → nothing rendered
 *   dirty   → "กำลังจะบันทึก…"  (between keystroke and timer fire)
 *   saving  → spinner + "กำลังบันทึก"
 *   saved   → green check + "บันทึกแล้ว Xs ago"
 *   error   → red message + retry hint
 */
export function ReviewNotes({ applicationId, initialNotes }: Props) {
    const [text, setText] = useState(initialNotes ?? '')
    const [save, setSave] = useState<SaveState>({ kind: 'idle' })
    const lastSavedRef = useRef<string>(initialNotes ?? '')
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [tick, setTick] = useState(0) // re-render to update "Xs ago"

    // Autosave timer
    useEffect(() => {
        if (text === lastSavedRef.current) {
            // Reverted to last-saved — clear pending save
            setSave(prev => prev.kind === 'dirty' || prev.kind === 'saving' ? { kind: 'idle' } : prev)
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
            return
        }
        setSave({ kind: 'dirty' })
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            void persist(text)
        }, AUTOSAVE_DELAY_MS)
        return () => {
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text])

    // "saved Xs ago" ticker
    useEffect(() => {
        if (save.kind !== 'saved') return
        const id = setInterval(() => setTick(t => t + 1), 5000)
        return () => clearInterval(id)
    }, [save.kind])

    // Save on tab close / nav away when there are unsaved keystrokes.
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (save.kind === 'dirty' || save.kind === 'saving') {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [save.kind])

    const persist = async (value: string) => {
        setSave({ kind: 'saving' })
        try {
            const res = await fetch(`/api/hradmin/applicants/${applicationId}/review-notes`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ notes: value }),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? `HTTP ${res.status}`)
            }
            lastSavedRef.current = value
            setSave({ kind: 'saved', at: Date.now() })
        } catch (err) {
            console.error('[review-notes] save error:', err)
            setSave({
                kind: 'error',
                message: err instanceof Error ? err.message : 'ไม่สามารถบันทึก',
            })
        }
    }

    const saveNow = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        if (text === lastSavedRef.current) return
        void persist(text)
    }

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="text-white font-bold text-[15px] inline-flex items-center gap-2">
                    <ClipboardEdit size={16} className="text-[#f9c5cd]" />
                    บันทึกของ HR
                </h2>
                <SaveIndicator state={save} tick={tick} />
            </div>

            <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_LEN))}
                onBlur={saveNow}
                placeholder="โน้ต / ข้อสังเกต / สรุปการสัมภาษณ์ ของ HR — บันทึกอัตโนมัติทุก 1.5 วินาทีหลังพิมพ์"
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-300/40 resize-y min-h-[120px]"
            />

            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-white/40">
                <span>
                    Markdown ไม่ render — แค่ข้อความเปล่า · เก็บได้สูงสุด {MAX_LEN.toLocaleString()} ตัวอักษร
                </span>
                <span className={cn(
                    'tabular-nums shrink-0',
                    text.length > MAX_LEN * 0.9 && 'text-amber-200',
                )}>
                    {text.length} / {MAX_LEN}
                </span>
            </div>
        </section>
    )
}

function SaveIndicator({ state, tick: _tick }: { state: SaveState; tick: number }) {
    if (state.kind === 'idle') return null
    if (state.kind === 'dirty') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
                <Loader2 size={11} className="opacity-60" />
                กำลังจะบันทึก…
            </span>
        )
    }
    if (state.kind === 'saving') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-200">
                <Loader2 size={11} className="animate-spin" />
                กำลังบันทึก
            </span>
        )
    }
    if (state.kind === 'error') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-red-200">
                <AlertCircle size={11} />
                {state.message}
            </span>
        )
    }
    // saved
    const secs = Math.max(0, Math.floor((Date.now() - state.at) / 1000))
    const label = secs < 5 ? 'เมื่อสักครู่'
        : secs < 60 ? `${secs} วิที่แล้ว`
        : secs < 3600 ? `${Math.floor(secs / 60)} นาทีที่แล้ว`
        : 'มากกว่า 1 ชม.'
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-200">
            <CheckCircle2 size={11} />
            บันทึกแล้ว · {label}
        </span>
    )
}
