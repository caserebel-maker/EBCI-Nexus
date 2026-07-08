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
    seedOrder: number
}

type Props = {
    event: EventData
    employee: EmployeeData
    teams: TeamData[]
    initialPredictionTeamId: string | null
    totalPredictions: number
    nonPredictors: PickerData[]
}

function formatThaiDateTime(value: string | null): string {
    if (!value) return 'ยังไม่กำหนดเวลาปิดรับ'
    const date = new Date(value)
    const dateStr = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
    }).format(date)

    const timeFormatter = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
    const parts = timeFormatter.formatToParts(date)
    const hours = parts.find(p => p.type === 'hour')?.value ?? '00'
    const minutes = parts.find(p => p.type === 'minute')?.value ?? '00'

    return `${dateStr} เวลา ${hours}.${minutes} น.`
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
    nonPredictors,
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
    const [showNonPredictorsModal, setShowNonPredictorsModal] = useState(false)
    const [activeUsersCount, setActiveUsersCount] = useState<number>(1)

    useEffect(() => {
        const fetchActiveCount = async () => {
            try {
                const res = await fetch('/api/portal/active-count?path=/portal/events/world-cup')
                const data = await res.json()
                if (typeof data.activeCount === 'number') {
                    setActiveUsersCount(data.activeCount)
                }
            } catch (e) {
                console.error('Error fetching active count:', e)
            }
        }
        fetchActiveCount()
        const interval = setInterval(fetchActiveCount, 15000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const main = document.querySelector('main')
        if (main) {
            const shellContainer = (main.closest('.bg-brand-gradient') as HTMLElement) || (main.parentElement as HTMLElement)
            const contentDiv = main.querySelector('.overflow-y-auto') as HTMLElement

            let originalShellBg = ''
            let originalShellBgSize = ''
            let originalContentBg = ''
            let originalContentBgSize = ''

            if (shellContainer) {
                originalShellBg = shellContainer.style.background
                originalShellBgSize = shellContainer.style.backgroundSize

                shellContainer.style.background = "linear-gradient(rgba(4, 47, 31, 0.65), rgba(4, 47, 31, 0.8)), url('/events/world-cup-bg.jpg') no-repeat center center fixed"
                shellContainer.style.backgroundSize = 'cover'
            }

            if (contentDiv) {
                originalContentBg = contentDiv.style.background
                originalContentBgSize = contentDiv.style.backgroundSize

                contentDiv.style.background = "linear-gradient(rgba(4, 47, 31, 0.65), rgba(4, 47, 31, 0.8)), url('/events/world-cup-bg.jpg') no-repeat center center fixed"
                contentDiv.style.backgroundSize = 'cover'
            }

            return () => {
                if (shellContainer) {
                    shellContainer.style.background = originalShellBg
                    shellContainer.style.backgroundSize = originalShellBgSize
                }
                if (contentDiv) {
                    contentDiv.style.background = originalContentBg
                    contentDiv.style.backgroundSize = originalContentBgSize
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

    const getTeamBySeed = (seed: number) => teams.find(t => t.seedOrder === seed)

    const matchups = useMemo(() => [
        {
            id: 1,
            title: 'คู่ที่ 1',
            team1: getTeamBySeed(10), // France
            team2: getTeamBySeed(20), // Morocco
        },
        {
            id: 2,
            title: 'คู่ที่ 2',
            team1: getTeamBySeed(40), // Belgium
            team2: getTeamBySeed(30), // Spain
        },
        {
            id: 3,
            title: 'คู่ที่ 3',
            team1: getTeamBySeed(60), // England
            team2: getTeamBySeed(50), // Norway
        },
        {
            id: 4,
            title: 'คู่ที่ 4',
            team1: getTeamBySeed(70), // Argentina
            team2: getTeamBySeed(80), // Switzerland
        },
    ], [teams])

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
                    'group relative overflow-hidden rounded-[1.8rem] border p-3.5 text-left transition-all duration-150 w-full',
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
                        'text-5xl drop-shadow-md select-none transform transition-transform duration-200',
                        isTeamActive ? 'group-hover:scale-110' : 'grayscale opacity-50'
                    ].join(' ')}>{team.flag ?? '🏆'}</span>
                    {isTeamActive && active && <CheckCircle2 className="text-emerald-500 drop-shadow-sm" size={18} />}
                </div>

                <div className="relative mt-2.5">
                    <h3 className={[
                        'text-lg font-black leading-tight truncate',
                        isTeamActive ? 'text-slate-800' : 'text-slate-400'
                    ].join(' ')}>{team.name}</h3>
                    {team.nameEn && (
                        <p className={[
                            'mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] truncate',
                            isTeamActive ? 'text-slate-400' : 'text-slate-400/60'
                        ].join(' ')}>{team.nameEn}</p>
                    )}
                    
                    <p className={[
                        'mt-2 text-[11px] font-bold leading-none',
                        isTeamActive ? 'text-slate-500' : 'text-slate-400/80'
                    ].join(' ')}>{count} คนเลือกทีมนี้</p>

                    {/* Live prize split indicator */}
                    {closed && isTeamActive && count > 0 && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200/50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            💰 ลุ้น {formatPrize(prizeShare)} บ.
                        </div>
                    )}

                    {pickers.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <div className="flex -space-x-1.5">
                                {visiblePickers.map(picker => (
                                    <AvatarBubble
                                        key={picker.id}
                                        picker={picker}
                                        className={[
                                            'h-6 w-6 border border-white',
                                            isTeamActive ? '' : 'grayscale opacity-40'
                                        ].join(' ')}
                                    />
                                ))}
                                {hiddenCount > 0 && (
                                    <div className={[
                                        'flex h-6 w-6 items-center justify-center rounded-full border border-white text-[8px] font-black shadow-md',
                                        isTeamActive 
                                            ? 'bg-yellow-300 text-[#30040b] shadow-black/10' 
                                            : 'bg-slate-200 text-slate-400 shadow-none opacity-50'
                                    ].join(' ')}>
                                        +{hiddenCount}
                                    </div>
                                )}
                            </div>
                            <span className={[
                                'text-[10px] font-bold leading-none',
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
            <div className="mb-8 flex justify-center px-3 sm:px-0">
                {/* Mobile: 1:1 image */}
                <div className="block sm:hidden w-full max-w-[440px] overflow-hidden rounded-[1.8rem] border border-white/15 bg-black/20 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/events/world-cup-kv.jpg" alt="EBCI World Cup KV Mobile" className="w-full h-auto object-cover" />
                </div>
                {/* Desktop: 16:9 image */}
                <div className="hidden sm:block w-full max-w-[860px] overflow-hidden rounded-[2rem] border border-white/15 bg-black/20 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/events/world-cup-kv-169.jpg" alt="EBCI World Cup KV Desktop" className="w-full h-auto object-cover" />
                </div>
            </div>

            <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#25050b] shadow-2xl shadow-black/25">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,.26),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(250,204,21,.18),transparent_24%),linear-gradient(135deg,rgba(102,15,28,.96),rgba(9,35,23,.94)_55%,rgba(63,8,18,.98))]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:56px_56px]" />
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/15" />
                <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

                <div className="relative grid gap-8 p-3 sm:p-8 lg:grid-cols-[1.05fr_.95fr] lg:p-10">
                    <div className="flex min-h-[520px] flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-emerald-200">
                                    <Sparkles size={16} />
                                    EBCI World Cup Event
                                </div>
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/15 px-3 py-1.5 text-xs font-black tracking-wide text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    มี {activeUsersCount} คนกำลังดูหน้านี้อยู่
                                </div>
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
                                <div className="mt-1 flex items-baseline justify-between">
                                    <p className="text-3xl font-black">{predictionCount} คน</p>
                                    {nonPredictors.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowNonPredictorsModal(true)}
                                            className="text-xs font-bold text-yellow-300 hover:text-yellow-200 hover:underline flex items-center gap-1 active:scale-95 transition-all"
                                        >
                                            ยังไม่ทาย ({nonPredictors.length})
                                        </button>
                                    )}
                                </div>
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

            <section className="mt-6 rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-xl shadow-black/10 backdrop-blur sm:p-7">
                <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200/80">Champion Pick</p>
                        <h2 className="mt-1 text-2xl font-black text-white">ตารางการแข่งขันและเลือกทายแชมป์ (รอบ 8 ทีม)</h2>
                    </div>
                    {!closed ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-400 px-3.5 py-1.5 text-xs font-black text-[#1a0004] shadow-[0_0_15px_rgba(250,204,21,0.45)] border border-yellow-300 animate-pulse select-none shrink-0">
                            🔥 เปลี่ยนคำตอบได้จนกว่าจะปิดรับ
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-black text-white/45 border border-white/5 select-none shrink-0">
                            🔒 ปิดรับคำตอบแล้ว
                        </span>
                    )}
                </div>

                {/* Desktop Bracket (lg screens and above) */}
                <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] gap-x-20 items-stretch relative py-6">
                    <style>{`
                        @keyframes bracket-flow-left {
                            from { stroke-dashoffset: 20; }
                            to { stroke-dashoffset: 0; }
                        }
                        @keyframes bracket-flow-right {
                            from { stroke-dashoffset: -20; }
                            to { stroke-dashoffset: 0; }
                        }
                        .animate-flow-left {
                            stroke-dasharray: 6 4;
                            animation: bracket-flow-left 1.5s linear infinite;
                        }
                        .animate-flow-right {
                            stroke-dasharray: 6 4;
                            animation: bracket-flow-right 1.5s linear infinite;
                        }
                    `}</style>

                    {/* Left Side Matchups (France/Morocco & Belgium/Spain) */}
                    <div className="flex flex-col justify-around gap-16 py-4">
                        {/* Match 1 */}
                        <div className="relative flex flex-col gap-5 p-5 rounded-[2.2rem] border border-white/5 bg-black/15">
                            <div className="absolute right-[-5.25rem] top-1/2 -translate-y-1/2 w-20 h-[190px] pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 80 190" preserveAspectRatio="none">
                                    <path d="M 0 35 H 40 V 155 H 0 M 40 95 H 80" stroke="rgba(250,204,21,0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round" className="animate-flow-left" />
                                </svg>
                            </div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300/80">คู่ที่ 1 (Match 1)</div>
                            {matchups[0].team1 && renderTeamCard(matchups[0].team1, matchups[0].team1.isActive)}
                            {matchups[0].team2 && renderTeamCard(matchups[0].team2, matchups[0].team2.isActive)}
                        </div>

                        {/* Match 2 */}
                        <div className="relative flex flex-col gap-5 p-5 rounded-[2.2rem] border border-white/5 bg-black/15">
                            <div className="absolute right-[-5.25rem] top-1/2 -translate-y-1/2 w-20 h-[190px] pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 80 190" preserveAspectRatio="none">
                                    <path d="M 0 35 H 40 V 155 H 0 M 40 95 H 80" stroke="rgba(250,204,21,0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round" className="animate-flow-left" />
                                </svg>
                            </div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300/80">คู่ที่ 2 (Match 2)</div>
                            {matchups[1].team1 && renderTeamCard(matchups[1].team1, matchups[1].team1.isActive)}
                            {matchups[1].team2 && renderTeamCard(matchups[1].team2, matchups[1].team2.isActive)}
                        </div>
                    </div>

                    {/* Middle Trophy Column */}
                    <div className="flex flex-col items-center justify-center px-4 self-center relative w-64 min-h-[500px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.15)_0%,transparent_70%)] animate-pulse" />
                        <div className="relative flex flex-col items-center">
                            <div className="w-44 h-44 rounded-full border-2 border-yellow-400/30 bg-black/45 overflow-hidden flex items-center justify-center p-3 shadow-2xl shadow-yellow-400/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src="/events/world-cup-trophy.jpg" 
                                    alt="FIFA World Cup Trophy" 
                                    className="w-full h-full object-cover rounded-full" 
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const fallback = document.getElementById('trophy-fallback')
                                        if (fallback) fallback.style.display = 'flex'
                                    }}
                                />
                                <div id="trophy-fallback" className="hidden flex-col items-center text-yellow-300">
                                    <Trophy size={80} className="drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                                </div>
                            </div>
                            <span className="mt-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-1.5 text-xs font-black text-[#1a0004] shadow-lg shadow-yellow-500/20 tracking-wider">
                                รอบ 8 ทีมสุดท้าย
                            </span>
                            <div className="mt-4 text-center">
                                <h3 className="text-2xl font-black text-white tracking-wide">WORLD CUP 2026</h3>
                                <p className="mt-1 text-xs text-white/55 font-bold uppercase tracking-widest">ROAD TO CHAMPION</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side Matchups (England/Norway & Argentina/Switzerland) */}
                    <div className="flex flex-col justify-around gap-16 py-4">
                        {/* Match 3 */}
                        <div className="relative flex flex-col gap-5 p-5 rounded-[2.2rem] border border-white/5 bg-black/15">
                            <div className="absolute left-[-5.25rem] top-1/2 -translate-y-1/2 w-20 h-[190px] pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 80 190" preserveAspectRatio="none">
                                    <path d="M 80 35 H 40 V 155 H 80 M 40 95 H 0" stroke="rgba(250,204,21,0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round" className="animate-flow-right" />
                                </svg>
                            </div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300/80">คู่ที่ 3 (Match 3)</div>
                            {matchups[2].team1 && renderTeamCard(matchups[2].team1, matchups[2].team1.isActive)}
                            {matchups[2].team2 && renderTeamCard(matchups[2].team2, matchups[2].team2.isActive)}
                        </div>

                        {/* Match 4 */}
                        <div className="relative flex flex-col gap-5 p-5 rounded-[2.2rem] border border-white/5 bg-black/15">
                            <div className="absolute left-[-5.25rem] top-1/2 -translate-y-1/2 w-20 h-[190px] pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 80 190" preserveAspectRatio="none">
                                    <path d="M 80 35 H 40 V 155 H 80 M 40 95 H 0" stroke="rgba(250,204,21,0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round" className="animate-flow-right" />
                                </svg>
                            </div>
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300/80">คู่ที่ 4 (Match 4)</div>
                            {matchups[3].team1 && renderTeamCard(matchups[3].team1, matchups[3].team1.isActive)}
                            {matchups[3].team2 && renderTeamCard(matchups[3].team2, matchups[3].team2.isActive)}
                        </div>
                    </div>
                </div>

                {/* Mobile/Tablet Matchup View (lg screens and below) */}
                <div className="block lg:hidden space-y-8 py-4">
                    {matchups.map((match) => (
                        <div key={match.id} className="relative p-4 rounded-[2.5rem] border border-white/10 bg-black/20 shadow-xl">
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-yellow-300/80 mb-3">{match.title}</div>
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 relative">
                                {/* Horizontal connector line */}
                                <div className="absolute left-[30%] right-[30%] top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent pointer-events-none" />
                                
                                {/* Team 1 */}
                                <div className="w-full">
                                    {match.team1 && renderTeamCard(match.team1, match.team1.isActive)}
                                </div>

                                {/* Versus Badge */}
                                <div className="flex flex-col items-center justify-center relative w-10 h-full z-10">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-300/35 bg-[#30040b] text-[9px] font-black text-yellow-300 shadow-md shadow-black/30 select-none">
                                        VS
                                    </div>
                                </div>

                                {/* Team 2 */}
                                <div className="w-full">
                                    {match.team2 && renderTeamCard(match.team2, match.team2.isActive)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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

                <div className="mt-5 grid gap-3 text-sm leading-7 text-white/75 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">1. เลือกได้คนละ 1 ทีม</p>
                        <p className="mt-1 text-xs">ให้เลือกทีมที่คิดว่าจะได้แชมป์ฟุตบอลโลก 2026 เพียงทีมเดียวต่อคน</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">2. เปลี่ยนทีมได้ก่อนปิดรับ</p>
                        <p className="mt-1 text-xs">สามารถเปลี่ยนคำตอบได้จนถึงเวลา 20.00 น. วันที่ 10 กรกฎาคม 2026</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">3. หลังปิดรับจะล็อกคำตอบ</p>
                        <p className="mt-1 text-xs">หลังเวลา 20.00 น. วันที่ 10 กรกฎาคม 2026 จะไม่สามารถเปลี่ยนทีมได้แล้ว</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-black/18 p-4">
                        <p className="font-black text-white">4. สิทธิ์เข้าร่วมกิจกรรม</p>
                        <p className="mt-1 text-xs">ร่วมลุ้นทายผลได้เฉพาะพนักงานที่มีรหัสเข้าระบบ EBCI Nexus เท่านั้น</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                        <p className="font-black text-yellow-300">5. รางวัลกิจกรรม 3,000 บาท</p>
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

            {showNonPredictorsModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNonPredictorsModal(false)} />
                    <div className="relative w-full max-w-md overflow-hidden rounded-[2.1rem] border border-white/18 bg-[#1f0308] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button; cursor-pointer"
                            onClick={() => setShowNonPredictorsModal(false)}
                            className="absolute right-4 top-4 rounded-full p-2 text-white/55 hover:bg-white/10 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-300/15 text-4xl text-yellow-300">
                                <Users size={32} />
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-white">ยังไม่ได้ทายคำตอบ</h3>
                            <p className="mt-1 text-sm text-white/60">
                                มีทั้งหมด <span className="font-black text-yellow-200">{nonPredictors.length} คน</span> ที่ยังไม่ส่งคำทำนาย
                            </p>
                        </div>
                        <div className="mt-6 max-h-72 space-y-2 overflow-auto pr-1">
                            {nonPredictors.map(picker => (
                                <div key={picker.id} className="flex items-center gap-3 rounded-2xl bg-white/8 p-2.5">
                                    <AvatarBubble picker={picker} className="h-9 w-9" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-white">{picker.name}</p>
                                        {picker.employeeCode && (
                                            <p className="text-xs font-semibold text-white/45">รหัสพนักงาน: {picker.employeeCode}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowNonPredictorsModal(false)}
                            className="mt-6 w-full rounded-2xl border border-white/15 bg-white/10 py-3 font-black text-white/80 hover:bg-white/15"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
