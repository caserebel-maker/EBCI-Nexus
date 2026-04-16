import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Fingerprint, Calendar } from 'lucide-react'

// ─── Glass Style ──────────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ used, entitled }: { used: number; entitled: number }) {
    const r = 52
    const cx = 70
    const cy = 70
    const sw = 13
    const circ = 2 * Math.PI * r           // ≈ 326.73
    const pct = entitled > 0 ? Math.min(used / entitled, 1) : 0
    const usedDash = pct * circ

    return (
        <svg viewBox="0 0 140 140" width="140" height="140" className="shrink-0">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
            {/* Remaining (lighter) */}
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(173,95,108,0.30)" strokeWidth={sw}
                strokeDasharray={`${circ} ${circ}`}
                transform={`rotate(-90, ${cx}, ${cy})`} />
            {/* Used (solid maroon) */}
            {usedDash > 0 && (
                <circle cx={cx} cy={cy} r={r} fill="none"
                    stroke="#882136" strokeWidth={sw} strokeLinecap="round"
                    strokeDasharray={`${usedDash} ${circ}`}
                    transform={`rotate(-90, ${cx}, ${cy})`} />
            )}
            {/* Center: remaining */}
            <text x={cx} y={cy - 5} textAnchor="middle"
                fill="white" fontSize="24" fontWeight="800"
                fontFamily="Prompt, sans-serif">
                {entitled - used}
            </text>
            <text x={cx} y={cy + 13} textAnchor="middle"
                fill="rgba(255,255,255,0.45)" fontSize="9"
                fontFamily="Prompt, sans-serif">
                วันคงเหลือ
            </text>
        </svg>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default async function EmployeePortal() {
    const session = await getSession()

    // Fetch employee record + applicant (for nickname)
    let employee: {
        firstNameTH: string
        lastNameTH: string
        position: string
        department: string
        applicant: { nickname: string | null } | null
    } | null = null

    let usedDays = 0
    let entitledDays = 6  // default annual leave

    if (session?.id) {
        const emp = await prisma.employee.findFirst({
            where: { userId: session.id },
            include: { applicant: { select: { nickname: true } } },
        })

        if (emp) {
            employee = emp

            const year = new Date().getFullYear()
            const annual = await prisma.leaveBalance.findFirst({
                where: { employeeId: emp.id, year, leaveType: 'annual' },
            })
            usedDays = Number(annual?.usedDays ?? 0)
            entitledDays = Number(annual?.entitledDays ?? 6)
        }
    }

    const firstName = employee?.firstNameTH ?? session?.name ?? 'พนักงาน'
    const lastName = employee?.lastNameTH ?? ''
    const nickname = employee?.applicant?.nickname ?? null
    const displayName = nickname
        ? `${firstName} (${nickname})`
        : `${firstName} ${lastName}`.trim()
    const position = employee?.position ?? '-'
    const department = employee?.department ?? '-'

    // Initials for avatar
    const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()
    const remainingDays = entitledDays - usedDays

    return (
        <div className="max-w-2xl mx-auto space-y-5 pb-20" style={{ fontSize: '1.05em' }}>

            {/* ── 1. Welcome Section ──────────────────────────────────────── */}
            <div style={glass} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-[#882136]/60 border-2 border-[#ad5f6c]/40
                                flex items-center justify-center shrink-0
                                text-white font-black text-xl tracking-tight select-none">
                    {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-[1.2rem] font-black text-white truncate">{displayName}</h1>
                    <p className="text-[0.82rem] text-white/50 mt-0.5">
                        {position} <span className="text-white/25 mx-1">•</span> {department}
                    </p>
                </div>

                {/* Greeting */}
                <div style={{
                    background: 'rgba(136,33,54,0.25)',
                    border: '1px solid rgba(173,95,108,0.25)',
                    borderRadius: '12px',
                }} className="px-4 py-2.5 text-right shrink-0">
                    <p className="text-[0.75rem] text-white/40">สวัสดี</p>
                    <p className="text-[0.88rem] text-white font-semibold leading-snug">
                        วันนี้เป็นอย่างไรบ้าง? 👋
                    </p>
                </div>
            </div>

            {/* ── 2. Leave Balance Card ────────────────────────────────────── */}
            <div style={glass} className="p-5">
                <p className="text-[0.75rem] font-bold text-white/40 uppercase tracking-wider mb-4">
                    วันลาพักร้อน — ปี {new Date().getFullYear()}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Left: Donut */}
                    <div className="flex flex-col items-center gap-3">
                        <DonutChart used={usedDays} entitled={entitledDays} />

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-[0.78rem]">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#882136] inline-block" />
                                <span className="text-white/55">ใช้ไป {usedDays} วัน</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full inline-block"
                                    style={{ background: 'rgba(173,95,108,0.45)' }} />
                                <span className="text-white/55">คงเหลือ {remainingDays} วัน</span>
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px self-stretch bg-white/10" />
                    <div className="block sm:hidden h-px w-full bg-white/10" />

                    {/* Right: Big Number */}
                    <div className="flex-1 flex flex-col items-center sm:items-start gap-1">
                        <p className="text-[0.75rem] font-bold text-white/40 uppercase tracking-wider">
                            วันคงเหลือ
                        </p>
                        <p className="text-[4rem] font-black text-white leading-none">
                            {remainingDays}
                        </p>
                        <p className="text-[0.85rem] text-white/50">
                            จาก {entitledDays} วัน / ใช้ไป {usedDays} วัน
                        </p>

                        {/* Progress bar */}
                        <div className="mt-3 w-full max-w-[200px] h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#882136] transition-all"
                                style={{ width: `${entitledDays > 0 ? (usedDays / entitledDays) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="text-[0.72rem] text-white/30 mt-1">
                            {entitledDays > 0 ? Math.round((usedDays / entitledDays) * 100) : 0}% ของสิทธิ์ทั้งหมด
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 3. Info Grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Personal Info */}
                <div style={glass} className="p-5">
                    <h3 className="text-[0.78rem] font-bold text-white/40 uppercase tracking-wider mb-4">
                        ข้อมูลส่วนตัว
                    </h3>
                    <div className="space-y-2.5 text-[0.88rem]">
                        <div className="flex justify-between py-1.5 border-b border-white/8">
                            <span className="text-white/45">ชื่อ-สกุล</span>
                            <span className="font-medium text-white text-right">
                                {firstName} {lastName}
                            </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/8">
                            <span className="text-white/45">ตำแหน่ง</span>
                            <span className="font-medium text-white">{position}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                            <span className="text-white/45">แผนก</span>
                            <span className="font-medium text-white">{department}</span>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div style={glass} className="p-5">
                    <h3 className="text-[0.78rem] font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Fingerprint size={14} /> ความปลอดภัย
                    </h3>

                    <div className="rounded-xl px-4 py-3 flex items-start gap-3"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(16,185,129,0.12)' }}>
                            <Fingerprint size={14} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[0.82rem] font-semibold text-emerald-300">ลงทะเบียนลายนิ้วมือแล้ว</p>
                            <p className="text-[0.75rem] text-emerald-400/60 mt-0.5">ข้อมูลชีวมิติเชื่อมต่อสำเร็จ</p>
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center gap-2.5">
                            <Calendar size={14} className="text-white/35" />
                            <span className="text-[0.82rem] text-white/45">เข้าสู่ระบบล่าสุด</span>
                        </div>
                        <span className="text-[0.82rem] font-medium text-white/70">วันนี้</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
