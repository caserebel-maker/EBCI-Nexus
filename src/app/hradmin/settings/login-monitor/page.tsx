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
    isOnline: boolean
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
    // 1. Online users first
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
    // 2. Active today next, ordered by latest activity
    if (a.wasActiveToday !== b.wasActiveToday) return a.wasActiveToday ? -1 : 1
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

    // 3. Transform rows with 2-minute online threshold
    const allRows: MonitorRow[] = employees.map(employee => {
        const emailLower = employee.email?.trim().toLowerCase() || null
        const personAttempts = emailLower ? attemptsByEmail.get(emailLower) ?? [] : []
        const successes = personAttempts.filter(a => a.success)

        const lastActive = employee.last_active_at ? new Date(employee.last_active_at) : null
        const diffSeconds = lastActive ? Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / 1000)) : Infinity
        const diffMinutes = Math.floor(diffSeconds / 60)

        // ONLINE CRITERIA: Heartbeat received within the last 120 seconds (2 minutes)
        const isOnline = diffSeconds <= 120
        const wasActiveToday = Boolean(lastActive && diffSeconds <= 24 * 60 * 60)

        return {
            ...employee,
            displayName: employeeName(employee),
            shortName: shortEmployeeName(employee),
            emailLower,
            photoUrl: resolvePhotoUrl(employee.photo_url),
            initials: employeeInitials(employee),
            isOnline,
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
    const onlineCount = allRows.filter(r => r.isOnline).length
    const activeTodayCount = allRows.filter(r => r.wasActiveToday).length
    const offlineCount = totalEmployees - onlineCount

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
                        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                            ผู้ใช้งานขณะนี้
                            <span className="text-base font-bold text-emerald-300 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-400/30">
                                ออนไลน์ {onlineCount} คน
                            </span>
                        </h1>
                        <p className="mt-1 text-sm text-white/65 max-w-2xl leading-relaxed">
                            ระบบตรวจจับการใช้งาน EBCI Nexus แบบ Realtime · <strong>รูปสี = กำลังเปิดใช้งานอยู่</strong> (ส่งสัญญาณภายใน 2 นาที) · <strong>รูปขาวดำ = ออกจากระบบ/ไม่ได้ใช้งานเกิน 2 นาที</strong>
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
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-4 text-emerald-100 shadow-lg shadow-black/20">
                    <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                        <span>กำลังใช้งานอยู่</span>
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300 animate-pulse" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-200">{onlineCount}</span>
                        <span className="text-sm font-semibold opacity-75">คน (รูปสี)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-300/70">สัญญาณภายใน 2 นาทีล่าสุด</p>
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
                    <p className="mt-1 text-[11px] text-white/40">ไม่ได้ใช้งาน / ปิดแอปเกิน 2 นาที</p>
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

                <div className="rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/20 to-pink-500/10 p-4 text-purple-100 shadow-lg shadow-black/20">
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
                            {onlineCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    กำลังใช้งาน {onlineCount} คน
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-white/55 mt-0.5">
                            🟢 <strong>รูปสีสดใส</strong> = กำลังเปิดแอปใช้งานอยู่ · ⚫ <strong>รูปขาวดำ</strong> = ออกจากแอปไปเกิน 2 นาที (ออฟไลน์)
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <Link
                            href="/hradmin/settings/login-monitor"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'all' ? 'bg-white/20 border-white/30 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            ทั้งหมด ({totalEmployees})
                        </Link>
                        <Link
                            href="/hradmin/settings/login-monitor?filter=online"
                            className={`px-3 py-1 rounded-lg border transition-all ${statusFilter === 'online' ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                        >
                            🟢 ออนไลน์ ({onlineCount})
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
                        const isOnline = row.isOnline
                        return (
                            <div
                                key={`face-${row.id}`}
                                className={[
                                    'group relative min-w-0 rounded-2xl border p-2 text-center transition-all duration-500',
                                    isOnline
                                        ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/30'
                                        : 'border-white/8 bg-black/25 opacity-45 hover:opacity-80',
                                ].join(' ')}
                                title={`${row.displayName}\nสถานะ: ${isOnline ? `กำลังใช้งานอยู่ (${row.activePathThai})` : row.last_active_at ? `ใช้งานล่าสุดเมื่อ ${formatBangkokDateTime(row.last_active_at)}` : 'ยังไม่มีประวัติใช้งาน'}`}
                            >
                                <div className="relative mx-auto h-12 w-12 sm:h-14 sm:w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14">
                                    {/* Online background pulse glow */}
                                    {isOnline && (
                                        <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-md animate-pulse" />
                                    )}

                                    <div
                                        className={[
                                            'relative h-full w-full overflow-hidden rounded-full border-2 transition-all duration-500',
                                            isOnline ? 'border-emerald-300 ring-2 ring-emerald-400/40' : 'border-white/15',
                                        ].join(' ')}
                                    >
                                        {row.photoUrl ? (
                                            <img
                                                src={row.photoUrl}
                                                alt={row.displayName}
                                                className={[
                                                    'h-full w-full object-cover transition-all duration-500',
                                                    isOnline
                                                        ? 'grayscale-0 scale-105 brightness-105'
                                                        : 'grayscale contrast-90 brightness-75',
                                                ].join(' ')}
                                            />
                                        ) : (
                                            <div
                                                className={[
                                                    'flex h-full w-full items-center justify-center text-sm font-black transition-colors',
                                                    isOnline ? 'bg-emerald-300/30 text-emerald-100' : 'bg-white/10 text-white/40',
                                                ].join(' ')}
                                            >
                                                {row.initials}
                                            </div>
                                        )}
                                    </div>

                                    {/* Online indicator badge */}
                                    {isOnline ? (
                                        <div className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#1e0a10] shadow-sm shadow-emerald-400/80 animate-pulse">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#061810]" />
                                        </div>
                                    ) : row.wasActiveToday ? (
                                        <div className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-500 ring-2 ring-[#1e0a10]" title="เคยเข้าใช้วันนี้" />
                                    ) : null}
                                </div>

                                <div className="mt-1.5 min-w-0">
                                    <p className={['truncate text-xs font-black', isOnline ? 'text-white' : 'text-white/50'].join(' ')}>
                                        {row.shortName}
                                    </p>
                                    {isOnline ? (
                                        <div className="mt-0.5">
                                            <span className="inline-block truncate max-w-full text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-400/25 text-emerald-200 border border-emerald-400/30 animate-pulse">
                                                {row.activePathThai}
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
                            <div key={row.id} className="grid gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_180px_150px_140px] lg:items-center hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15">
                                        {row.photoUrl ? (
                                            <img
                                                src={row.photoUrl}
                                                alt={row.displayName}
                                                className={`h-full w-full object-cover ${row.isOnline ? 'grayscale-0' : 'grayscale brightness-75'}`}
                                            />
                                        ) : (
                                            <div className={`flex h-full w-full items-center justify-center text-xs font-black ${row.isOnline ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white/40'}`}>
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
                                        {row.isOnline ? (
                                            <span className="text-emerald-300 font-bold">{row.activePathThai}</span>
                                        ) : (
                                            <span className="text-white/45">{row.last_active_path ? formatPathThai(row.last_active_path) : '—'}</span>
                                        )}
                                    </p>
                                </div>

                                <div className="text-xs">
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">สัญญาณล่าสุด</p>
                                    <p className="font-medium text-white/70 mt-0.5">
                                        {row.isOnline ? (
                                            <span className="text-emerald-300 font-bold">
                                                {row.activeSecondsAgo < 60 ? `${row.activeSecondsAgo} วินาทีที่แล้ว` : `${row.activeMinutesAgo} นาทีที่แล้ว`}
                                            </span>
                                        ) : row.last_active_at ? (
                                            <span>{formatBangkokDateTime(row.last_active_at)}</span>
                                        ) : (
                                            <span className="text-white/30">ยังไม่มีสัญญาณ</span>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center lg:justify-end">
                                    {row.isOnline ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100 shadow-sm shadow-emerald-950/40 animate-pulse">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300 animate-ping shrink-0" />
                                            กำลังใช้งาน
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
                        <h3 className="font-bold text-white text-sm">หลักการทำงานของระบบ Live Presence Monitor</h3>
                        <p className="text-xs leading-relaxed text-white/60">
                            ทุกครั้งที่พนักงานเปิดใช้งาน EBCI Nexus บนเบราว์เซอร์หรือมือถือ ระบบจะส่งสัญญาณ Heartbeat ทุกๆ 30 วินาที 
                            หากพนักงานกำลังใช้งานอยู่ รูปภาพจะแสดงเป็น<strong>รูปสีสดใส</strong> พร้อมระบุหน้าที่กำลังเปิดอยู่ 
                            และเมื่อพนักงานปิดแท็บ ออกจากระบบ หรือไม่มีการเคลื่อนไหวเกิน <strong>2 นาที</strong> รูปภาพจะเปลี่ยนเป็น<strong>รูปขาวดำ</strong>โดยอัตโนมัติ
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}
