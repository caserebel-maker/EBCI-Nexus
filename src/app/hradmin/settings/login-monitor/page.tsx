import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, CheckCircle2, Clock, Globe, Laptop, RefreshCw, Search, ShieldCheck, UserCheck, Users, UserX, Wifi } from 'lucide-react'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatBangkokDateTime, todayBangkokKey, formatBangkokTime } from '@/lib/datetime'
import { AutoRefresh } from './auto-refresh'

export const dynamic = 'force-dynamic'

type PageProps = {
    searchParams?: Promise<{ q?: string; filter?: string }>
}

type EmployeeRow = {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    email: string | null
    department: string | null
    position: string | null
    photo_url: string | null
    last_active_at: string | null
    last_active_path: string | null
}

type LoginAttemptRow = {
    email_lower: string
    success: boolean
    attempted_at: string
}

type MonitorRow = EmployeeRow & {
    displayName: string
    shortName: string
    emailLower: string | null
    photoUrl: string | null
    initials: string
    status: 'active' | 'idle' | 'offline'
    isOnline: boolean
    isActiveNow: boolean
    isIdle: boolean
    activeSecondsAgo: number
    activeMinutesAgo: number
    activePathThai: string
    wasActiveToday: boolean
    firstLoginToday: string | null
    lastLoginToday: string | null
    successCountToday: number
}

const EXCLUDED_EMPLOYEE_CODES = new Set([
    'TEST-ANT', // ANT — บัญชีทดสอบ
])

function formatPathThai(path: string | null): string {
    if (!path) return 'หน้าหลัก'
    if (path === '/' || path === '/portal' || path.startsWith('/portal/dashboard')) return 'หน้าหลัก'
    if (path.startsWith('/portal/checkin')) return 'เช็คอิน'
    if (path.startsWith('/portal/leave')) return 'ลางาน'
    if (path.startsWith('/portal/wfh')) return 'WFH'
    if (path.startsWith('/portal/payroll')) return 'สลิปเงินเดือน'
    if (path.startsWith('/portal/calendar')) return 'ปฏิทิน'
    if (path.startsWith('/portal/meeting-room')) return 'ห้องประชุม'
    if (path.startsWith('/portal/announcements')) return 'ข่าวสาร'
    if (path.startsWith('/portal/notifications')) return 'แจ้งเตือน'
    if (path.startsWith('/portal/profile')) return 'โปรไฟล์'
    if (path.startsWith('/hradmin/dashboard')) return 'HR แดชบอร์ด'
    if (path.startsWith('/hradmin/attendance')) return 'HR เข้างาน'
    if (path.startsWith('/hradmin/leave')) return 'HR การลา'
    if (path.startsWith('/hradmin/settings')) return 'ตั้งค่าระบบ'
    if (path.startsWith('/hradmin/reports')) return 'รายงาน'
    if (path.startsWith('/hradmin/employees')) return 'ข้อมูลพนักงาน'
    if (path.startsWith('/hradmin/payroll')) return 'HR เงินเดือน'
    return path.replace(/^\/(portal|hradmin)\//, '')
}

function employeeName(row: EmployeeRow): string {
    const fullName = [row.first_name_th, row.last_name_th].filter(Boolean).join(' ').trim()
    return row.nickname ? `${fullName} (${row.nickname})` : fullName || row.email || 'ไม่พบชื่อ'
}

function shortEmployeeName(row: EmployeeRow): string {
    return row.nickname || row.first_name_th || row.email?.split('@')[0] || '—'
}

function employeeInitials(row: EmployeeRow): string {
    const base = row.nickname || row.first_name_th || row.email || '?'
    return base.trim().slice(0, 2).toUpperCase()
}

function resolvePhotoUrl(photoUrl: string | null): string | null {
    if (!photoUrl) return null
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    return `${supabaseUrl}/storage/v1/object/public/employee-photos/${photoUrl}`
}

function sortRows(a: MonitorRow, b: MonitorRow) {
    // 1. Active now (0) -> Idle (1) -> Offline active today (2) -> Other (3)
    const priority = (row: MonitorRow) => {
        if (row.isActiveNow) return 0
        if (row.isIdle) return 1
        if (row.wasActiveToday) return 2
        return 3
    }
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa - pb

    // 2. Ordered by latest activity
    if (a.last_active_at && b.last_active_at) {
        return String(b.last_active_at).localeCompare(String(a.last_active_at))
    }
    // 3. Fallback by employee code
    return (a.employee_code ?? '').localeCompare(b.employee_code ?? '', 'th')
}

export default async function LiveActivityMonitorPage({ searchParams }: PageProps) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')

    const params = await searchParams
    const searchFilter = (params?.q ?? '').trim().toLowerCase()
    const statusFilter = (params?.filter ?? 'all').trim().toLowerCase()

    const todayDateStr = todayBangkokKey()
    const todayStartIso = `${todayDateStr}T00:00:00+07:00`
    const now = new Date()

    // 1. Load active employees
    const { data: employeeRows, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, email, department, position, photo_url, last_active_at, last_active_path')
        .eq('status', 'active')
        .order('employee_code', { ascending: true })

    if (employeeError) {
        throw new Error(`Load employees failed: ${employeeError.message}`)
    }

    const employees = ((employeeRows ?? []) as EmployeeRow[]).filter(employee => {
        const code = employee.employee_code?.trim().toUpperCase()
        return !code || !EXCLUDED_EMPLOYEE_CODES.has(code)
    })

    const emailLowers = employees
        .map(e => e.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))

    // 2. Load today's login attempts
    const { data: attemptRows } = emailLowers.length
        ? await supabaseAdmin
            .from('login_attempts')
            .select('email_lower, success, attempted_at')
            .in('email_lower', emailLowers)
            .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('attempted_at', { ascending: true })
        : { data: [] }

    const attempts = (attemptRows ?? []) as LoginAttemptRow[]
    const attemptsByEmail = new Map<string, LoginAttemptRow[]>()
    for (const attempt of attempts) {
        const key = attempt.email_lower.toLowerCase()
        const list = attemptsByEmail.get(key) ?? []
        list.push(attempt)
        attemptsByEmail.set(key, list)
    }

    // 3. Transform rows with 3-tier presence criteria:
    // - Active (กำลังใช้งาน): Heartbeat within last 5 minutes (300s)
    // - Idle (เปิดทิ้งไว้/พักหน้าจอ): Heartbeat between 5 and 15 minutes (300s - 900s)
    // - Offline (ออฟไลน์): No heartbeat for > 15 minutes (> 900s)
    const allRows: MonitorRow[] = employees.map(employee => {
        const emailLower = employee.email?.trim().toLowerCase() || null
        const personAttempts = emailLower ? attemptsByEmail.get(emailLower) ?? [] : []
        const successes = personAttempts.filter(a => a.success)

        const lastActive = employee.last_active_at ? new Date(employee.last_active_at) : null
        const diffSeconds = lastActive ? Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / 1000)) : Infinity
        const diffMinutes = Math.floor(diffSeconds / 60)

        // 3-tier presence thresholds
        const isActiveNow = diffSeconds <= 5 * 60
        const isIdle = !isActiveNow && diffSeconds <= 15 * 60
        const isOnline = isActiveNow || isIdle // in system (matches top navbar active-count!)
        const status: 'active' | 'idle' | 'offline' = isActiveNow ? 'active' : isIdle ? 'idle' : 'offline'
        const wasActiveToday = Boolean(lastActive && diffSeconds <= 24 * 60 * 60)

        return {
            ...employee,
            displayName: employeeName(employee),
            shortName: shortEmployeeName(employee),
            emailLower,
            photoUrl: resolvePhotoUrl(employee.photo_url),
            initials: employeeInitials(employee),
            status,
            isOnline,
            isActiveNow,
            isIdle,
            activeSecondsAgo: diffSeconds,
            activeMinutesAgo: diffMinutes,
            activePathThai: formatPathThai(employee.last_active_path),
            wasActiveToday,
            firstLoginToday: successes[0]?.attempted_at ?? null,
            lastLoginToday: successes.at(-1)?.attempted_at ?? null,
            successCountToday: successes.length,
        }
    }).sort(sortRows)

    // Filter rows if user typed a search or clicked status filter
    const rows = allRows.filter(r => {
        if (statusFilter === 'active' && !r.isActiveNow) return false
        if (statusFilter === 'idle' && !r.isIdle) return false
        if (statusFilter === 'online' && !r.isOnline) return false
        if (statusFilter === 'today' && !r.wasActiveToday) return false
        if (statusFilter === 'offline' && r.isOnline) return false

        if (searchFilter) {
            const matchName = r.displayName.toLowerCase().includes(searchFilter)
            const matchCode = (r.employee_code ?? '').toLowerCase().includes(searchFilter)
            const matchDept = (r.department ?? '').toLowerCase().includes(searchFilter)
            return matchName || matchCode || matchDept
        }
        return true
    })

    const totalEmployees = allRows.length
    const activeNowCount = allRows.filter(r => r.isActiveNow).length
    const idleCount = allRows.filter(r => r.isIdle).length
    const inSystemCount = activeNowCount + idleCount // Total in system (matches top bar!)
    const offlineCount = totalEmployees - inSystemCount
    const activeTodayCount = allRows.filter(r => r.wasActiveToday).length

    return (
        <main className="space-y-6">
            {/* Top Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200 shadow-sm shadow-emerald-950/40">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            <Activity size={13} className="text-emerald-300" />
                            Realtime Activity Monitor
                        </div>
                        <AutoRefresh />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white flex flex-wrap items-center gap-2.5">
                            ระบบติดตามการเข้าใช้งาน
                            <span className="text-sm sm:text-base font-bold text-emerald-300 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                อยู่ในระบบ {inSystemCount} คน
                            </span>
                            <span className="text-xs font-semibold text-white/70 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                                🟢 ใช้งานอยู่ {activeNowCount} · 🟡 เปิดทิ้งไว้ {idleCount}
                            </span>
                        </h1>
                        <p className="mt-1 text-sm text-white/65 max-w-2xl leading-relaxed">
                            ระบบตรวจจับการใช้งาน EBCI Nexus แบบ Realtime · <strong>🟢 รูปสีสด = ใช้งานต่อเนื่อง</strong> (ภายใน 5 นาที) · <strong>🟡 รูปสีขอบเหลือง = เปิดจอทิ้งไว้</strong> (5-15 นาที) · <strong>⚫ รูปขาวดำ = ออฟไลน์</strong> (เกิน 15 นาที)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href="/hradmin/settings/login-monitor"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-bold text-white hover:bg-white/15 transition-all"
                    >
                        <RefreshCw size={14} />
                        รีเฟรชข้อมูล
                    </Link>
                </div>
            </div>

            {/* Metrics Cards */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-4 text-emerald-100 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                        <span>กำลังใช้งานอยู่</span>
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300 animate-pulse" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-200">{activeNowCount}</span>
                        <span className="text-sm font-semibold opacity-75">คน (รูปสีสด)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-300/70">สัญญาณภายใน 5 นาทีล่าสุด</p>
                </div>

                <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 p-4 text-amber-100 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                        <span>เปิดจอทิ้งไว้</span>
                        <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-300" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-amber-200">{idleCount}</span>
                        <span className="text-sm font-semibold opacity-75">คน (Idle)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-300/70">สัญญาณ 5-15 นาทีล่าสุด</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 text-white/80 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-60 text-xs font-bold uppercase tracking-wider">
                        <span>ออฟไลน์</span>
                        <UserX size={14} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-white/90">{offlineCount}</span>
                        <span className="text-sm font-semibold opacity-75">คน (รูปขาวดำ)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">ไม่ได้ใช้งานเกิน 15 นาที</p>
                </div>

                <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 p-4 text-cyan-100 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                        <span>เคยเข้าใช้วันนี้</span>
                        <Laptop size={14} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-cyan-200">{activeTodayCount}</span>
                        <span className="text-sm font-semibold opacity-75">คน</span>
                    </div>
                    <p className="mt-1 text-[11px] text-cyan-300/70">มีบันทึกการใช้งานวันนี้</p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-4 text-purple-100 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                        <span>พนักงานทั้งหมด</span>
                        <Users size={14} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-purple-200">{totalEmployees}</span>
                        <span className="text-sm font-semibold opacity-75">คน</span>
                    </div>
                    <p className="mt-1 text-[11px] text-purple-300/70">พนักงานสถานะ Active</p>
                </div>
            </section>

            {/* Photo Grid Section (ภาพรวมแบบรูปพนักงาน) */}
            <section className="rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 sm:p-5 shadow-2xl shadow-black/30">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <span>ภาพรวมพนักงานทุกคน</span>
                            {inSystemCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    อยู่ในระบบ {inSystemCount} คน
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-white/55 mt-0.5">
                            🟢 <strong>รูปสีสดใส</strong> = กำลังใช้งาน (≤5 นาที) · 🟡 <strong>รูปสีขอบเหลือง</strong> = เปิดทิ้งไว้ (5-15 นาที) · ⚫ <strong>รูปขาวดำ</strong> = ออฟไลน์ (&gt;15 นาที)
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <Link
                            href="/hradmin/settings/login-monitor"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'all' ? 'bg-white/20 border-white/30 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            ทั้งหมด ({totalEmployees})
                        </Link>
                        <Link
                            href="/hradmin/settings/login-monitor?filter=active"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'active' ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            🟢 ใช้งานอยู่ ({activeNowCount})
                        </Link>
                        <Link
                            href="/hradmin/settings/login-monitor?filter=idle"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'idle' ? 'bg-amber-500/25 border-amber-400/40 text-amber-200 font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            🟡 เปิดทิ้งไว้ ({idleCount})
                        </Link>
                        <Link
                            href="/hradmin/settings/login-monitor?filter=online"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'online' ? 'bg-teal-500/25 border-teal-400/40 text-teal-200 font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            🌐 ในระบบทั้งหมด ({inSystemCount})
                        </Link>
                        <Link
                            href="/hradmin/settings/login-monitor?filter=offline"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'offline' ? 'bg-white/20 border-white/30 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            ⚫ ออฟไลน์ ({offlineCount})
                        </Link>
                    </div>
                </div>

                {/* Grid of faces */}
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                    {rows.map(row => {
                        const isActive = row.isActiveNow
                        const isIdle = row.isIdle
                        const isOnline = row.isOnline

                        return (
                            <div
                                key={`face-${row.id}`}
                                className={[
                                    'group relative min-w-0 rounded-2xl border p-2 text-center transition-all duration-500',
                                    isActive
                                        ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/30'
                                        : isIdle
                                        ? 'border-amber-400/40 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.18)] ring-1 ring-amber-400/25'
                                        : 'border-white/8 bg-black/25 opacity-45 hover:opacity-80',
                                ].join(' ')}
                                title={`${row.displayName}\nสถานะ: ${isActive ? `กำลังใช้งาน (${row.activePathThai})` : isIdle ? `เปิดทิ้งไว้ ${row.activeMinutesAgo} นาที (${row.activePathThai})` : row.last_active_at ? `ใช้งานล่าสุดเมื่อ ${formatBangkokDateTime(row.last_active_at)}` : 'ยังไม่มีประวัติใช้งาน'}`}
                            >
                                <div className="relative mx-auto h-12 w-12 sm:h-14 sm:w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14">
                                    {/* Active / Idle Glow */}
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-md animate-pulse" />
                                    )}
                                    {isIdle && (
                                        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-sm" />
                                    )}

                                    <div
                                        className={[
                                            'relative h-full w-full overflow-hidden rounded-full border-2 transition-all duration-500',
                                            isActive
                                                ? 'border-emerald-300 ring-2 ring-emerald-400/40'
                                                : isIdle
                                                ? 'border-amber-300 ring-2 ring-amber-400/30'
                                                : 'border-white/15',
                                        ].join(' ')}
                                    >
                                        {row.photoUrl ? (
                                            <img
                                                src={row.photoUrl}
                                                alt={row.displayName}
                                                className={[
                                                    'h-full w-full object-cover transition-all duration-500',
                                                    isActive
                                                        ? 'grayscale-0 scale-105 brightness-105'
                                                        : isIdle
                                                        ? 'grayscale-0 brightness-95'
                                                        : 'grayscale contrast-90 brightness-75',
                                                ].join(' ')}
                                            />
                                        ) : (
                                            <div
                                                className={[
                                                    'flex h-full w-full items-center justify-center text-sm font-black transition-colors',
                                                    isActive
                                                        ? 'bg-emerald-300/30 text-emerald-100'
                                                        : isIdle
                                                        ? 'bg-amber-300/25 text-amber-100'
                                                        : 'bg-white/10 text-white/40',
                                                ].join(' ')}
                                            >
                                                {row.initials}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status indicator badge */}
                                    {isActive ? (
                                        <div className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#1e0a10] shadow-sm shadow-emerald-400/80 animate-pulse" title="กำลังใช้งาน">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#061810]" />
                                        </div>
                                    ) : isIdle ? (
                                        <div className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-[#1e0a10] shadow-sm shadow-amber-400/80" title={`เปิดทิ้งไว้ ${row.activeMinutesAgo} นาที`}>
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#201502]" />
                                        </div>
                                    ) : row.wasActiveToday ? (
                                        <div className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-500 ring-2 ring-[#1e0a10]" title="เคยเข้าใช้วันนี้" />
                                    ) : null}
                                </div>

                                <div className="mt-1.5 min-w-0">
                                    <p className={['truncate text-xs font-black', isActive ? 'text-white' : isIdle ? 'text-amber-100' : 'text-white/50'].join(' ')}>
                                        {row.shortName}
                                    </p>
                                    {isActive ? (
                                        <div className="mt-0.5">
                                            <span className="inline-block truncate max-w-full text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-400/25 text-emerald-200 border border-emerald-400/30 animate-pulse">
                                                {row.activePathThai}
                                            </span>
                                        </div>
                                    ) : isIdle ? (
                                        <div className="mt-0.5">
                                            <span className="inline-block truncate max-w-full text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-200 border border-amber-400/30" title={`${row.activePathThai} (${row.activeMinutesAgo} น.ที่แล้ว)`}>
                                                {row.activeMinutesAgo} น. (Idle)
                                            </span>
                                        </div>
                                    ) : row.last_active_at && row.wasActiveToday ? (
                                        <p className="truncate text-[9px] font-semibold text-white/40 mt-0.5">
                                            {formatBangkokTime(row.last_active_at)}
                                        </p>
                                    ) : (
                                        <p className="truncate text-[9px] font-semibold text-white/25 mt-0.5">
                                            {row.employee_code ?? '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Detailed Table List */}
            <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/7 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-white">รายละเอียดผู้ใช้งาน</h2>
                        <p className="text-sm text-white/55">แสดงพนักงานที่กำลังออนไลน์อยู่ด้านบนสุด ตามด้วยผู้ใช้งานล่าสุด</p>
                    </div>

                    <form action="/hradmin/settings/login-monitor" className="relative max-w-xs w-full">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            name="q"
                            defaultValue={searchFilter}
                            placeholder="ค้นหาชื่อ, รหัส, แผนก..."
                            className="w-full h-9 pl-9 pr-3 rounded-xl border border-white/15 bg-black/25 text-xs text-white placeholder:text-white/35 outline-none focus:border-emerald-400/60"
                        />
                    </form>
                </div>

                <div className="divide-y divide-white/8">
                    {rows.length === 0 ? (
                        <div className="p-8 text-center text-sm text-white/45">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</div>
                    ) : (
                        rows.map(row => (
                            <div key={row.id} className="grid gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_180px_160px_140px] lg:items-center hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15">
                                        {row.photoUrl ? (
                                            <img
                                                src={row.photoUrl}
                                                alt={row.displayName}
                                                className={`h-full w-full object-cover ${row.isOnline ? 'grayscale-0' : 'grayscale brightness-75'}`}
                                            />
                                        ) : (
                                            <div className={`flex h-full w-full items-center justify-center text-xs font-black ${row.isActiveNow ? 'bg-emerald-400/20 text-emerald-200' : row.isIdle ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10 text-white/40'}`}>
                                                {row.initials}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-white truncate">{row.displayName}</p>
                                            {row.employee_code && (
                                                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/65">
                                                    {row.employee_code}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/45 truncate">
                                            {row.department || 'ไม่ระบุแผนก'} · {row.position || 'ไม่ระบุตำแหน่ง'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-xs">
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">หน้าที่กำลังเปิด</p>
                                    <p className="font-semibold text-white/80 mt-0.5 flex items-center gap-1.5">
                                        {row.isActiveNow ? (
                                            <span className="text-emerald-300 font-bold">{row.activePathThai}</span>
                                        ) : row.isIdle ? (
                                            <span className="text-amber-200 font-semibold">{row.activePathThai}</span>
                                        ) : (
                                            <span className="text-white/45">{row.last_active_path ? formatPathThai(row.last_active_path) : '—'}</span>
                                        )}
                                    </p>
                                </div>

                                <div className="text-xs">
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">สัญญาณล่าสุด</p>
                                    <p className="font-medium text-white/70 mt-0.5">
                                        {row.isActiveNow ? (
                                            <span className="text-emerald-300 font-bold">
                                                {row.activeSecondsAgo < 60 ? `${row.activeSecondsAgo} วินาทีที่แล้ว` : `${row.activeMinutesAgo} นาทีที่แล้ว`}
                                            </span>
                                        ) : row.isIdle ? (
                                            <span className="text-amber-200 font-medium">
                                                {row.activeMinutesAgo} นาทีที่แล้ว (เปิดทิ้งไว้)
                                            </span>
                                        ) : row.last_active_at ? (
                                            <span>{formatBangkokDateTime(row.last_active_at)}</span>
                                        ) : (
                                            <span className="text-white/30">ยังไม่มีสัญญาณ</span>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center lg:justify-end">
                                    {row.isActiveNow ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100 shadow-sm shadow-emerald-950/40 animate-pulse">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300 animate-ping shrink-0" />
                                            กำลังใช้งาน
                                        </span>
                                    ) : row.isIdle ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-100 shadow-sm shadow-amber-950/40">
                                            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                                            เปิดทิ้งไว้ ({row.activeMinutesAgo} น.)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/40">
                                            ออฟไลน์
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Information Notice */}
            <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={20} />
                    <div className="space-y-1">
                        <h3 className="font-bold text-white text-sm">หลักการทำงานของระบบ Live Presence Monitor (3 ระดับ)</h3>
                        <p className="text-xs leading-relaxed text-white/60">
                            ระบบตรวจจับการเข้าใช้งาน EBCI Nexus แบบ Realtime เพื่อความถูกต้องและประหยัดการทำงานของระบบ:<br />
                            • 🟢 <strong>กำลังใช้งาน (Active):</strong> พนักงานมีกิจกรรม คลิก หรือเปิดหน้าภายใน <strong>5 นาทีล่าสุด</strong> (รูปสีสดใส พร้อมแสดงหน้าที่เปิด)<br />
                            • 🟡 <strong>เปิดจอทิ้งไว้ (Idle):</strong> มีสัญญาณระหว่าง <strong>5–15 นาทีล่าสุด</strong> เช่น เปิดแท็บอ่านทิ้งไว้ (รูปสี ขอบเหลือง)<br />
                            • ⚫ <strong>ออฟไลน์ (Offline):</strong> ออกจากระบบ หรือไม่มีสัญญาณเกิน <strong>15 นาที</strong> (รูปขาวดำ)<br />
                            <em>*ยอดรวมของพนักงานที่กำลังใช้งานและเปิดทิ้งไว้ จะตรงกับจำนวนในปุ่ม Nexus ด้านบนเสมอ</em>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}
