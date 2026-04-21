import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Construction, Mail, Phone, User, Briefcase, Calendar } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Lightweight applicant detail view for Session A.
 *
 * Session B replaces this with the full 5-step presentation (all
 * fields + file downloads + status dropdown + 12-factor interview
 * evaluation + review notes). For now, enough metadata is rendered to
 * verify the end-to-end flow: admin can see a submission and confirm
 * the data landed correctly.
 */
export default async function ApplicantDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const store = await cookies()
    const sessionCookie = store.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')
    try {
        const s = JSON.parse(sessionCookie.value)
        if (s.role !== 'hr_admin') redirect('/hradmin/dashboard')
    } catch { redirect('/login') }

    const { data: a } = await supabaseAdmin
        .from('job_applications')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (!a) notFound()

    const name = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
        + (a.nickname ? ` (${a.nickname})` : '')

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link
                href="/hradmin/applicants"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm"
            >
                <ArrowLeft size={14} />
                กลับไปหน้ารายการผู้สมัคร
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shrink-0">
                        {a.photo_url ? (
                            <img src={a.photo_url as string} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/60 text-2xl font-bold">
                                {(a.first_name_th?.[0] ?? a.nickname?.[0] ?? 'U').toString().toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-amber-200 font-mono text-sm tracking-wider mb-1">{a.reference_code}</p>
                        <h1 className="text-2xl font-bold text-white mb-1.5 break-words">{name || 'ไม่ระบุชื่อ'}</h1>
                        <p className="text-white/70 inline-flex items-center gap-1.5 text-sm">
                            <Briefcase size={13} />
                            {(a.position_applied as string) ?? 'ไม่ระบุตำแหน่ง'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm">
                            {a.email && (
                                <span className="inline-flex items-center gap-1.5 text-white/70">
                                    <Mail size={13} />
                                    {a.email as string}
                                </span>
                            )}
                            {a.phone_mobile && (
                                <span className="inline-flex items-center gap-1.5 text-white/70">
                                    <Phone size={13} />
                                    {a.phone_mobile as string}
                                </span>
                            )}
                            {a.submitted_at && (
                                <span className="inline-flex items-center gap-1.5 text-white/50">
                                    <Calendar size={13} />
                                    ส่งเมื่อ {new Date(a.submitted_at as string).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session-B stub */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
                <div className="h-12 w-12 mx-auto rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-200 mb-4">
                    <Construction size={22} />
                </div>
                <h2 className="text-lg font-bold text-white mb-1.5">รายละเอียดเต็ม — Session B</h2>
                <p className="text-white/65 text-sm leading-relaxed max-w-md mx-auto">
                    หน้ารายละเอียดเต็ม (แสดงข้อมูล 5 ขั้นตอน · ดาวน์โหลดเอกสาร · เปลี่ยนสถานะ ·
                    ประเมินสัมภาษณ์ 12 ปัจจัย · บันทึกการรีวิว) จะเพิ่มในรอบถัดไป
                </p>
                <p className="text-white/40 text-xs mt-4">
                    สามารถเช็คข้อมูลดิบผ่าน Supabase ได้ชั่วคราว
                </p>
            </div>

            {/* Raw JSON dump for verification */}
            <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <summary className="cursor-pointer text-white/70 text-sm font-semibold inline-flex items-center gap-2">
                    <User size={13} />
                    ดูข้อมูลดิบทั้งหมด (debug)
                </summary>
                <pre className="mt-3 text-[11px] text-white/55 whitespace-pre-wrap break-all leading-relaxed overflow-x-auto max-h-[500px]">
                    {JSON.stringify(a, null, 2)}
                </pre>
            </details>
        </div>
    )
}
