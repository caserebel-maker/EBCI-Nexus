'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowRight, RefreshCw, Mail, Hash, X, Loader2,
    Sparkles, MapPin, Clock, Users, ShieldCheck, CheckCircle2,
} from 'lucide-react'

const glass = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '20px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
} as const

const HIGHLIGHTS: Array<{ icon: typeof Sparkles; title: string; body: string }> = [
    { icon: MapPin,     title: 'ที่ตั้งสะดวก',    body: 'ออฟฟิศใจกลาง กทม. เดินทางง่าย ใกล้รถไฟฟ้า' },
    { icon: Clock,      title: 'เวลางานยืดหยุ่น', body: 'เวลาเริ่มงาน 8:00–9:00 · Flexi-hour สำหรับบางตำแหน่ง' },
    { icon: Users,      title: 'ทีมอบอุ่น',       body: 'วัฒนธรรมแบบครอบครัว พี่น้องช่วยกันโต มีงานเลี้ยงประจำปี' },
    { icon: ShieldCheck,title: 'สวัสดิการครบ',   body: 'ประกันสังคม · ประกันสุขภาพ · โบนัส · วันหยุดพักร้อน' },
]

export function CareersLandingClient() {
    const [showResume, setShowResume] = useState(false)

    return (
        <div className="space-y-10 lg:space-y-14">
            {/* Hero */}
            <section className="text-center py-10 lg:py-16">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-200/90 bg-amber-300/10 border border-amber-300/20 rounded-full px-3 py-1">
                    <Sparkles size={14} />
                    เรากำลังรับสมัคร
                </p>
                <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                    ร่วมเป็นส่วนหนึ่งของ<br className="sm:hidden" />
                    <span className="text-amber-200"> EBCI Trade</span>
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-white/75 leading-relaxed">
                    บริษัทชิปปิ้งและพิธีการศุลกากรชั้นนำของไทย
                    <br className="hidden sm:block" />
                    ดูแลลูกค้ามากว่า 30 ปี พร้อมเติบโตไปพร้อมกับทีมที่ใส่ใจ
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/careers/apply"
                        className="group inline-flex items-center gap-2 px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-400/30 transition-all active:scale-95"
                    >
                        สมัครงาน
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowResume(true)}
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-base rounded-xl border border-white/15 transition-all active:scale-95"
                    >
                        <RefreshCw size={16} />
                        ดูสถานะ / กรอกต่อ
                    </button>
                </div>
            </section>

            {/* Why EBCI */}
            <section>
                <h2 className="text-center text-xl sm:text-2xl font-bold text-white mb-6">
                    ทำไมต้อง EBCI
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="p-5" style={glass}>
                            <div className="h-10 w-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-200 mb-3">
                                <Icon size={18} />
                            </div>
                            <h3 className="text-white font-bold mb-1.5 text-[15px]">{title}</h3>
                            <p className="text-white/65 text-[13px] leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="p-6 sm:p-8" style={glass}>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-5">ขั้นตอนการสมัคร</h2>
                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/80">
                    {[
                        { step: 1, title: 'กรอกใบสมัคร', body: 'ทั้งหมด 5 ขั้นตอน ระบบบันทึกอัตโนมัติทุก 3 วินาที' },
                        { step: 2, title: 'รอการติดต่อ',  body: 'HR จะพิจารณาและติดต่อกลับภายใน 7 วันทำการ' },
                        { step: 3, title: 'สัมภาษณ์งาน', body: 'ถ้าผ่านคัดเลือก จะนัดสัมภาษณ์ที่ออฟฟิศ' },
                    ].map(({ step, title, body }) => (
                        <li key={step} className="flex gap-3">
                            <div className="h-9 w-9 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/20">
                                {step}
                            </div>
                            <div>
                                <p className="text-white font-bold mb-0.5">{title}</p>
                                <p className="text-white/65 text-[13px] leading-relaxed">{body}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Footer contact */}
            <section className="text-center text-white/60 text-sm pb-6">
                <p>มีคำถามเกี่ยวกับการสมัคร? ติดต่อแผนกบุคคลที่ <span className="text-white/85 font-semibold">hr@ebcitrade.com</span></p>
            </section>

            {showResume && <ResumeDraftModal onClose={() => setShowResume(false)} />}
        </div>
    )
}

// ── Resume-draft modal ──────────────────────────────────────────────────────
function ResumeDraftModal({ onClose }: { onClose: () => void }) {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [refCode, setRefCode] = useState('')
    const [err, setErr] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    const submit = () => {
        setErr(null)
        const trimmedRef = refCode.trim().toUpperCase()
        const trimmedEmail = email.trim()
        if (!trimmedRef || !trimmedEmail) {
            setErr('กรุณากรอก email และรหัสใบสมัคร')
            return
        }
        startTransition(async () => {
            try {
                const res = await fetch('/api/careers/apply/resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: trimmedEmail, reference_code: trimmedRef }),
                })
                const json = await res.json()
                if (!res.ok) {
                    setErr(json?.error ?? 'ไม่พบใบสมัคร')
                    return
                }
                setDone(true)
                // Tiny beat so the success state renders before the jump
                setTimeout(() => {
                    router.push(`/careers/apply?ref=${encodeURIComponent(json.application.reference_code)}`)
                }, 500)
            } catch {
                setErr('เกิดข้อผิดพลาดในการเชื่อมต่อ')
            }
        })
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md relative p-6 sm:p-7 text-white"
                style={{
                    ...glass,
                    background: 'rgba(86,30,35,0.77)',
                    borderRadius: '20px',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="ปิด"
                >
                    <X size={18} />
                </button>

                <h2 className="text-xl font-bold mb-1.5">ดูสถานะใบสมัคร</h2>
                <p className="text-white/70 text-sm mb-5">
                    กรอก email และรหัสใบสมัครที่ได้รับทาง email เพื่อกรอกใบสมัครต่อ
                </p>

                {done ? (
                    <div className="flex items-center gap-2 text-emerald-200 py-5 text-[15px] font-semibold">
                        <CheckCircle2 size={18} />
                        พบใบสมัครแล้ว กำลังเปิดหน้าใบสมัคร…
                    </div>
                ) : (
                    <>
                        <label className="block mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/55 font-bold mb-1.5">
                                <Mail size={12} /> Email
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                autoComplete="email"
                                disabled={isPending}
                                className="w-full h-11 px-3.5 rounded-lg bg-black/30 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-all"
                            />
                        </label>

                        <label className="block mb-2">
                            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/55 font-bold mb-1.5">
                                <Hash size={12} /> รหัสใบสมัคร
                            </span>
                            <input
                                type="text"
                                value={refCode}
                                onChange={e => setRefCode(e.target.value)}
                                placeholder="APP-2026-0001"
                                disabled={isPending}
                                className="w-full h-11 px-3.5 rounded-lg bg-black/30 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-all tracking-wider"
                            />
                        </label>

                        {err && (
                            <p className="text-red-300 text-sm mt-2 mb-1" role="alert">{err}</p>
                        )}

                        <button
                            type="button"
                            onClick={submit}
                            disabled={isPending}
                            className="mt-4 w-full h-11 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-bold rounded-lg transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={15} />}
                            ค้นหาใบสมัคร
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
