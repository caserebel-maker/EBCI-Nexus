'use client'

import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, Clock, Loader2, Sparkles, Trophy, Users, X } from 'lucide-react'

type EventData = {
    title: string
    subtitle: string | null
    prizeAmount: number
    status: string
    closesAt: string | null
}

type EmployeeData = {
    id: string
    name: string
    code: string | null
    department: string | null
    position: string | null
    avatarUrl: string | null
    initials: string
}

type PickerData = {
    id: string
    name: string
    initials: string
    avatarUrl: string | null
    employeeCode: string | null
}

type TeamData = {
    id: string
    name: string
    nameEn: string | null
    flag: string | null
    accentColor: string | null
    pickCount: number
    pickers: PickerData[]
    isActive: boolean
}

type Props = {
    event: EventData
    employee: EmployeeData
    teams: TeamData[]
    initialPredictionTeamId: string | null
    totalPredictions: number
}

function formatThaiDateTime(value: string | null): string {
    if (!value) return 'ยังไม่กำหนดเวลาปิดรับ'
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
}

function formatPrize(value: number): string {
    return new Intl.NumberFormat('th-TH', {
        maximumFractionDigits: 0,
    }).format(value)
}

function isEventClosed(event: EventData): boolean {
    if (event.status !== 'open') return true
    if (!event.closesAt) return false
    return new Date(event.closesAt).getTime() <= Date.now()
}

function AvatarBubble({ picker, className = '' }: { picker: PickerData; className?: string }) {
    const title = picker.employeeCode ? `${picker.name} (${picker.employeeCode})` : picker.name

    return (
        <div
            title={title}
            className={[
                'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/15 text-xs font-black text-white shadow-lg shadow-black/20',
                className,
            ].join(' ')}
        >
            {picker.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={picker.avatarUrl} alt={picker.name} className="h-full w-full object-cover" />
            ) : (
                <span>{picker.initials}</span>
            )}
        </div>
    )
}

export function WorldCupPredictionClient({
    event,
    employee,
    teams,
    initialPredictionTeamId,
    totalPredictions,
}: Props) {
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(initialPredictionTeamId)
    const [pendingTeamId, setPendingTeamId] = useState<string | null>(null)
    const [teamStats, setTeamStats] = useState<Record<string, number>>(() =>
        Object.fromEntries(teams.map(team => [team.id, team.pickCount])),
    )
    const [teamPickers, setTeamPickers] = useState<Record<string, PickerData[]>>(() =>
        Object.fromEntries(teams.map(team => [team.id, team.pickers])),
    )
    const [predictionCount, setPredictionCount] = useState(totalPredictions)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const main = document.querySelector('main')
        if (main) {
            const contentDiv = main.querySelector('.overflow-y-auto')
            if (contentDiv) {
                const el = contentDiv as HTMLElement
                const originalBg = el.style.backgroundImage
                const originalBgSize = el.style.backgroundSize
                const originalBgPos = el.style.backgroundPosition
                const originalBgRepeat = el.style.backgroundRepeat
                const originalBgAttachment = el.style.backgroundAttachment
                
                el.style.backgroundImage = "url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1920')"
                el.style.backgroundSize = 'cover'
                el.style.backgroundPosition = 'center'
                el.style.backgroundRepeat = 'no-repeat'
                el.style.backgroundAttachment = 'fixed'

                return () => {
                    el.style.backgroundImage = originalBg
                    el.style.backgroundSize = originalBgSize
                    el.style.backgroundPosition = originalBgPos
                    el.style.backgroundRepeat = originalBgRepeat
                    el.style.backgroundAttachment = originalBgAttachment
                }
            }
        }
    }, [])

    const closed = isEventClosed(event)
    const selectedTeam = useMemo(
        () => teams.find(team => team.id === selectedTeamId) ?? null,
        [selectedTeamId, teams],
    )
    const pendingTeam = useMemo(
        () => teams.find(team => team.id === pendingTeamId) ?? null,
        [pendingTeamId, teams],
    )
    const currentPicker = useMemo<PickerData>(() => ({
        id: employee.id,
        name: employee.name,
        initials: employee.initials,
        avatarUrl: employee.avatarUrl,
        employeeCode: employee.code,
    }), [employee])
    const pendingPickers = pendingTeamId ? (teamPickers[pendingTeamId] ?? []) : []

    const activeTeams = useMemo(() => teams.filter(t => t.isActive), [teams])
    const eliminatedTeams = useMemo(() => teams.filter(t => !t.isActive), [teams])

    const renderTeamCard = (team: TeamData, isTeamActive: boolean) => {
        const active = selectedTeamId === team.id
        const count = teamStats[team.id] ?? 0
        const pickers = teamPickers[team.id] ?? []
        const visiblePickers = pickers.slice(0, 6)
        const hiddenCount = Math.max(0, pickers.length - visiblePickers.length)
        const prizeShare = count > 0 ? Math.round(event.prizeAmount / count) : event.prizeAmount

        return (
            <button
                key={team.id}
                type="button"
                disabled={closed || saving || !isTeamActive}
                onClick={() => setPendingTeamId(team.id)}
                className={[
                    'group relative min-h-40 overflow-hidden rounded-3xl border p-5 text-left transition-all duration-150',
                    isTeamActive 
                        ? 'bg-gradient-to-b from-white via-slate-50 to-slate-200/60'
                        : 'bg-slate-100/40 border-slate-200/60 border-b-2 border-b-slate-300 shadow-none opacity-60 cursor-not-allowed',
                    isTeamActive && active 
                        ? 'border-emerald-400 border-b-[8px] border-b-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.2),inset_0_2px_3px_rgba(255,255,255,0.9)] ring-2 ring-emerald-400/30' 
                        : isTeamActive ? 'border-slate-200 border-b-[8px] border-b-slate-400/90 shadow-[0_6px_14px_rgba(0,0,0,0.12),inset_0_2px_3px_rgba(255,255,255,0.9)] hover:border-yellow-400 hover:border-b-yellow-500 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.18),inset_0_2px_3px_rgba(255,255,255,0.9)]' : '',
                    closed && isTeamActive ? 'cursor-default' : '',
                    closed && isTeamActive && !active ? 'opacity-85' : '',
                    !isTeamActive ? '' : 'active:translate-y-0.5 active:border-b-[3px] active:shadow-[0_2px_4px_rgba(0,0,0,0.06)]',
                ].join(' ')}
            >
                {isTeamActive && (
                    <div
                        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-10 blur-sm transition group-hover:opacity-25"
                        style={{ backgroundColor: team.accentColor ?? '#facc15' }}
                    />
                )}
                
                {!isTeamActive && (
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                        ตกรอบ
                    </div>
                )}

                <div className="relative flex items-start justify-between gap-3">
                    <span className={[
                        'text-7xl drop-shadow-md select-none transform transition-transform duration-200',
                        isTeamActive ? 'group-hover:scale-110' : 'grayscale opacity-50'
                    ].join(' ')}>{team.flag ?? '🏆'}</span>
                    {isTeamActive && active && <CheckCircle2 className="text-emerald-500 drop-shadow-sm" size={24} />}
                </div>

                <div className="relative mt-5">
                    <h3 className={[
                        'text-2xl font-black',
                        isTeamActive ? 'text-slate-800' : 'text-slate-400'
                    ].join(' ')}>{team.name}</h3>
                    {team.nameEn && (
                        <p className={[
                            'mt-1 text-xs font-semibold uppercase tracking-[0.16em]',
                            isTeamActive ? 'text-slate-400' : 'text-slate-400/60'
                        ].join(' ')}>{team.nameEn}</p>
                    )}
                    
                    <p className={[
                        'mt-4 text-xs font-semibold',
                        isTeamActive ? 'text-slate-500' : 'text-slate-400/80'
                    ].join(' ')}>{count} คนเลือกทีมนี้</p>

                    {/* Live prize split indicator */}
                    {closed && isTeamActive && count > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            💰 ลุ้นส่วนแบ่งคนละ {formatPrize(prizeShare)} บ.
                        </div>
                    )}

                    {pickers.length > 0 && (
                        <div className="mt-4 flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {visiblePickers.map(picker => (
                                    <AvatarBubble
                                        key={picker.id}
                                        picker={picker}
                                        className={[
                                            'h-8 w-8 border-2 border-white',
                                            isTeamActive ? '' : 'grayscale opacity-40'
                                        ].join(' ')}
                                    />
                                ))}
                                {hiddenCount > 0 && (
                                    <div className={[
                                        'flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black shadow-md',
                                        isTeamActive 
                                            ? 'bg-yellow-300 text-[#30040b] shadow-black/10' 
                                            : 'bg-slate-200 text-slate-400 shadow-none opacity-50'
                                    ].join(' ')}>
                                        +{hiddenCount}
                                    </div>
                                )}
                            </div>
                            <span className={[
                                'text-xs font-semibold',
                                isTeamActive ? 'text-slate-400' : 'text-slate-400/60'
                            ].join(' ')}>กดดูรายชื่อ</span>
                        </div>
                    )}
                </div>
            </button>
        )
    }

    async function submitPrediction() {
        if (!pendingTeamId || saving) return
        setSaving(true)
        setError(null)
        setMessage(null)

        const previousTeamId = selectedTeamId
        const wasFirstPick = !selectedTeamId

        try {
            const res = await fetch('/api/events/world-cup/prediction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: pendingTeamId }),
            })
            const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null
            if (!res.ok || !data?.ok) {
                throw new Error(data?.error ?? 'บันทึกคำตอบไม่สำเร็จ')
            }

            setSelectedTeamId(pendingTeamId)
            setTeamStats(current => {
                const next = { ...current }
                if (previousTeamId && previousTeamId !== pendingTeamId) {
                    next[previousTeamId] = Math.max(0, (next[previousTeamId] ?? 0) - 1)
                }
                if (previousTeamId !== pendingTeamId) {
                    next[pendingTeamId] = (next[pendingTeamId] ?? 0) + 1
                }
                return next
            })
            if (wasFirstPick) setPredictionCount(count => count + 1)
            setTeamPickers(current => {
                const next = Object.fromEntries(
                    Object.entries(current).map(([teamId, pickers]) => [
                        teamId,
                        pickers.filter(picker => picker.id !== currentPicker.id),
                    ]),
                ) as Record<string, PickerData[]>
                next[pendingTeamId] = [...(next[pendingTeamId] ?? []), currentPicker]
                return next
            })
            setMessage('บันทึกคำทายเรียบร้อยแล้ว')
            setPendingTeamId(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'บันทึกคำตอบไม่สำเร็จ')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl pb-10">
            {/* KV Image above the card */}
            <div className="mb-8 flex justify-center">
                <div className="w-full max-w-[480px] overflow-hidden rounded-[2.1rem] border border-white/15 bg-black/20 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/events/world-cup-kv.jpg" alt="EBCI World Cup KV" className="w-full h-auto object-cover" />
                </div>
            </div>

            <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#25050b] shadow-2xl shadow-black/25">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,.26),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(250,204,21,.18),transparent_24%),linear-gradient(135deg,rgba(102,15,28,.96),rgba(9,35,23,.94)_55%,rgba(63,8,18,.98))]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:56px_56px]" />
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/15" />
                <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

                <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_.95fr] lg:p-10">
                    <div className="flex min-h-[520px] flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-emerald-200">
                                <Sparkles size={16} />
                                EBCI World Cup Event
                            </div>
                            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                                {event.title}
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                                {event.subtitle}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-yellow-300/25 bg-yellow-300/10 p-5 text-white">
                                <Trophy className="mb-4 text-yellow-200" />
                                <p className="text-sm text-white/55">เงินรางวัล</p>
                                <p className="mt-1 text-3xl font-black text-yellow-200">{formatPrize(event.prizeAmount)} บาท</p>
                            </div>
                            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white">
                                <Users className="mb-4 text-emerald-200" />
                                <p className="text-sm text-white/55">ส่งคำตอบแล้ว</p>
                                <p className="mt-1 text-3xl font-black">{predictionCount} คน</p>
                            </div>
                            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white">
                                <Clock className="mb-4 text-sky-200" />
                                <p className="text-sm text-white/55">ปิดรับ</p>
                                <p className="mt-1 text-base font-bold leading-7">{formatThaiDateTime(event.closesAt)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-white/15 bg-black/28 p-4 shadow-xl shadow-black/20 backdrop-blur">
                        <div className="rounded-[1.4rem] border border-white/12 bg-white/10 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200/80">Player</p>
                            <h2 className="mt-2 text-2xl font-black text-white">{employee.name}</h2>
                            <p className="mt-2 text-sm leading-6 text-white/60">
                                {[employee.code, employee.department, employee.position].filter(Boolean).join(' · ')}
                            </p>
                            {selectedTeam ? (
                                <div className={[
                                    'mt-5 rounded-2xl border p-4 transition-all duration-150',
                                    selectedTeam.isActive
                                        ? 'border-emerald-300/30 bg-emerald-300/10'
                                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                                ].join(' ')}>
                                    <p className="text-sm font-semibold text-white">คำทายของคุณตอนนี้</p>
                                    <p className="mt-1 text-2xl font-black text-white">
                                        <span className="mr-2 text-3xl">{selectedTeam.flag}</span>
                                        {selectedTeam.name}
                                    </p>
                                    {!selectedTeam.isActive && (
                                        <p className="mt-2 text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                            <X size={14} className="shrink-0" />
                                            ทีมนี้ตกรอบแล้ว (คุณตกรอบลุ้นรางวัล 😢)
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-4 text-yellow-100">
                                    ยังไม่ได้ส่งคำตอบ เลือกทีมด้านล่างแล้วกดยืนยัน
                                </div>
                            )}
                        </div>

                        {message && (
                            <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/12 px-4 py-3 text-sm font-bold text-emerald-100">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-50">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur sm:p-7">
                <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200/80">Champion Pick</p>
                        <h2 className="mt-1 text-2xl font-black text-white">เลือกทีมที่คิดว่าจะได้แชมป์</h2>
                    </div>
                    <p className="text-sm text-white/55">
                        {closed ? 'ปิดรับคำตอบแล้ว' : 'เปลี่ยนคำตอบได้จนกว่าจะปิดรับ'}
                    </p>
                </div>

                {closed ? (
                    <div className="space-y-10">
                        {/* Remaining Contenders */}
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <h3 className="text-lg font-black text-white">ผู้ที่ยังอยู่ในเส้นทางลุ้นรางวัล ({activeTeams.length} ทีม)</h3>
                            </div>
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                {activeTeams.map(team => renderTeamCard(team, true))}
                            </div>
                        </div>

                        {/* Eliminated Teams */}
                        {eliminatedTeams.length > 0 && (
                            <div className="pt-8 border-t border-white/10">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                                    <h3 className="text-lg font-black text-white/55">ตกรอบไปแล้ว ({eliminatedTeams.length} ทีม)</h3>
                                </div>
                                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                    {eliminatedTeams.map(team => renderTeamCard(team, false))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                        {teams.map(team => renderTeamCard(team, true))}
                    </div>
                )}
            </section>

            <section className="mt-6 rounded-[2rem] border border-yellow-300/20 bg-gradient-to-br from-yellow-300/12 via-white/8 to-emerald-300/10 p-5 shadow-xl shadow-black/10 backdrop-blur sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200/80">Event Rules</p>
                        <h2 className="mt-2 text-2xl font-black text-white">กติกาการทายแชมป์</h2>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300/10 px-4 py-2 text-sm font-black text-yellow-100">
                        <Clock size={16} />
                        ปิดรับ {formatThaiDateTime(event.closesAt)}
                    </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm leading-7 text-white/75 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">1. เลือกได้คนละ 1 ทีม</p>
                        <p className="mt-1 text-xs">ให้เลือกทีมที่คิดว่าจะได้แชมป์ฟุตบอลโลก 2026 เพียงทีมเดียวต่อคน</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">2. เปลี่ยนทีมได้ก่อนปิดรับ</p>
                        <p className="mt-1 text-xs">สามารถเปลี่ยนคำตอบได้จนถึงเวลา 20:00 น. วันที่ 10 กรกฎาคม 2026</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">3. หลังปิดรับจะล็อกคำตอบ</p>
                        <p className="mt-1 text-xs">หลังเวลา 20:00 น. วันที่ 10 กรกฎาคม 2026 จะไม่สามารถเปลี่ยนทีมได้แล้ว</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                        <p className="font-black text-yellow-300">4. รางวัลกิจกรรม 3,000 บาท</p>
                        <ul className="mt-1 list-disc pl-4 text-xs text-yellow-100/90 leading-6">
                            <li>ทายถูกคนเดียว รับเต็ม 3,000 บาท</li>
                            <li>ทายถูกหลายคน หารแบ่งรางวัลเท่าๆ กัน</li>
                            <li>ไม่มีใครทายถูกเลย หารเฉลี่ยแบ่งเท่ากันทุกคนที่ส่งคำทาย</li>
                        </ul>
                    </div>
                </div>
            </section>

            {pendingTeam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-[#3a0711] shadow-2xl shadow-black/40">
                        <div className="relative p-6">
                            <button
                                type="button"
                                onClick={() => setPendingTeamId(null)}
                                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-300/15 text-4xl">
                                {pendingTeam.flag}
                            </div>
                            <h3 className="mt-5 text-3xl font-black text-white">ยืนยันคำทาย</h3>
                            <p className="mt-3 text-white/68">
                                คุณต้องการเลือก <span className="font-black text-yellow-200">{pendingTeam.name}</span> เป็นแชมป์ฟุตบอลโลก 2026 ใช่ไหม
                            </p>
                            {pendingPickers.length > 0 && (
                                <div className="mt-5 rounded-2xl border border-white/12 bg-white/8 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">คนที่เลือกทีมนี้ตอนนี้</p>
                                    <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
                                        {pendingPickers.map(picker => (
                                            <div key={picker.id} className="flex items-center gap-3 rounded-2xl bg-white/8 p-2">
                                                <AvatarBubble picker={picker} className="h-10 w-10" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-white">{picker.name}</p>
                                                    {picker.employeeCode && (
                                                        <p className="text-xs font-semibold text-white/45">{picker.employeeCode}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPendingTeamId(null)}
                                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-black text-white/80 hover:bg-white/15"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={submitPrediction}
                                    disabled={saving}
                                    className="rounded-2xl bg-yellow-400 px-4 py-3 font-black text-[#30040b] shadow-lg shadow-yellow-500/20 hover:bg-yellow-300 disabled:opacity-70"
                                >
                                    {saving ? <Loader2 className="mx-auto animate-spin" /> : 'ยืนยัน'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
