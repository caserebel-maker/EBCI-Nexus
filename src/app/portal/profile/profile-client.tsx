'use client'

import Link from 'next/link'
import { Mail, Phone, User, Briefcase, Calendar, Award } from 'lucide-react'

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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <span className="font-black leading-none" style={{ fontSize: '32px', color }}>{value}</span>
            <span className="whitespace-nowrap" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>{label}</span>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    displayName: string
    initials: string
    avatarUrl: string | null
    position: string | null
    department: string | null
    secondaryDepartment: string | null
    employeeCode: string | null
    employmentType: string | null
    tenure: string | null
    startDate: string | null
    email: string | null
    phone: string | null
    managerName: string | null
    leaveBalances: { leaveType: string; entitledDays: number; usedDays: number }[]
    recentLeaves: { id: string; leaveType: string; startDate: string; endDate: string; totalDays: number; status: string }[]
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfileClient({
    displayName, initials, avatarUrl, position, department, secondaryDepartment,
    employeeCode, employmentType, tenure, startDate, email, phone,
    managerName, leaveBalances, recentLeaves,
}: Props) {
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
                    {startDate && <InfoRow icon={Calendar}  label="วันเริ่มงาน"      value={fmtDate(startDate)} />}
                    {managerName && <InfoRow icon={User}    label="ผู้บังคับบัญชา"   value={managerName} />}
                    {!email && !phone && !startDate && !managerName && (
                        <p className="text-center py-3" style={{ fontSize: '17px', color: 'rgba(255,255,255,0.90)' }}>
                            ไม่มีข้อมูลติดต่อ
                        </p>
                    )}
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

            {/* ── 3. สถิติการเข้างาน ─────────────────────────────────────── */}
            <div style={glass} className="p-5">
                <p style={sectionTitle}>สถิติการเข้างาน</p>
                <div className="grid grid-cols-3 gap-3">
                    <StatCard label="มาตรงเวลา" value={0} color="#34D399" />
                    <StatCard label="มาสาย"     value={0} color="#F87171" />
                    <StatCard label="ขาด"       value={0} color="rgba(255,255,255,0.35)" />
                </div>
                <p className="text-center mt-3" style={{ fontSize: '19px', color: 'rgba(255,255,255,0.55)' }}>
                    รอเชื่อมต่อระบบลงเวลา
                </p>
            </div>

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
                    <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.30)' }}>ยังไม่มีประวัติใบลา</p>
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
