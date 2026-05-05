'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MapPin, Users, Building, Home, HelpCircle, RefreshCw, Calendar, CheckCircle2, Clock, LogOut, MapPinOff, FileUp, AlertTriangle } from 'lucide-react'
import { todayBangkokKey } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { formatBangkokTime } from '@/lib/datetime'
import { getAttendanceForDate, type AttendanceStats, type AttendanceRecord } from './actions'

type FilterTab = 'all' | 'office' | 'wfh' | 'not-checked-in'

interface InitialData {
    stats: AttendanceStats
    records: AttendanceRecord[]
    fetchedAt: string
}

interface Props {
    initialDate: string
    initialData: InitialData | null
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

// Mobile check-ins are stored as UTC wall-clock (from new Date().toISOString()),
// so hand the raw value through the Bangkok-aware formatter.
function formatTime(iso: string) {
    return formatBangkokTime(iso)
}

function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (seconds < 60) return 'เพิ่งอัปเดต'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    const hours = Math.floor(minutes / 60)
    return `${hours} ชั่วโมงที่แล้ว`
}

export function AttendanceView({ initialDate, initialData }: Props) {
    const [date, setDate] = useState(initialDate)
    const [data, setData] = useState<InitialData | null>(initialData)
    const [filter, setFilter] = useState<FilterTab>('all')
    const [isPending, startTransition] = useTransition()
    const [nowTick, setNowTick] = useState(0) // force re-render for "X minutes ago"

    // Update "time ago" text every 30 seconds
    useState(() => {
        const interval = setInterval(() => setNowTick((n) => n + 1), 30000)
        return () => clearInterval(interval)
    })

    const refresh = () => {
        startTransition(async () => {
            const result = await getAttendanceForDate(date)
            if (result.success) {
                setData({
                    stats: result.stats,
                    records: result.records,
                    fetchedAt: result.fetchedAt,
                })
            }
        })
    }

    const handleDateChange = (newDate: string) => {
        setDate(newDate)
        startTransition(async () => {
            const result = await getAttendanceForDate(newDate)
            if (result.success) {
                setData({
                    stats: result.stats,
                    records: result.records,
                    fetchedAt: result.fetchedAt,
                })
            }
        })
    }

    const stats = data?.stats ?? { totalEmployees: 0, officeCount: 0, wfhCount: 0, offsiteCount: 0, notCheckedInCount: 0 }
    const records = data?.records ?? []

    const filteredRecords = records.filter((r) => {
        if (filter === 'all') return true
        if (filter === 'not-checked-in') return !r.checkin
        if (filter === 'office') return r.checkin?.type === 'office'
        if (filter === 'wfh') return r.checkin?.type === 'wfh'
        return true
    })

    // Quick date presets — Bangkok-local so users in Bangkok between
    // 00:00–06:59 don't see yesterday's date as "today".
    const presetToday = todayBangkokKey()
    const yesterdayDate = new Date(Date.now() - 86400000)
    const presetYesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <MapPin size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">การเข้างาน</h1>
                    <p className="text-sm text-white/50">{formatThaiDate(date)}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {data?.fetchedAt && (
                        <span key={nowTick} className="text-xs text-white/40 hidden sm:inline">
                            อัปเดต {timeAgo(data.fetchedAt)}
                        </span>
                    )}
                    <Link
                        href="/hradmin/attendance/anomalies"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-rose-300/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 transition-all"
                    >
                        <AlertTriangle size={14} />
                        <span className="hidden sm:inline">ความผิดปกติ</span>
                    </Link>
                    <Link
                        href="/hradmin/attendance/import"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition-all"
                    >
                        <FileUp size={14} />
                        <span className="hidden sm:inline">นำเข้า CSV</span>
                    </Link>
                    <button
                        onClick={refresh}
                        disabled={isPending}
                        className={cn(
                            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                            isPending
                                ? "bg-white/5 text-white/40 border-white/5"
                                : "bg-white/10 hover:bg-white/15 text-white border-white/15"
                        )}
                    >
                        <RefreshCw size={14} className={cn(isPending && "animate-spin")} />
                        รีเฟรช
                    </button>
                </div>
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-2 flex-wrap">
                <Calendar size={14} className="text-white/40" />
                <button
                    onClick={() => handleDateChange(presetToday)}
                    className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-semibold transition-all",
                        date === presetToday
                            ? "bg-[#882136] text-white shadow-lg shadow-[#882136]/40"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                    )}
                >
                    วันนี้
                </button>
                <button
                    onClick={() => handleDateChange(presetYesterday)}
                    className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-semibold transition-all",
                        date === presetYesterday
                            ? "bg-[#882136] text-white shadow-lg shadow-[#882136]/40"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                    )}
                >
                    เมื่อวาน
                </button>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Users} label="พนักงานทั้งหมด" value={stats.totalEmployees} color="text-white/70" bg="bg-white/5" border="border-white/10" />
                <StatCard icon={Building} label="เข้าออฟฟิศ" value={stats.officeCount} color="text-emerald-300" bg="bg-emerald-500/10" border="border-emerald-500/30" />
                <StatCard icon={Home} label="WFH" value={stats.wfhCount} color="text-blue-300" bg="bg-blue-500/10" border="border-blue-500/30" />
                <StatCard icon={HelpCircle} label="ยังไม่เช็คอิน" value={stats.notCheckedInCount} color="text-amber-300" bg="bg-amber-500/10" border="border-amber-500/30" />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <FilterTabBtn active={filter === 'all'} onClick={() => setFilter('all')} count={records.length}>
                    ทั้งหมด
                </FilterTabBtn>
                <FilterTabBtn active={filter === 'office'} onClick={() => setFilter('office')} count={stats.officeCount}>
                    🏢 ออฟฟิศ
                </FilterTabBtn>
                <FilterTabBtn active={filter === 'wfh'} onClick={() => setFilter('wfh')} count={stats.wfhCount}>
                    🏠 WFH
                </FilterTabBtn>
                <FilterTabBtn active={filter === 'not-checked-in'} onClick={() => setFilter('not-checked-in')} count={stats.notCheckedInCount}>
                    ❓ ยังไม่เช็คอิน
                </FilterTabBtn>
            </div>

            {/* Employee list */}
            <div className="space-y-2">
                {filteredRecords.length === 0 && (
                    <div className="text-center py-16 text-white/40">
                        <MapPinOff size={48} className="mx-auto mb-4 opacity-30" />
                        <p>ไม่มีข้อมูลในหมวดนี้</p>
                    </div>
                )}
                {filteredRecords.map((r) => (
                    <EmployeeRow key={r.employeeId} record={r} />
                ))}
            </div>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color, bg, border }: any) {
    return (
        <div className={cn("rounded-2xl p-4 border", bg, border)}>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={color} />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-white/50">{label}</span>
            </div>
            <div className={cn("text-3xl font-bold", color)}>{value}</div>
        </div>
    )
}

function FilterTabBtn({ active, onClick, count, children }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "text-xs px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5",
                active
                    ? "bg-[#882136] text-white shadow-lg shadow-[#882136]/40"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
            )}
        >
            {children}
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
        </button>
    )
}

function EmployeeRow({ record }: { record: AttendanceRecord }) {
    const c = record.checkin
    const isCheckedIn = !!c
    const isWorking = c && !c.checked_out_at
    const displayName = record.nickname ? `${record.employeeName} (${record.nickname})` : record.employeeName

    return (
        <div className="rounded-xl p-3 border border-white/10 bg-white/5 flex items-center gap-3" style={{ backdropFilter: 'blur(8px)' }}>
            {/* Avatar */}
            {record.photoUrl ? (
                <img src={record.photoUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/10" />
            ) : (
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0 border border-white/10">
                    <Users size={16} />
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            !isCheckedIn && "bg-amber-400",
                            isWorking && "bg-emerald-400 animate-pulse",
                            isCheckedIn && !isWorking && "bg-white/30"
                        )}
                    />
                    <p className="font-semibold text-white text-sm truncate">{displayName}</p>
                </div>
                <p className="text-xs text-white/50 truncate mt-0.5">{record.department ?? 'ไม่ระบุฝ่าย'} · {record.position ?? 'ไม่ระบุตำแหน่ง'}</p>
            </div>

            {/* Checkin status */}
            <div className="text-right shrink-0">
                {!isCheckedIn && (
                    <span className="text-xs text-amber-300 font-semibold">ยังไม่เช็คอิน</span>
                )}
                {c && (
                    <>
                        <div className="flex items-center gap-1 justify-end text-xs">
                            {c.type === 'office' ? (
                                <><Building size={12} className="text-emerald-300" /><span className="text-emerald-300 font-semibold">ออฟฟิศ</span></>
                            ) : c.type === 'wfh' ? (
                                <><Home size={12} className="text-blue-300" /><span className="text-blue-300 font-semibold">WFH</span></>
                            ) : (
                                <span className="text-white/50">{c.type}</span>
                            )}
                        </div>
                        <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1 justify-end">
                            <Clock size={10} />
                            {formatTime(c.checked_in_at)}
                            {c.checked_out_at && (
                                <>
                                    <LogOut size={10} className="ml-1" />
                                    {formatTime(c.checked_out_at)}
                                </>
                            )}
                        </div>
                        {c.type === 'office' && c.distance_from_office !== null && (
                            <div className="text-[10px] text-white/40 mt-0.5">
                                ห่าง {Math.round(c.distance_from_office)} ม.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
