import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// ─── Styles ───────────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = {
    annual: 'ลาพักร้อน', sick: 'ลาป่วย', personal: 'ลากิจ',
    maternity: 'ลาคลอด', ordination: 'ลาบวช',
}
const LEAVE_COLORS: Record<string, string> = {
    annual: '#34D399', sick: '#60A5FA', personal: '#FBBF24',
    maternity: '#F472B6', ordination: '#A78BFA',
}
const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
    pending:   { label: 'รออนุมัติ', bg: 'rgba(251,191,36,0.15)',  text: '#FCD34D' },
    approved:  { label: 'อนุมัติ',   bg: 'rgba(52,211,153,0.15)',  text: '#34D399' },
    rejected:  { label: 'ปฏิเสธ',   bg: 'rgba(248,113,113,0.15)', text: '#F87171' },
    cancelled: { label: 'ยกเลิก',   bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' },
}
const EMPLOYMENT_LABELS: Record<string, string> = {
    'full-time': 'พนักงานประจำ', contract: 'สัญญาจ้าง', intern: 'ฝึกงาน',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTenure(startDate: Date): string {
    const now = new Date()
    const totalMonths =
        (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    const y = Math.floor(totalMonths / 12)
    const m = totalMonths % 12
    if (y === 0) return `${m} เดือน`
    if (m === 0) return `${y} ปี`
    return `${y} ปี ${m} เดือน`
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', minWidth: 100 }}>{label}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', textAlign: 'right' }}>{value}</span>
        </div>
    )
}

function LeaveBar({ label, used, entitled, color }: {
    label: string; used: number; entitled: number; color: string
}) {
    const pct = entitled > 0 ? Math.min((used / entitled) * 100, 100) : 0
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.70)' }}>{label}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                    {used} / {entitled} วัน
                </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function ProfilePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    // ── Employee ──────────────────────────────────────────────────────────────
    const emp = await prisma.employee.findFirst({
        where: { userId: session.id },
        include: { applicant: { select: { nickname: true, photoPath: true, gender: true } } },
    }).catch(() => null)

    // ── Manager name ──────────────────────────────────────────────────────────
    let managerName: string | null = null
    if (emp?.managerId) {
        const mgr = await prisma.employee.findUnique({
            where: { id: emp.managerId },
            select: { firstNameTH: true, lastNameTH: true },
        }).catch(() => null)
        if (mgr) managerName = `${mgr.firstNameTH} ${mgr.lastNameTH}`.trim()
    }

    // ── Avatar URL ────────────────────────────────────────────────────────────
    let avatarUrl: string | null = null
    if (emp?.applicant?.photoPath) {
        try {
            const { data } = await supabaseAdmin.storage
                .from('applicant-assets')
                .createSignedUrl(emp.applicant.photoPath, 3600)
            avatarUrl = data?.signedUrl ?? null
        } catch { /* silent */ }
    }

    // ── Leave balances ────────────────────────────────────────────────────────
    const DEFAULT_ENTITLED: Record<string, number> = {
        annual: 6, sick: 30, personal: 3, maternity: 90, ordination: 15,
    }
    const LEAVE_TYPES = ['annual', 'sick', 'personal']

    let leaveBalances: { leaveType: string; entitledDays: number; usedDays: number }[] = []
    if (emp) {
        const year = new Date().getFullYear()
        const stored = await prisma.leaveBalance.findMany({
            where: { employeeId: emp.id, year },
        }).catch(() => [])

        leaveBalances = LEAVE_TYPES.map(lt => {
            const found = stored.find(b => b.leaveType === lt)
            return {
                leaveType: lt,
                entitledDays: Number(found?.entitledDays ?? DEFAULT_ENTITLED[lt] ?? 0),
                usedDays: Number(found?.usedDays ?? 0),
            }
        })
    }

    // ── Recent leave requests ─────────────────────────────────────────────────
    const recentLeaves = emp
        ? await prisma.leaveRequest.findMany({
            where: { employeeId: emp.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, leaveType: true, startDate: true, endDate: true, totalDays: true, status: true },
        }).catch(() => [])
        : []

    // ── Derived display values ────────────────────────────────────────────────
    const firstName   = emp?.firstNameTH ?? session.name
    const lastName    = emp?.lastNameTH  ?? ''
    const nickname    = emp?.applicant?.nickname ?? null
    const displayName = nickname
        ? `${firstName} ${lastName} (${nickname})`.trim()
        : `${firstName} ${lastName}`.trim()
    const initials    = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()
    const tenure      = emp?.startDate ? calcTenure(emp.startDate) : null

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-8" style={{ fontSize: '1.2em' }}>

            {/* ── Section 1: Hero ─────────────────────────────────────────── */}
            <div style={glass} className="p-5">
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-4">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt=""
                            className="rounded-full object-cover shrink-0"
                            style={{ width: 80, height: 80, border: '2.5px solid rgba(255,255,255,0.2)' }} />
                    ) : (
                        <div className="rounded-full shrink-0 flex items-center justify-center font-black text-white select-none"
                            style={{
                                width: 80, height: 80,
                                background: 'linear-gradient(135deg, #882136, #c0392b)',
                                border: '2.5px solid rgba(255,255,255,0.15)',
                                fontSize: '26px',
                            }}>
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-white font-bold leading-snug" style={{ fontSize: '19px' }}>
                            {displayName}
                        </h1>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                            {emp?.position ?? '—'}
                            {emp?.position && emp?.department && (
                                <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 5px' }}>•</span>
                            )}
                            {emp?.department ?? ''}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {emp?.employeeCode && (
                                <span className="px-2 py-0.5 rounded-full font-medium"
                                    style={{ fontSize: '11px', background: 'rgba(136,33,54,0.35)', border: '1px solid rgba(173,95,108,0.3)', color: '#fca5a5' }}>
                                    {emp.employeeCode}
                                </span>
                            )}
                            {tenure && (
                                <span className="px-2 py-0.5 rounded-full font-medium"
                                    style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                                    {tenure}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info rows */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 4 }}>
                    {emp?.startDate && (
                        <InfoRow label="วันเข้างาน" value={fmtDate(emp.startDate)} />
                    )}
                    {emp?.employmentType && (
                        <InfoRow label="ประเภทพนักงาน"
                            value={EMPLOYMENT_LABELS[emp.employmentType] ?? emp.employmentType} />
                    )}
                    {managerName && (
                        <InfoRow label="ผู้บังคับบัญชา" value={managerName} />
                    )}
                </div>
            </div>

            {/* ── Section 2: ข้อมูลติดต่อ ─────────────────────────────────── */}
            <div style={glass} className="p-5">
                <h2 className="text-white font-semibold mb-3" style={{ fontSize: '14px' }}>ข้อมูลติดต่อ</h2>
                {emp?.email && <InfoRow label="อีเมล"    value={emp.email} />}
                {emp?.phone && <InfoRow label="เบอร์โทร" value={emp.phone} />}
                {!emp?.email && !emp?.phone && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>ไม่มีข้อมูล</p>
                )}
            </div>

            {/* ── Section 3: สถิติวันลา ────────────────────────────────────── */}
            <div style={glass} className="p-5">
                <h2 className="text-white font-semibold mb-4" style={{ fontSize: '14px' }}>
                    สถิติวันลาปี {new Date().getFullYear()}
                </h2>
                {leaveBalances.length > 0 ? (
                    <div className="space-y-4">
                        {leaveBalances.map(b => (
                            <LeaveBar
                                key={b.leaveType}
                                label={LEAVE_LABELS[b.leaveType] ?? b.leaveType}
                                used={b.usedDays}
                                entitled={b.entitledDays}
                                color={LEAVE_COLORS[b.leaveType] ?? '#94a3b8'}
                            />
                        ))}
                    </div>
                ) : (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>ไม่มีข้อมูลวันลา</p>
                )}
            </div>

            {/* ── Section 4: สถิติการเข้างาน ──────────────────────────────── */}
            <div style={glass} className="p-5">
                <h2 className="text-white font-semibold mb-4" style={{ fontSize: '14px' }}>สถิติการเข้างาน</h2>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    {[
                        { label: 'มาตรงเวลา', value: 0, color: '#34D399' },
                        { label: 'มาสาย',     value: 0, color: '#F87171' },
                        { label: 'ขาด',       value: 0, color: 'rgba(255,255,255,0.35)' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-2xl py-3 px-2"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p className="font-black leading-none" style={{ fontSize: '28px', color }}>
                                {value}
                            </p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="text-center" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    ข้อมูลจากระบบลงเวลา (เร็วๆ นี้)
                </p>
            </div>

            {/* ── Section 5: ประวัติใบลาล่าสุด ────────────────────────────── */}
            <div style={glass} className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold" style={{ fontSize: '14px' }}>ประวัติใบลาล่าสุด</h2>
                    <Link href="/portal/leave"
                        className="font-medium transition-colors hover:text-white"
                        style={{ fontSize: '12px', color: 'rgba(173,95,108,0.9)' }}>
                        ดูทั้งหมด →
                    </Link>
                </div>

                {recentLeaves.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>ยังไม่มีประวัติใบลา</p>
                ) : (
                    <div className="space-y-2">
                        {recentLeaves.map(req => {
                            const st = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending
                            return (
                                <div key={req.id}
                                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    {/* Left: date + type */}
                                    <div className="min-w-0">
                                        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                                            {LEAVE_LABELS[req.leaveType] ?? req.leaveType}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                                            {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                                        </p>
                                    </div>
                                    {/* Right: days + status */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                            {req.totalDays} วัน
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full font-semibold"
                                            style={{ fontSize: '11px', background: st.bg, color: st.text }}>
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
