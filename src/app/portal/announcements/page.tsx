import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, AlertTriangle, AlertCircle, Info, Calendar, ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PRIORITY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    emergency: { label: 'ฉุกเฉิน', icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/40' },
    urgent:    { label: 'ด่วน',    icon: AlertCircle,   color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/40' },
    promote:   { label: 'กิจกรรม', icon: Megaphone,     color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-500/40' },
    internal:  { label: 'ทั่วไป',  icon: Info,          color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/40' },
}

function formatThaiDate(iso: string) {
    const d = new Date(iso)
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

export default async function AnnouncementsListPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    const { data: announcements } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path')
        .eq('publish_status', 'published')
        .order('publish_date', { ascending: false })
        .limit(50)

    const now = new Date()
    const list = announcements ?? []

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/portal/dashboard"
                    className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white border border-white/15 transition-all"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <Megaphone size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">ประกาศข่าวสาร</h1>
                    <p className="text-sm text-white/50">ดูประกาศและข่าวสารจากบริษัท</p>
                </div>
            </div>

            {/* Empty state */}
            {list.length === 0 && (
                <div className="text-center py-16 text-white/40">
                    <Megaphone size={48} className="mx-auto mb-4 opacity-30" />
                    <p>ยังไม่มีประกาศในระบบ</p>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {list.map((a) => {
                    const config = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
                    const Icon = config.icon
                    const isExpired = a.expires_at && new Date(a.expires_at) < now

                    return (
                        <div
                            key={a.id}
                            className={`rounded-2xl border p-5 transition-all ${config.bg} ${config.border} ${isExpired ? 'opacity-60' : ''}`}
                            style={{ backdropFilter: 'blur(8px)' }}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                                    <Icon size={18} className={config.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${config.color} ${config.bg}`}>
                                            {config.label}
                                        </span>
                                        {isExpired && (
                                            <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider text-white/40 bg-white/5">
                                                หมดอายุแล้ว
                                            </span>
                                        )}
                                        <span className="text-[11px] text-white/50 flex items-center gap-1">
                                            <Calendar size={11} />
                                            {formatThaiDate(a.publish_date)}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-tight mb-2">
                                        {a.headline}
                                    </h3>
                                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                        {a.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
