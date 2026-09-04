'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowRight, RefreshCw, Mail, Hash, X, Loader2,
    Sparkles, MapPin, Clock, Users, ShieldCheck, CheckCircle2,
    BriefcaseBusiness, Banknote, ClipboardList, FileText,
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
    { icon: Users,      title: 'ทีมเป็นกันเอง',   body: 'ทำงานร่วมกันอย่างเป็นกันเอง ช่วยเหลือกันเพื่อการเติบโต มีงานเลี้ยงประจำปี' },
    { icon: ShieldCheck,title: 'สวัสดิการครบ',   body: 'ประกันสังคม · โบนัส · วันหยุดพักร้อน' },
]

interface JobOpening {
    id: string
    title: string
    location: string
    type: string
    schedule: string
    salary: string
    summary: string
    requirements: string[]
    responsibilities: string[]
    benefits: string[]
}

const JOB_OPENINGS: JobOpening[] = [
    {
        id: 'import-export-document',
        title: 'เจ้าหน้าที่เอกสารนำเข้า-ส่งออก',
        location: 'สำนักงานใหญ่ กรุงเทพฯ',
        type: 'Full-time',
        schedule: 'จันทร์-ศุกร์ · 8:00-17:00',
        salary: 'ตามประสบการณ์',
        summary: 'ดูแลเอกสาร shipping, invoice, packing list และประสานงานพิธีการศุลกากรกับทีมภายใน',
        requirements: [
            'มีความละเอียดรอบคอบกับเอกสารและตัวเลข',
            'ใช้คอมพิวเตอร์และ Microsoft Office ได้ดี',
            'มีประสบการณ์งานนำเข้า-ส่งออกจะพิจารณาเป็นพิเศษ',
        ],
        responsibilities: [
            'จัดเตรียมและตรวจสอบเอกสารนำเข้า-ส่งออก',
            'ประสานงานกับลูกค้า ทีมชิปปิ้ง และหน่วยงานที่เกี่ยวข้อง',
            'ติดตามสถานะงานและอัปเดตข้อมูลให้ครบถ้วน',
        ],
        benefits: ['ประกันสังคม', 'โบนัสตามผลประกอบการ', 'วันหยุดพักร้อน'],
    },
    {
        id: 'logistics-coordinator',
        title: 'เจ้าหน้าที่ประสานงานขนส่ง',
        location: 'สำนักงานใหญ่ กรุงเทพฯ',
        type: 'Full-time',
        schedule: 'จันทร์-ศุกร์ · มีความยืดหยุ่นตามงาน',
        salary: 'ตามประสบการณ์',
        summary: 'ประสานงานรถขนส่ง นัดหมายรับ-ส่งสินค้า และติดตามงานให้ลูกค้าได้รับบริการตรงเวลา',
        requirements: [
            'สื่อสารชัดเจนและแก้ปัญหาเฉพาะหน้าได้ดี',
            'ติดตามงานหลายรายการพร้อมกันได้',
            'มีประสบการณ์ logistics หรือขนส่งจะพิจารณาเป็นพิเศษ',
        ],
        responsibilities: [
            'วางแผนและประสานงานรับ-ส่งสินค้า',
            'ติดตามสถานะรถและแจ้งความคืบหน้ากับลูกค้า',
            'สรุปปัญหาและประสานทีมเพื่อปิดงานให้เรียบร้อย',
        ],
        benefits: ['ประกันสังคม', 'งานเลี้ยงประจำปี', 'ทีมช่วยเหลือกัน'],
    },
    {
        id: 'accounting-admin',
        title: 'เจ้าหน้าที่บัญชี / ธุรการ',
        location: 'สำนักงานใหญ่ กรุงเทพฯ',
        type: 'Full-time',
        schedule: 'จันทร์-ศุกร์ · 8:00-17:00',
        salary: 'ตามประสบการณ์',
        summary: 'ดูแลงานเอกสารบัญชี วางบิล รับเอกสาร และงานธุรการสนับสนุนทีมปฏิบัติการ',
        requirements: [
            'มีพื้นฐานงานเอกสารบัญชีหรือธุรการ',
            'ละเอียด เป็นระบบ และติดตามงานได้ต่อเนื่อง',
            'ใช้ Excel หรือ Google Sheets ได้',
        ],
        responsibilities: [
            'จัดเก็บและตรวจสอบเอกสารประกอบงานบัญชี',
            'ประสานงานวางบิล รับเอกสาร และติดตามเอกสาร',
            'สนับสนุนงานธุรการของทีมตามที่ได้รับมอบหมาย',
        ],
        benefits: ['ประกันสังคม', 'วันหยุดพักร้อน', 'โอกาสเรียนรู้งานจริง'],
    },
]

export function CareersLandingClient() {
    const [showResume, setShowResume] = useState(false)
    const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null)

    return (
        <div>
            {/* Hero */}
            <section className="relative overflow-hidden min-h-[620px] lg:min-h-[720px] flex items-center justify-center text-center px-5 py-16 lg:py-20 border-b border-white/10 shadow-2xl shadow-black/30">
                <Image
                    src="/careers/office-hero.png"
                    alt="บรรยากาศการทำงานของทีม EBCI"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#16070c]/42 via-[#4d171f]/46 to-[#842a32]/66" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,217,128,0.08),transparent_45%)]" />

                <div className="relative z-10 max-w-5xl mx-auto">
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-amber-200/95 bg-amber-300/15 border border-amber-300/30 rounded-full px-3 py-1">
                        <Sparkles size={14} />
                        เรากำลังรับสมัคร
                    </p>
                    <h1 className="mt-5 text-3xl sm:text-4xl lg:text-6xl font-bold text-white tracking-tight leading-tight drop-shadow-xl">
                        ร่วมเป็นส่วนหนึ่งของ<br className="sm:hidden" />
                        <span className="text-amber-200"> EBCI</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-white/82 leading-relaxed">
                        บริษัทชิปปิ้งและพิธีการศุลกากรชั้นนำของไทย
                        <br className="hidden sm:block" />
                        ดูแลลูกค้ามากว่า 40 ปี พร้อมเติบโตไปพร้อมกับทีมที่ใส่ใจ
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="#open-positions"
                        className="group inline-flex items-center gap-2 px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-400/30 transition-all active:scale-95"
                    >
                        ดูตำแหน่งที่เปิดรับ
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
                </div>
            </section>

            <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 lg:py-14 space-y-10 lg:space-y-14">
              {/* Open positions */}
              <section id="open-positions" className="scroll-mt-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                    <div>
                        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-200/85 mb-2">
                            <BriefcaseBusiness size={14} />
                            Open Positions
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">ตำแหน่งที่กำลังเปิดรับ</h2>
                    </div>
                    <p className="text-sm text-white/60 max-w-md">
                        กดที่การ์ดเพื่อดูรายละเอียดงานเต็ม แล้วสมัครตำแหน่งที่สนใจได้ทันที
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {JOB_OPENINGS.map(job => (
                        <button
                            key={job.id}
                            type="button"
                            onClick={() => setSelectedJob(job)}
                            className="group text-left p-5 transition-all hover:-translate-y-1 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            style={glass}
                        >
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="h-11 w-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-200">
                                    <ClipboardList size={20} />
                                </div>
                                <span className="rounded-full bg-emerald-300/15 text-emerald-100 border border-emerald-200/20 px-3 py-1 text-xs font-bold">
                                    เปิดรับ
                                </span>
                            </div>
                            <h3 className="text-white text-lg font-bold leading-snug mb-3 group-hover:text-amber-100 transition-colors">
                                {job.title}
                            </h3>
                            <p className="text-white/68 text-sm leading-relaxed mb-4">
                                {job.summary}
                            </p>
                            <div className="space-y-2 text-sm text-white/70">
                                <p className="flex items-center gap-2"><MapPin size={14} className="text-amber-200" /> {job.location}</p>
                                <p className="flex items-center gap-2"><Clock size={14} className="text-amber-200" /> {job.schedule}</p>
                                <p className="flex items-center gap-2"><Banknote size={14} className="text-amber-200" /> {job.salary}</p>
                            </div>
                            <div className="mt-5 inline-flex items-center gap-2 text-amber-200 font-bold text-sm">
                                ดูรายละเอียด
                                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                            </div>
                        </button>
                    ))}
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
                <p>มีคำถามเกี่ยวกับการสมัคร? ติดต่อแผนกบุคคลที่ <span className="text-white/85 font-semibold">c.arthit@ebcitrade.com</span></p>
              </section>
            </div>

            {showResume && <ResumeDraftModal onClose={() => setShowResume(false)} />}
            {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
        </div>
    )
}

function JobDetailModal({ job, onClose }: { job: JobOpening; onClose: () => void }) {
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

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-h-[88vh] overflow-y-auto sm:max-w-3xl relative p-6 sm:p-7 text-white"
                style={{
                    ...glass,
                    background: 'rgba(86,30,35,0.88)',
                    borderRadius: '22px',
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

                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-200/85 mb-3">
                    <FileText size={13} />
                    Job Detail
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 pr-10">{job.title}</h2>
                <p className="text-white/74 leading-relaxed mb-5">{job.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {[
                        { icon: MapPin, label: 'สถานที่', value: job.location },
                        { icon: Clock, label: 'เวลางาน', value: job.schedule },
                        { icon: Banknote, label: 'เงินเดือน', value: job.salary },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="rounded-2xl bg-black/20 border border-white/10 p-4">
                            <Icon size={17} className="text-amber-200 mb-2" />
                            <p className="text-xs text-white/50 mb-1">{label}</p>
                            <p className="text-sm font-semibold text-white/88">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <DetailList title="หน้าที่รับผิดชอบ" items={job.responsibilities} />
                    <DetailList title="คุณสมบัติหลัก" items={job.requirements} />
                    <DetailList title="สวัสดิการ" items={job.benefits} />
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-white/10 pt-5">
                    <p className="text-sm text-white/58">
                        สามารถสมัครและแนบเอกสารผ่านระบบออนไลน์ได้เลย
                    </p>
                    <Link
                        href={`/careers/apply?position=${encodeURIComponent(job.title)}`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold transition-all active:scale-95"
                    >
                        สมัครตำแหน่งนี้
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    )
}

function DetailList({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <h3 className="text-white font-bold mb-3">{title}</h3>
            <ul className="space-y-2">
                {items.map(item => (
                    <li key={item} className="flex gap-2 text-sm text-white/72 leading-relaxed">
                        <CheckCircle2 size={15} className="text-amber-200 shrink-0 mt-0.5" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
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
