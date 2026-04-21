import Link from 'next/link'
import { ArrowLeft, Construction } from 'lucide-react'

/**
 * Placeholder for Session B.
 *
 * The old react-hook-form page is parked in page.old.tsx. Session A
 * landed the backend (APIs + admin list + landing). Session B rewrites
 * this page as a 5-step form wired to:
 *   - POST /api/careers/apply/start
 *   - POST /api/careers/apply/resume
 *   - PATCH /api/careers/apply/[id]/autosave
 *   - POST /api/careers/apply/[id]/upload
 *   - POST /api/careers/apply/[id]/submit
 */
export const dynamic = 'force-dynamic'

export default function ApplyPlaceholderPage() {
    return (
        <div className="max-w-xl mx-auto text-center py-16">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-5">
                <Construction size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ฟอร์มสมัครงาน — กำลังพัฒนา</h1>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
                เรากำลังอัปเกรดระบบรับสมัครงานให้ใช้งานง่ายขึ้น และรองรับการบันทึกอัตโนมัติ
                ฟอร์มจะกลับมาให้บริการในเร็ว ๆ นี้
            </p>
            <Link
                href="/careers"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-lg text-sm font-semibold transition-all"
            >
                <ArrowLeft size={15} />
                กลับหน้า Careers
            </Link>
        </div>
    )
}
