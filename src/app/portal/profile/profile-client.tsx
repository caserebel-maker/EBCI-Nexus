'use client'

import Link from 'next/link'
import { Mail, Phone, User, Calendar, AlertCircle, Clock, Umbrella } from 'lucide-react'
import type { EmployeeAttendanceSummary } from '@/lib/attendance-summary'
import type { StreakInfo } from '@/lib/streak-shared'
import { STREAK_TIERS } from '@/lib/streak-shared'

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_META: Record<string, { label: string; color: string }> = {
    annual:   { label: 'ลาพักร้อน', color: '#34D399' },
    sick:     { label: 'ลาป่วย',    color: '#60A5FA' },
    personal: { label: 'ลากิจ',     color: '#FBBF24' },
}
const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
    pending:   { label: 'รออนุมัติ', bg: 'rgba(251,191,36,0.18)',  text: '#FCD34D' },
    approved:  { label: 'อนุมัติ',   bg: 'rgba(52,211,153,0.18)',  text: '#34D399' },
    rejected:  { label: 'ปฏิเสธ',   bg: 'rgba(248,113,113,0.18)', text: '#F87171' },
    cancelled: { label: 'ยกเลิก',   bg: 'rgba(255,255,255,0.20)', text: 'rgba(255,255,255,0.4)' },
}
const EMPLOYMENT_LABELS: Record<string, string> = {
    'full-time': 'พนักงานประจำ', contract: 'สัญญาจ้าง', intern: 'ฝึกงาน',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.16)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
}

const sectionTitle: React.CSSProperties = {
    fontSize: '19px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '16px',
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function LeaveDonut({
    used, entitled, color, label,
}: {
    used: number; entitled: number; color: string; label: string
}) {
    const size = 96
    const r = 36
    const sw = 10
    const circ = 2 * Math.PI * r
    const remaining = Math.max(0, entitled - used)
    const pct = entitled > 0 ? Math.min(remaining / entitled, 1) : 0
    const filledDash = pct * circ

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Gray track */}
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={sw}
                    />
                    {/* Colored arc (remaining) */}
                    {filledDash > 0.5 && (
                        <circle
                            cx={size / 2} cy={size / 2} r={r}
                            fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
                            strokeDasharray={`${filledDash} ${circ}`}
                            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                        />
                    )}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-black leading-none" style={{ fontSize: '22px', color }}>
                        {remaining}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>คงเหลือ</span>
                </div>
            </div>
            <div className="text-center">
                <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: '19px', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                    ใช้ {used} / {entitled} วัน
                </p>
            </div>
        </div>
    )
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType; label: string; value: React.ReactNode
}) {
    return (
        <div className="flex items-center gap-3 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.18)' }}>
                <Icon size={16} style={{ color: '#fcd34d' }} />
            </div>
            <div className="min-w-0 flex-1">
                <p style={{ fontSize: '19px', color: 'rgba(255,255,255,0.75)' }}>{label}</p>
                <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.98)', fontWeight: 500 }} className="truncate">
                    {value}
                </p>
            </div>
        </div>
    )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full font-medium"
            style={{
                fontSize: '16px',
                background: accent ? 'rgba(136,33,54,0.35)' : 'rgba(255,255,255,0.16)',
                border: `1px solid ${accent ? 'rgba(173,95,108,0.35)' : 'rgba(255,255,255,0.25)'}`,
                color: accent ? '#fca5a5' : 'rgba(255,255,255,0.90)',
            }}>
            {children}
        </span>
    )
}

function AttendanceTile({
    label, value, suffix = 'วัน', color,
}: {
    label: string
    value: number
    suffix?: string
    color: string
}) {
    return (
        <div className="rounded-2xl px-3 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.62)', fontWeight: 700 }}>{label}</p>
            <p className="tabular-nums" style={{ fontSize: '32px', lineHeight: 1.1, color, fontWeight: 900, marginTop: 4 }}>
                {value}
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginLeft: 4 }}>{suffix}</span>
            </p>
        </div>
    )
}

function fmtShortDate(dateKey: string): string {
    const d = new Date(`${dateKey}T00:00:00+07:00`)
    if (Number.isNaN(d.getTime())) return dateKey
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function AttendanceSummaryCard({ summary }: { summary: EmployeeAttendanceSummary }) {
    return (
        <div style={glass} className="p-5">
            <div className="flex items-center gap-2 mb-4">
                <Clock size={18} style={{ color: '#fcd34d' }} />
                <p style={sectionTitle} className="!mb-0">สถิติขาด ลา มาสาย ({summary.monthLabel})</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <AttendanceTile label="ขาดงาน" value={summary.absentDays} color="#fecdd3" />
                <AttendanceTile label="มาสาย" value={summary.lateCount} suffix="ครั้ง" color="#fde68a" />
                <AttendanceTile label="ลาอนุมัติ" value={summary.leaveDays} color="#ddd6fe" />
            </div>
            <div className="mt-3 rounded-2xl px-3 py-3"
                style={{ background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <div className="flex items-start gap-2">
                    <Umbrella size={15} style={{ color: '#93c5fd', marginTop: 3 }} />
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
                        WFH อนุมัติ {summary.wfhDays} วัน · นับจากวันทำงานที่ผ่านไปแล้ว {summary.workdaysElapsed} วัน
                    </p>
                </div>
                {summary.absentDates.length > 0 && (
                    <p style={{ fontSize: '14px', color: '#fecdd3', marginTop: 8 }}>
                        วันที่ขาด: {summary.absentDates.map(fmtShortDate).join(', ')}
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Streak meter (§2.3) ──────────────────────────────────────────────────────
/**
 * Replaces the old "รอเชื่อมต่อระบบลงเวลา" placeholder. Shows months
 * continuous + progress bar to next reward tier + earned tier badges +
 * the event that broke the previous streak (or "fresh start" copy).
 */
function StreakCard({ streak }: { streak: StreakInfo }) {
    const { months, days, totalDays, currentTier, nextTier, daysToNextTier, lastResetEvent, startedOn } = streak

    // Progress bar fills toward the next tier — when maxed (12 mo), show
    // a fully filled bar styled gold. When zero progress + no current
    // tier, the bar is empty.
    const progressTarget = nextTier?.months ?? STREAK_TIERS[STREAK_TIERS.length - 1].months
    const progressFraction = Math.min(1, totalDays / (progressTarget * 30))

    // Defensive slice — server returns YYYY-MM-DD now, but if anyone
    // hands us a timestamp ("YYYY-MM-DD HH:MM:SS") the `+ 'T00:00:00'`
    // concat would form an invalid date string (Mod's 4 May NaN bug).
    const startedDateOnly = (startedOn ?? '').slice(0, 10)
    const startedThai = startedDateOnly
        ? new Date(startedDateOnly + 'T00:00:00')
            .toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—'

    return (
        <div style={glass} className="p-5">
            <p style={sectionTitle}>นับเดือนต่อเนื่อง — ไม่ลาป่วย ไม่ลากิจ ไม่สาย</p>

            {/* Headline — months + days */}
            <div className="text-center">
                <div className="inline-flex items-baseline gap-2">
                    <span style={{ fontSize: '56px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
                        {months}
                    </span>
                    <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.55)' }}>เดือน</span>
                    {days > 0 && (
                        <>
                            <span style={{ fontSize: '36px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginLeft: 6 }}>
                                {days}
                            </span>
                            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.55)' }}>วัน</span>
                        </>
                    )}
                </div>
                {nextTier ? (
                    <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                        เป้าหมายถัดไป: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{nextTier.label}</strong>
                        {' '}— อีก{' '}
                        <strong style={{ color: '#FCD34D' }}>{daysToNextTier} วัน</strong>
                    </p>
                ) : (
                    <p style={{ fontSize: '17px', color: '#FCD34D', marginTop: 6 }}>
                        ✨ คุณถึงเป้าหมายสูงสุดแล้ว (12 เดือน) — เก่งมาก!
                    </p>
                )}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                <div
                    className="h-full rounded-full transition-all"
                    style={{
                        width: `${progressFraction * 100}%`,
                        background: progressFraction >= 1
                            ? 'linear-gradient(90deg, #FCD34D, #F59E0B)'
                            : 'linear-gradient(90deg, #34D399, #FCD34D)',
                    }}
                />
            </div>

            {/* Tier badges row — earned tiles glow gold, unearned tiles
                stay readable (white emoji + white label). Earlier dim
                styling (opacity 0.45) made the medals look broken on
                phones (Mod's 4 May feedback: "อีโมจิเหรียญจางไป ดูยาก"). */}
            <div className="mt-4 grid grid-cols-4 gap-2">
                {STREAK_TIERS.map(tier => {
                    const earned = !!currentTier && currentTier.months >= tier.months
                    return (
                        <div
                            key={tier.months}
                            className="flex flex-col items-center justify-center rounded-xl py-2.5"
                            style={{
                                background: earned ? 'rgba(252,211,77,0.20)' : 'rgba(255,255,255,0.10)',
                                border: earned ? '1px solid rgba(252,211,77,0.55)' : '1px solid rgba(255,255,255,0.18)',
                            }}
                        >
                            <span style={{ fontSize: '22px', opacity: 1 }}>{tier.emoji}</span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: earned ? '#FCD34D' : '#ffffff',
                                marginTop: 2,
                            }}>
                                {tier.months} ด.
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Footnote — what reset the streak (or "fresh start" copy) */}
            <p className="mt-4 text-center" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>
                {lastResetEvent ? (
                    <>
                        💡 เริ่มนับใหม่ตั้งแต่ <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{startedThai}</strong>
                        {' '}(ก่อนหน้า: <span style={{ color: '#FCA5A5' }}>{lastResetEvent.label}</span>)
                    </>
                ) : (
                    <>🌱 เริ่มนับตั้งแต่เริ่มงาน <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{startedThai}</strong> — ยังไม่เคย reset เลย</>
                )}
            </p>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    displayName: string
    initials: string
    avatarUrl: string | null
    /** Thai prefix (นาย/นาง/นางสาว) — used to render the title chip. */
    title: string | null
    /** 'male' | 'female' (or legacy Thai 'ชาย' / 'หญิง'). Drives which
     *  gender-specific leave (ลาคลอด / ลาบวช) the dashboard surfaces.
     *  Displayed here so the employee can sanity-check what HR set for
     *  them and report a fix back if wrong. */
    gender: string | null
    dateOfBirth: string | null
    position: string | null
    department: string | null
    secondaryDepartment: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    emergencyContactRelation: string | null
    employeeCode: string | null
    employmentType: string | null
    tenure: string | null
    startDate: string | null
    email: string | null
    phone: string | null
    managerName: string | null
    leaveBalances: { leaveType: string; entitledDays: number; usedDays: number }[]
    recentLeaves: { id: string; leaveType: string; startDate: string; endDate: string; totalDays: number; status: string }[]
    /** §2.3 — Attendance streak info. Null when no employee row found
     *  (rare edge case during account-link race). */
    streak: StreakInfo | null
    attendanceSummary: EmployeeAttendanceSummary | null
}

/** Map any gender value (English code or legacy Thai literal) to the
 *  Thai display label. Falls back to the raw value so HR-set custom
 *  values don't get hidden. */
function genderLabel(g: string | null): string | null {
    if (!g) return null
    const s = g.trim().toLowerCase()
    if (s === 'male' || s === 'm' || s === 'ชาย') return 'ชาย'
    if (s === 'female' || s === 'f' || s === 'หญิง') return 'หญิง'
    return g
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfileClient({
    displayName, initials, avatarUrl, title, gender, dateOfBirth,
    position, department, secondaryDepartment,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    employeeCode, employmentType, tenure, startDate, email, phone,
    managerName, leaveBalances, recentLeaves, streak, attendanceSummary,
}: Props) {
    const genderText = genderLabel(gender)
    // Concatenate title + gender into a single line so the meta block
    // doesn't grow noisier — both are short and complement each other
    // (e.g. "นาย · ชาย"). When only one is present we just show that.
    const titleGenderLine = [title, genderText].filter(Boolean).join(' · ')
    return (
        <div className="max-w-lg mx-auto space-y-4 pb-24" style={{ fontSize: '1.2em' }}>

            {/* ── 1. Hero ──────────────────────────────────────────────────── */}
            <div style={glass} className="p-5">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center gap-3 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.20)' }}>
                    {/* Photo */}
                    {avatarUrl ? (
                        <img src={avatarUrl} alt=""
                            className="rounded-full object-cover"
                            style={{ width: 144, height: 144, border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
                    ) : (
                        <div className="rounded-full flex items-center justify-center font-black text-white select-none"
                            style={{
                                width: 144, height: 144,
                                background: 'linear-gradient(135deg, #882136, #c0392b)',
                                border: '3px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                fontSize: '45px',
                            }}>
                            {initials}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <h1 className="text-white font-bold leading-snug" style={{ fontSize: '24px' }}>
                            {displayName}
                        </h1>
                        {(position || department) && (
                            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                                {position}
                                {position && department && (
                                    <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 6px' }}>—</span>
                                )}
                                {department}
                            </p>
                        )}
                        {secondaryDepartment && (
                            <p style={{ fontSize: '15px', color: 'rgba(253,224,71,0.85)', marginTop: 4 }}>
                                + {secondaryDepartment} <span style={{ color: 'rgba(253,224,71,0.55)', fontSize: '13px' }}>(รักษาการ)</span>
                            </p>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {employeeCode && <Badge accent>{employeeCode}</Badge>}
                        {tenure && <Badge>⏱ {tenure}</Badge>}
                        {employmentType && <Badge>{EMPLOYMENT_LABELS[employmentType] ?? employmentType}</Badge>}
                    </div>
                </div>

                {/* Meta rows */}
                <div className="pt-1">
                    {email     && <InfoRow icon={Mail}      label="อีเมล"           value={email} />}
                    {phone     && <InfoRow icon={Phone}     label="เบอร์โทร"         value={phone} />}
                    {titleGenderLine && (
                        <InfoRow icon={User} label="คำนำหน้า / เพศ" value={titleGenderLine} />
                    )}
                    {dateOfBirth && (
                        <InfoRow icon={Calendar} label="วันเกิด" value={fmtDate(dateOfBirth)} />
                    )}
                    {startDate && <InfoRow icon={Calendar}  label="วันเริ่มงาน"      value={fmtDate(startDate)} />}
                    {managerName && <InfoRow icon={User}    label="ผู้บังคับบัญชา"   value={managerName} />}
                    {!email && !phone && !titleGenderLine && !dateOfBirth && !startDate && !managerName && (
                        <p className="text-center py-3" style={{ fontSize: '17px', color: 'rgba(255,255,255,0.90)' }}>
                            ไม่มีข้อมูลติดต่อ
                        </p>
                    )}
                </div>

                {/* Emergency contact */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={15} style={{ color: '#fda4af' }} />
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#fecdd3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ผู้ติดต่อฉุกเฉิน
                        </p>
                    </div>
                    <InfoRow icon={User}  label="ชื่อ-สกุล"     value={emergencyContactName || '—'} />
                    <InfoRow icon={Phone} label="เบอร์โทร"      value={emergencyContactPhone || '—'} />
                    <InfoRow icon={User}  label="ความสัมพันธ์" value={emergencyContactRelation || '—'} />
                </div>
            </div>

            {/* ── 2. สถิติวันลา ──────────────────────────────────────────── */}
            <div style={glass} className="p-5">
                <p style={sectionTitle}>สถิติวันลา ปี {new Date().getFullYear()}</p>

                {leaveBalances.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {leaveBalances.map(b => {
                            const meta = LEAVE_META[b.leaveType] ?? { label: b.leaveType, color: '#94a3b8' }
                            return (
                                <LeaveDonut
                                    key={b.leaveType}
                                    used={b.usedDays}
                                    entitled={b.entitledDays}
                                    color={meta.color}
                                    label={meta.label}
                                />
                            )
                        })}
                    </div>
                ) : (
                    <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.90)' }}>ไม่มีข้อมูลวันลา</p>
                )}

                {/* Legend */}
                {leaveBalances.length > 0 && (
                    <div className="flex justify-center gap-4 mt-4 pt-3"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
                        {leaveBalances.map(b => {
                            const meta = LEAVE_META[b.leaveType]
                            if (!meta) return null
                            return (
                                <div key={b.leaveType} className="flex items-center gap-1.5">
                                    <span className="rounded-full" style={{ width: 8, height: 8, background: meta.color, display: 'inline-block' }} />
                                    <span style={{ fontSize: '19px', color: '#fcd34d' }}>{meta.label}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── 3. นับเดือนต่อเนื่อง (§2.3 streak meter) ────────────────── */}
            {streak && <StreakCard streak={streak} />}

            {/* ── 3b. ขาด ลา มาสาย ──────────────────────────────────────── */}
            {attendanceSummary && <AttendanceSummaryCard summary={attendanceSummary} />}

            {/* ── 4. ประวัติใบลาล่าสุด ───────────────────────────────────── */}
            <div style={glass} className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <p style={sectionTitle}>ประวัติใบลาล่าสุด</p>
                    <Link href="/portal/leave"
                        style={{ fontSize: '17px', color: 'rgba(173,95,108,0.9)', fontWeight: 600 }}
                        className="hover:text-white transition-colors">
                        ดูทั้งหมด →
                    </Link>
                </div>

                {recentLeaves.length === 0 ? (
                    <p style={{ fontSize: '18px', color: '#ffffff' }}>ยังไม่มีประวัติใบลา</p>
                ) : (
                    <div className="space-y-2">
                        {recentLeaves.map(req => {
                            const meta = LEAVE_META[req.leaveType]
                            const st   = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending
                            return (
                                <div key={req.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)' }}>
                                    {/* Color dot + type */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="shrink-0 rounded-full"
                                            style={{ width: 8, height: 8, background: meta?.color ?? '#94a3b8', display: 'inline-block' }} />
                                        <div className="min-w-0">
                                            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>
                                                {meta?.label ?? req.leaveType}
                                            </p>
                                            <p style={{ fontSize: '19px', color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                                                {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Days + status */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)' }}>
                                            {req.totalDays} วัน
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full font-semibold"
                                            style={{ fontSize: '24px', background: st.bg, color: st.text }}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
