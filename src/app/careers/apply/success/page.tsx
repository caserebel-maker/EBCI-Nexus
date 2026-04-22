import Link from 'next/link'
import { CheckCircle2, Hash, Mail, Clock, Home } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchParams {
    ref?: string
}

export default async function ApplySuccessPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const sp = await searchParams
    const ref = sp.ref?.trim().toUpperCase() ?? null

    return (
        <div className="max-w-xl mx-auto py-10 sm:py-16 text-center">
            <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-emerald-200 mb-6">
                <CheckCircle2 size={40} strokeWidth={2} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                ขอบคุณสำหรับการสมัครงาน
            </h1>
            <p className="text-white/75 text-base max-w-md mx-auto mb-7">
                ใบสมัครของคุณถูกบันทึกในระบบเรียบร้อย
                ทีม HR จะพิจารณาและติดต่อกลับภายใน 7 วันทำการ
            </p>

            {ref && (
                <div
                    className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl mb-7 border border-amber-300/40"
                    style={{ background: 'linear-gradient(145deg,rgba(86,30,35,0.6) 0%,rgba(60,15,20,0.85) 100%)' }}
                >
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold inline-flex items-center gap-1.5">
                        <Hash size={10} /> รหัสใบสมัครของคุณ
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-200 tracking-wider tabular-nums">
                        {ref}
                    </p>
                </div>
            )}

            <ul className="text-left max-w-md mx-auto space-y-3 mb-8 text-sm text-white/75">
                <li className="inline-flex items-start gap-2">
                    <Mail size={14} className="mt-1 shrink-0 text-amber-200" />
                    ระบบได้ส่งอีเมลยืนยันไปยังที่อยู่ที่คุณระบุ โปรดเก็บรหัสใบสมัครไว้สำหรับอ้างอิง
                </li>
                <li className="inline-flex items-start gap-2">
                    <Clock size={14} className="mt-1 shrink-0 text-amber-200" />
                    หากผ่านรอบพิจารณา HR จะติดต่อเพื่อนัดวัน-เวลาสัมภาษณ์
                </li>
            </ul>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                    href="/careers"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 transition-all"
                >
                    <Home size={15} />
                    กลับหน้า Careers
                </Link>
            </div>
        </div>
    )
}
