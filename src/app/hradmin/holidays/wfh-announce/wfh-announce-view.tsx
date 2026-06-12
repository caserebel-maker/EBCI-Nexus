'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
    Megaphone, AlertCircle, CheckCircle2, Loader2, Info, Home,
    Calendar, ChevronLeft,
} from 'lucide-react'

const TH_MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function formatThaiShort(iso: string): string {
    const [y, m, d] = iso.split('-')
    return `${parseInt(d, 10)} ${TH_MONTH_SHORT[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`
}

function todayBangkokIso(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(0, 10)
}

function expandRange(start: string, end: string): string[] {
    if (!start || !end) return []
    const s = Date.parse(start + 'T00:00:00Z')
    const e = Date.parse(end + 'T00:00:00Z')
    if (isNaN(s) || isNaN(e) || e < s) return []
    const out: string[] = []
    for (let t = s; t <= e; t += 86_400_000) {
        out.push(new Date(t).toISOString().slice(0, 10))
    }
    return out
}

interface Summary {
    daysCreated: number
    daysSkipped: number
    announcementId: string | null
    notificationsCreated: number
    emailsSent: number
    emailsFailed: number
    employeesTargeted: number
    errors: string[]
}

export function WfhAnnounceView() {
    const today = todayBangkokIso()
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [reason, setReason] = useState('')
    const [notifyInApp, setNotifyInApp] = useState(true)
    const [notifyEmail, setNotifyEmail] = useState(true)
    const [createAnnouncement, setCreateAnnouncement] = useState(true)
    const [submitting, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)
    const [result, setResult] = useState<Summary | null>(null)

    const dates = useMemo(() => expandRange(startDate, endDate), [startDate, endDate])
    const dayCount = dates.length

    const canSubmit = dayCount > 0 && dayCount <= 14 && reason.trim().length > 0

    const handleSubmit = () => {
        if (!canSubmit) return
        setErr(null)
        setResult(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/hradmin/wfh-announce', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        startDate, endDate,
                        reason: reason.trim(),
                        notifyInApp, notifyEmail, createAnnouncement,
                    }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'ประกาศไม่สำเร็จ')
                setResult(json.summary as Summary)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'ประกาศไม่สำเร็จ')
            }
        })
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-10">
            {/* Breadcrumb */}
            <Link
                href="/hradmin/holidays"
                className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"
            >
                <ChevronLeft size={14} />
                กลับไปปฏิทินบริษัท
            </Link>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 border border-blue-500/40">
                    <Megaphone size={22} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">ประกาศ WFH พิเศษ</h1>
                    <p className="text-sm text-white/55">
                        ตั้งวัน WFH ทั้งบริษัท + แจ้งเตือนทุกคนทันที (1 ครั้งกด)
                    </p>
                </div>
            </div>

            {/* Form */}
            {!result && (
                <div className="rounded-2xl p-5 sm:p-6 space-y-4 border border-white/10"
                    style={{ background: 'rgba(86,30,35,0.45)' }}>

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                วันที่เริ่ม <span className="text-red-300">*</span>
                            </span>
                            <input
                                type="date"
                                value={startDate}
                                min={today}
                                onChange={(e) => {
                                    setStartDate(e.target.value)
                                    if (e.target.value > endDate) setEndDate(e.target.value)
                                }}
                                className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                                วันที่สิ้นสุด <span className="text-red-300">*</span>
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                            />
                        </label>
                    </div>

                    {/* Day list preview */}
                    {dayCount > 0 && (
                        <div className="rounded-lg p-3 bg-emerald-500/10 border border-emerald-500/30">
                            <p className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-bold mb-1.5 inline-flex items-center gap-1">
                                <Calendar size={11} /> รวม {dayCount} วัน
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {dates.map(d => (
                                    <span key={d} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-100 text-xs font-semibold">
                                        {formatThaiShort(d)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {dayCount > 14 && (
                        <p className="text-[11px] text-red-300 inline-flex items-center gap-1">
                            <AlertCircle size={11} /> เกิน 14 วัน — แยกเป็นหลายประกาศ
                        </p>
                    )}

                    {/* Reason */}
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            เหตุผล (จะแสดงในประกาศและอีเมล) <span className="text-red-300">*</span>
                        </span>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={'เช่น "เนื่องจากราคาน้ำมันสูงขึ้น และต้องการลดการเดินทาง บริษัทขอประกาศ WFH วันที่ 5-8 พ.ค. 2569"'}
                            maxLength={1000}
                            rows={4}
                            className="mt-1.5 w-full px-3 py-2.5 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30 resize-none"
                        />
                        <p className="text-[10px] text-white/40 mt-1 text-right">{reason.length}/1000</p>
                    </label>

                    {/* Notification toggles */}
                    <div className="rounded-lg p-3 bg-white/5 border border-white/10 space-y-2.5">
                        <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            ช่องทางแจ้งเตือน
                        </p>
                        <CheckLine
                            checked={createAnnouncement}
                            onChange={setCreateAnnouncement}
                            label="สร้างประกาศหน้าแรก"
                            sublabel="ปักหมุดบน /portal/dashboard และ /portal/announcements (หมดอายุอัตโนมัติ)"
                        />
                        <CheckLine
                            checked={notifyInApp}
                            onChange={setNotifyInApp}
                            label="🔔 In-app notification"
                            sublabel="เด้งเตือนในแอป — เห็นทันที"
                        />
                        <CheckLine
                            checked={notifyEmail}
                            onChange={setNotifyEmail}
                            label="📧 Email"
                            sublabel="ส่งอีเมลถึงทุกคน — กันคนไม่เปิดแอป"
                        />
                    </div>

                    {/* Tip */}
                    <div className="rounded-lg p-3 bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-100 inline-flex items-start gap-2 w-full">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        <span>
                            พนักงานจะเช็คอิน WFH ผ่านแอปได้เลยในวันที่กำหนด · ปุ่ม WFH จะ active อัตโนมัติเฉพาะวันนั้น
                        </span>
                    </div>

                    {err && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {err}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)' }}
                    >
                        {submitting ? (
                            <><Loader2 size={16} className="animate-spin" /> กำลังประกาศ…</>
                        ) : (
                            <><Megaphone size={16} /> ประกาศและแจ้งเตือน</>
                        )}
                    </button>
                </div>
            )}

            {/* Success summary */}
            {result && (
                <div className="rounded-2xl p-5 sm:p-6 space-y-4 border border-emerald-500/40 bg-emerald-500/10">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
                            <CheckCircle2 size={24} className="text-emerald-200" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">ประกาศเรียบร้อย</h2>
                            <p className="text-sm text-emerald-200/80">{reason.trim()}</p>
                        </div>
                    </div>

                    <ul className="space-y-2">
                        <SummaryRow icon={Home} label={`สร้าง ${result.daysCreated} วัน WFH`}
                            sub={result.daysSkipped > 0 ? `(ข้าม ${result.daysSkipped} วันที่ตั้งไว้แล้ว)` : null} />
                        {result.announcementId && (
                            <SummaryRow icon={Megaphone} label="สร้างประกาศหน้าแรกแล้ว" sub={null}
                                href={`/portal/announcements?focus=${result.announcementId}`} />
                        )}
                        <SummaryRow icon={CheckCircle2}
                            label={`แจ้งเตือนในแอป ${result.notificationsCreated}/${result.employeesTargeted} คน`}
                            sub={null} />
                        <SummaryRow icon={CheckCircle2}
                            label={`ส่งอีเมล ${result.emailsSent}/${result.employeesTargeted} ฉบับ`}
                            sub={result.emailsFailed > 0 ? `(พลาด ${result.emailsFailed} ฉบับ — ดู log)` : null} />
                    </ul>

                    {result.errors.length > 0 && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
                            <p className="font-semibold mb-1">ข้อผิดพลาด:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {result.errors.map((er, i) => <li key={i}>{er}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Link
                            href="/hradmin/holidays"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                        >
                            ไปดูปฏิทิน
                        </Link>
                        <button
                            type="button"
                            onClick={() => { setResult(null); setReason('') }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold"
                        >
                            ประกาศใหม่อีกครั้ง
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function CheckLine({ checked, onChange, label, sublabel }: {
    checked: boolean
    onChange: (v: boolean) => void
    label: string
    sublabel: string
}) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 bg-black/35 text-amber-400 focus:ring-amber-400"
            />
            <div className="flex-1">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-[11px] text-white/55">{sublabel}</p>
            </div>
        </label>
    )
}

function SummaryRow({ icon: Icon, label, sub, href }: {
    icon: React.ComponentType<{ size?: number; className?: string }>
    label: string
    sub: string | null
    href?: string
}) {
    const inner = (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <Icon size={14} className="text-emerald-300 shrink-0" />
            <div className="flex-1">
                <p className="text-sm text-white">{label}</p>
                {sub && <p className="text-[11px] text-white/55">{sub}</p>}
            </div>
            {href && <span className="text-xs text-emerald-300">เปิด →</span>}
        </div>
    )
    return (
        <li>
            {href ? <Link href={href}>{inner}</Link> : inner}
        </li>
    )
}
