import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Clock, RefreshCw, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatBangkokDateTime, todayBangkokKey } from '@/lib/datetime'
import { AutoRefresh } from './auto-refresh'

export const dynamic = 'force-dynamic'

type PageProps = {
    searchParams?: Promise<{ date?: string }>
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
    loggedIn: boolean
    firstLoginAt: string | null
    lastLoginAt: string | null
    successCount: number
    failedCount: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function sanitizeDate(value: string | undefined): string {
    if (value && DATE_RE.test(value)) return value
    return todayBangkokKey()
}

function bangkokDateRangeUtc(dateKey: string) {
    const start = new Date(`${dateKey}T00:00:00+07:00`)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    }
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

function percent(value: number, total: number): number {
    if (!total) return 0
    return Math.round((value / total) * 100)
}

function sortRows(a: MonitorRow, b: MonitorRow) {
    if (a.loggedIn !== b.loggedIn) return a.loggedIn ? 1 : -1
    return (a.employee_code ?? '').localeCompare(b.employee_code ?? '', 'th')
}

export default async function LaunchLoginMonitorPage({ searchParams }: PageProps) {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/hradmin/dashboard')

    const params = await searchParams
    const selectedDate = sanitizeDate(params?.date)
    const { startIso, endIso } = bangkokDateRangeUtc(selectedDate)

    const { data: employeeRows, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, email, department, position, photo_url')
        .eq('status', 'active')
        .order('employee_code', { ascending: true })

    if (employeeError) {
        throw new Error(`Load employees failed: ${employeeError.message}`)
    }

    const employees = (employeeRows ?? []) as EmployeeRow[]
    const emailLowers = employees
        .map(e => e.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))

    const { data: attemptRows, error: attemptError } = emailLowers.length
        ? await supabaseAdmin
            .from('login_attempts')
            .select('email_lower, success, attempted_at')
            .in('email_lower', emailLowers)
            .gte('attempted_at', startIso)
            .lt('attempted_at', endIso)
            .order('attempted_at', { ascending: true })
        : { data: [], error: null }

    if (attemptError) {
        throw new Error(`Load login attempts failed: ${attemptError.message}`)
    }

    const attempts = (attemptRows ?? []) as LoginAttemptRow[]
    const attemptsByEmail = new Map<string, LoginAttemptRow[]>()
    for (const attempt of attempts) {
        const key = attempt.email_lower.toLowerCase()
        const list = attemptsByEmail.get(key) ?? []
        list.push(attempt)
        attemptsByEmail.set(key, list)
    }

    const rows: MonitorRow[] = employees.map(employee => {
        const emailLower = employee.email?.trim().toLowerCase() || null
        const personAttempts = emailLower ? attemptsByEmail.get(emailLower) ?? [] : []
        const successes = personAttempts.filter(a => a.success)
        const failures = personAttempts.filter(a => !a.success)
        return {
            ...employee,
            displayName: employeeName(employee),
            shortName: shortEmployeeName(employee),
            emailLower,
            photoUrl: resolvePhotoUrl(employee.photo_url),
            initials: employeeInitials(employee),
            loggedIn: successes.length > 0,
            firstLoginAt: successes[0]?.attempted_at ?? null,
            lastLoginAt: successes.at(-1)?.attempted_at ?? null,
            successCount: successes.length,
            failedCount: failures.length,
        }
    }).sort(sortRows)

    const total = rows.length
    const loggedInCount = rows.filter(r => r.loggedIn).length
    const pendingCount = total - loggedInCount
    const noEmailCount = rows.filter(r => !r.emailLower).length
    const failedAttemptCount = rows.reduce((sum, r) => sum + r.failedCount, 0)
    const completion = percent(loggedInCount, total)
    const latestLogin = rows
        .filter(r => r.lastLoginAt)
        .sort((a, b) => String(b.lastLoginAt).localeCompare(String(a.lastLoginAt)))[0]

    return (
        <main className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                        <UserCheck size={14} />
                        Launch monitor
                    </div>
                    <AutoRefresh />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white">ตรวจล็อกอินวันอบรม</h1>
                        <p className="mt-1 text-sm text-white/60">
                            ดูว่าพนักงาน active คนไหนเข้าระบบแล้วบ้างจากบันทึก login จริงของระบบ
                        </p>
                    </div>
                </div>

                <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/hradmin/settings/login-monitor">
                    <label className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">วันที่ตรวจ</label>
                    <input
                        type="date"
                        name="date"
                        defaultValue={selectedDate}
                        className="h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm font-semibold text-white outline-none focus:border-emerald-300/60"
                    />
                    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-[#07130d] shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300">
                        <Search size={16} />
                        ตรวจสอบ
                    </button>
                    <Link
                        href={`/hradmin/settings/login-monitor?date=${selectedDate}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 text-sm font-bold text-white hover:bg-white/12"
                    >
                        <RefreshCw size={16} />
                        รีเฟรช
                    </Link>
                </form>
            </div>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard label="พนักงาน active" value={total} sub="คน" tone="blue" />
                <MetricCard label="ล็อกอินแล้ว" value={loggedInCount} sub={`${completion}%`} tone="green" />
                <MetricCard label="ยังไม่ล็อกอิน" value={pendingCount} sub="คน" tone="amber" />
                <MetricCard label="ล็อกอินผิด" value={failedAttemptCount} sub="ครั้ง" tone="rose" />
                <MetricCard label="ไม่มีอีเมล" value={noEmailCount} sub="บัญชี" tone="slate" />
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/7 p-4 sm:p-5 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-white">ความคืบหน้า</h2>
                        <p className="text-sm text-white/55">
                            ล่าสุด: {latestLogin ? `${latestLogin.displayName} · ${formatBangkokDateTime(latestLogin.lastLoginAt)}` : 'ยังไม่มีคนล็อกอินในวันที่เลือก'}
                        </p>
                    </div>
                    <div className="text-right text-sm font-bold text-white/70">{loggedInCount}/{total} คน</div>
                </div>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 transition-all"
                        style={{ width: `${completion}%` }}
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-3 sm:p-4 shadow-2xl shadow-black/20">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-white">ภาพรวมแบบรูปพนักงาน</h2>
                        <p className="text-xs text-white/50">รูปสี = เข้าระบบแล้ว · ขาวดำ = ยังไม่เข้า</p>
                    </div>
                    <div className="hidden text-xs font-bold text-white/50 lg:block">
                        Desktop แสดงครบทุกคนในแผงเดียว
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                    {rows.map(row => (
                        <div
                            key={`face-${row.id}`}
                            className={[
                                'group relative min-w-0 rounded-xl border p-2 text-center transition-all duration-300',
                                row.loggedIn
                                    ? 'border-emerald-300/35 bg-emerald-300/10 shadow-[0_0_22px_rgba(52,211,153,0.14)]'
                                    : 'border-white/8 bg-black/18 opacity-70',
                            ].join(' ')}
                            title={`${row.displayName}${row.loggedIn && row.lastLoginAt ? ` · ${formatBangkokDateTime(row.lastLoginAt)}` : ' · ยังไม่เข้า'}`}
                        >
                            <div className="relative mx-auto h-12 w-12 sm:h-14 sm:w-14 lg:h-12 lg:w-12 xl:h-14 xl:w-14">
                                <div
                                    className={[
                                        'absolute inset-0 rounded-full',
                                        row.loggedIn
                                            ? 'bg-emerald-300/35 blur-md animate-pulse'
                                            : 'bg-white/5',
                                    ].join(' ')}
                                />
                                <div
                                    className={[
                                        'relative h-full w-full overflow-hidden rounded-full border-2',
                                        row.loggedIn ? 'border-emerald-300' : 'border-white/15',
                                    ].join(' ')}
                                >
                                    {row.photoUrl ? (
                                        <img
                                            src={row.photoUrl}
                                            alt={row.displayName}
                                            className={[
                                                'h-full w-full object-cover transition-all duration-500',
                                                row.loggedIn ? 'grayscale-0 scale-105' : 'grayscale contrast-90 brightness-75',
                                            ].join(' ')}
                                        />
                                    ) : (
                                        <div
                                            className={[
                                                'flex h-full w-full items-center justify-center text-sm font-black',
                                                row.loggedIn ? 'bg-emerald-300/20 text-emerald-50' : 'bg-white/10 text-white/45',
                                            ].join(' ')}
                                        >
                                            {row.initials}
                                        </div>
                                    )}
                                </div>
                                {row.loggedIn && (
                                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300 text-[#082018] shadow-lg shadow-emerald-950/30">
                                        <CheckCircle2 size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            <div className="mt-1.5 min-w-0">
                                <p className={['truncate text-xs font-black', row.loggedIn ? 'text-white' : 'text-white/55'].join(' ')}>
                                    {row.shortName}
                                </p>
                                <p className="truncate text-[10px] font-bold text-white/35">{row.employee_code ?? '—'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/7 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-1 border-b border-white/10 px-4 py-4 sm:px-5">
                    <h2 className="text-lg font-black text-white">รายชื่อพนักงาน</h2>
                    <p className="text-sm text-white/55">เรียงคนที่ยังไม่ล็อกอินไว้ด้านบน เพื่อให้ HR ตามได้เร็ว</p>
                </div>

                <div className="divide-y divide-white/8">
                    {rows.map(row => (
                        <div key={row.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px_130px_110px] lg:items-center">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-black text-white">{row.displayName}</p>
                                    {row.employee_code && (
                                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/65">
                                            {row.employee_code}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-white/50">
                                    {row.department || 'ไม่ระบุแผนก'} · {row.position || 'ไม่ระบุตำแหน่ง'}
                                </p>
                            </div>

                            <div className="text-sm text-white/70">
                                {row.lastLoginAt ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Clock size={14} className="text-emerald-200" />
                                        {formatBangkokDateTime(row.lastLoginAt)}
                                    </span>
                                ) : (
                                    <span className="text-white/35">ยังไม่มีเวลาเข้า</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-sm font-bold">
                                {row.loggedIn ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/15 px-3 py-1 text-emerald-100">
                                        <CheckCircle2 size={14} />
                                        เข้าแล้ว
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-amber-100">
                                        <UserX size={14} />
                                        ยังไม่เข้า
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-white/55 lg:text-right">
                                ถูก {row.successCount} · ผิด {row.failedCount}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-white/12 bg-black/20 p-4 sm:p-5">
                <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 shrink-0 text-emerald-200" size={20} />
                    <div className="space-y-1">
                        <h2 className="font-black text-white">หมายเหตุสำหรับวันอบรม</h2>
                        <p className="text-sm leading-6 text-white/60">
                            หน้านี้นับเฉพาะพนักงานสถานะ active และอ้างอิงจาก login ที่สำเร็จในวันที่เลือกตามเวลาไทย
                            ถ้าพนักงานเปิดค้างจากวันก่อน ให้กดออกจากระบบแล้วเข้าใหม่เพื่อให้ระบบบันทึกว่าเข้าวันอบรมแล้ว
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}

function MetricCard({
    label,
    value,
    sub,
    tone,
}: {
    label: string
    value: number
    sub: string
    tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate'
}) {
    const toneClass = {
        blue: 'from-blue-400/20 to-cyan-300/10 text-blue-100 border-blue-300/25',
        green: 'from-emerald-400/20 to-teal-300/10 text-emerald-100 border-emerald-300/25',
        amber: 'from-amber-400/20 to-orange-300/10 text-amber-100 border-amber-300/25',
        rose: 'from-rose-400/20 to-pink-300/10 text-rose-100 border-rose-300/25',
        slate: 'from-white/12 to-white/5 text-white/85 border-white/15',
    }[tone]

    return (
        <div className={`rounded-2xl border bg-gradient-to-br p-4 ${toneClass}`}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">{label}</p>
            <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-black leading-none">{value}</p>
                <p className="pb-0.5 text-sm font-bold opacity-75">{sub}</p>
            </div>
        </div>
    )
}
